import { State } from './StateMachine.js';
import { Physics } from './Physics.js';

export class PlayerState extends State {
    constructor(player) {
        super(player);
        this.player = player;
    }

    /** Shared movement logic for Walk and Run states */
    movePlayer(input, speedMultiplier) {
        const { dx, dy } = input.getDirection();

        if (dx > 0) this.player.facingRight = true;
        if (dx < 0) this.player.facingRight = false;

        const speed = this.player.speed * this.player.scale * speedMultiplier;
        const nextX = this.player.x + dx * speed;
        const nextY = this.player.y + dy * speed;

        const poly = this.player.scene.walkablePolygon;
        if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: nextY }, poly)) {
            this.player.x = nextX;
            this.player.y = nextY;
        } else {
            if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: this.player.y }, poly)) {
                this.player.x = nextX;
            } else if (poly.length === 0 || Physics.isPointInPolygon({ x: this.player.x, y: nextY }, poly)) {
                this.player.y = nextY;
            }
        }

        this.player.scale = Physics.getScaleAt(this.player.y, this.player.scene.depthLines);
    }

    /** Check common attack inputs — returns true if transitioned */
    checkAttackInputs(input) {
        if (input.pressed(' ') || input.pressed('z')) {
            this.player.stateMachine.setState('attack');
            return true;
        }
        if (input.pressed('x')) {
            this.player.stateMachine.setState('heavyAttack');
            return true;
        }
        return false;
    }
}

// ─── IDLE ───────────────────────────────────────────────

export class IdleState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('idle');
    }

    update(input) {
        // Crouch: down key only, no horizontal movement
        const { dx, dy } = input.getDirection();
        if (dy > 0 && dx === 0) {
            this.player.stateMachine.setState('crouch');
            return;
        }

        if (input.hasDirection) {
            this.player.stateMachine.setState(input.shift ? 'run' : 'walk');
            return;
        }

        if (input.pressed('c')) {
            this.player.stateMachine.setState('dash');
            return;
        }

        this.checkAttackInputs(input);
    }
}

// ─── WALK ───────────────────────────────────────────────

export class WalkState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('walk');
    }

    update(input) {
        if (!input.hasDirection) {
            this.player.stateMachine.setState('idle');
            return;
        }

        // Switch to run if shift held
        if (input.shift) {
            this.player.stateMachine.setState('run');
            return;
        }

        if (input.pressed('c')) {
            this.player.stateMachine.setState('dash');
            return;
        }

        if (this.checkAttackInputs(input)) return;

        this.movePlayer(input, 1.0);
    }
}

// ─── RUN ────────────────────────────────────────────────

export class RunState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('run');
    }

    update(input) {
        if (!input.hasDirection) {
            this.player.stateMachine.setState('idle');
            return;
        }

        // Drop to walk if shift released
        if (!input.shift) {
            this.player.stateMachine.setState('walk');
            return;
        }

        if (input.pressed('c')) {
            this.player.stateMachine.setState('dash');
            return;
        }

        if (this.checkAttackInputs(input)) return;

        this.movePlayer(input, 1.8);
    }
}

// ─── DASH ───────────────────────────────────────────────

export class DashState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 250;
        this.player.hitboxActive = false;
        this.player.invincibleTimer = this.duration; // i-frames during dash
        if (this.player.animator) this.player.animator.play('dash');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Lunge forward
        const dir = this.player.facingRight ? 1 : -1;
        const dashSpeed = this.player.speed * this.player.scale * 3.5;
        const ease = 1 - (this.timer / this.duration); // decelerates
        const nextX = this.player.x + dir * dashSpeed * ease;

        const poly = this.player.scene.walkablePolygon;
        if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: this.player.y }, poly)) {
            this.player.x = nextX;
        }

        if (this.timer >= this.duration) {
            this.player.stateMachine.setState('idle');
        }
    }
}

// ─── CROUCH ─────────────────────────────────────────────

export class CrouchState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        // Shrink hurtbox while crouching
        this.originalHurtbox = { ...this.player.hurtboxDef };
        this.player.hurtboxDef = { x: -25, y: -50, w: 50, h: 50 };
        if (this.player.animator) this.player.animator.play('crouch');
    }

    update(input) {
        const { dx, dy } = input.getDirection();

        // Stand up when down is released or horizontal input added
        if (dy <= 0 || dx !== 0) {
            this.player.stateMachine.setState('idle');
            return;
        }

        // Can attack from crouch
        this.checkAttackInputs(input);
    }

    exit() {
        // Restore hurtbox
        if (this.originalHurtbox) {
            this.player.hurtboxDef = this.originalHurtbox;
        }
    }
}

// ─── ATTACK ─────────────────────────────────────────────

export class AttackState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 400;
        this.player.hitboxActive = false;
        this.comboQueued = false;
        if (this.player.animator) this.player.animator.play('attack');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Activate hitbox during hit frames
        if (this.player.animator && this.player.animator.isHitFrame()) {
            this.player.hitboxActive = true;
        } else {
            const progress = this.timer / this.duration;
            this.player.hitboxActive = progress > 0.3 && progress < 0.7;
        }

        // Queue combo if attack pressed during active window (last 40% of attack)
        if ((input.pressed(' ') || input.pressed('z')) && this.timer > this.duration * 0.5) {
            this.comboQueued = true;
        }

        if ((this.player.animator && this.player.animator.finished) || this.timer >= this.duration) {
            this.player.hitboxActive = false;
            if (this.comboQueued) {
                this.player.stateMachine.setState('comboAttack');
            } else {
                this.player.stateMachine.setState('idle');
            }
        }
    }

    exit() {
        this.player.hitboxActive = false;
    }
}

// ─── COMBO ATTACK ───────────────────────────────────────

export class ComboAttackState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 350;
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('attack_combo');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Wider hitbox for combo, active in middle
        if (this.player.animator && this.player.animator.isHitFrame()) {
            this.player.hitboxActive = true;
        } else {
            const progress = this.timer / this.duration;
            this.player.hitboxActive = progress > 0.25 && progress < 0.65;
        }

        // Small forward lunge during combo
        if (this.timer < this.duration * 0.4) {
            const dir = this.player.facingRight ? 1 : -1;
            this.player.x += dir * 2;
        }

        if ((this.player.animator && this.player.animator.finished) || this.timer >= this.duration) {
            this.player.hitboxActive = false;
            this.player.stateMachine.setState('idle');
        }
    }

    exit() {
        this.player.hitboxActive = false;
    }
}

// ─── HEAVY ATTACK ───────────────────────────────────────

export class HeavyAttackState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 600;
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('heavy_attack');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Heavy attack has a wider hitbox
        const progress = this.timer / this.duration;
        this.player.hitboxActive = progress > 0.35 && progress < 0.65;

        if ((this.player.animator && this.player.animator.finished) || this.timer >= this.duration) {
            this.player.hitboxActive = false;
            this.player.stateMachine.setState('idle');
        }
    }

    exit() {
        this.player.hitboxActive = false;
    }
}

// ─── HIT ────────────────────────────────────────────────

export class HitState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 400;
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('hit');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Knockback
        const knockDir = this.player.facingRight ? -1 : 1;
        const knockSpeed = 3 * (1 - this.timer / this.duration);
        this.player.x += knockDir * knockSpeed;

        if (this.timer >= this.duration) {
            this.player.stateMachine.setState('idle');
        }
    }
}

// ─── DEATH ──────────────────────────────────────────────

export class DeathState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('death');
    }

    update() {
        // Stay dead
    }
}
