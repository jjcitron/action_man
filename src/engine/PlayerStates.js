import { State } from './StateMachine.js';
import { Physics } from './Physics.js';

export class PlayerState extends State {
    constructor(player) {
        super(player);
        this.player = player;
    }
}

export class IdleState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('idle');
    }

    update(input) {
        if (input.keys['ArrowLeft'] || input.keys['ArrowRight'] ||
            input.keys['ArrowUp'] || input.keys['ArrowDown'] ||
            input.keys['a'] || input.keys['d'] || input.keys['w'] || input.keys['s']) {
            this.player.stateMachine.setState('walk');
            return;
        }

        if (input.keys[' '] || input.keys['z']) {
            this.player.stateMachine.setState('attack');
        }
    }
}

export class WalkState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('walk');
    }

    update(input) {
        let dx = 0;
        let dy = 0;

        if (input.keys['ArrowLeft'] || input.keys['a']) dx -= 1;
        if (input.keys['ArrowRight'] || input.keys['d']) dx += 1;
        if (input.keys['ArrowUp'] || input.keys['w']) dy -= 1;
        if (input.keys['ArrowDown'] || input.keys['s']) dy += 1;

        if (dx === 0 && dy === 0) {
            this.player.stateMachine.setState('idle');
            return;
        }

        if (input.keys[' '] || input.keys['z']) {
            this.player.stateMachine.setState('attack');
            return;
        }

        if (dx > 0) this.player.facingRight = true;
        if (dx < 0) this.player.facingRight = false;

        if (dx !== 0 && dy !== 0) {
            const norm = Math.SQRT1_2;
            dx *= norm;
            dy *= norm;
        }

        const speed = this.player.speed * this.player.scale;
        const nextX = this.player.x + dx * speed;
        const nextY = this.player.y + dy * speed;

        const poly = this.player.scene.walkablePolygon;
        if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: nextY }, poly)) {
            this.player.x = nextX;
            this.player.y = nextY;
        } else {
            // Try sliding along X or Y axis
            if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: this.player.y }, poly)) {
                this.player.x = nextX;
            } else if (poly.length === 0 || Physics.isPointInPolygon({ x: this.player.x, y: nextY }, poly)) {
                this.player.y = nextY;
            }
        }

        this.player.scale = Physics.getScaleAt(this.player.y, this.player.scene.depthLines);
    }
}

export class AttackState extends PlayerState {
    enter() {
        this.timer = 0;
        this.duration = 400;
        this.hitboxActive = false;
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('attack');
    }

    update(input, dt) {
        this.timer += dt || 16;

        // Activate hitbox during hit frames (middle of animation)
        if (this.player.animator && this.player.animator.isHitFrame()) {
            this.player.hitboxActive = true;
        } else {
            // Also activate by timer for when hitFrames aren't defined
            const progress = this.timer / this.duration;
            this.player.hitboxActive = progress > 0.3 && progress < 0.7;
        }

        if (this.player.animator && this.player.animator.finished) {
            this.player.hitboxActive = false;
            this.player.stateMachine.setState('idle');
        } else if (this.timer >= this.duration) {
            this.player.hitboxActive = false;
            this.player.stateMachine.setState('idle');
        }
    }

    exit() {
        this.player.hitboxActive = false;
    }
}

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

export class DeathState extends PlayerState {
    enter() {
        this.player.hitboxActive = false;
        if (this.player.animator) this.player.animator.play('death');
    }

    update() {
        // Stay dead
    }
}
