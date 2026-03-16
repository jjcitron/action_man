import { Physics } from './Physics.js';
import { StateMachine } from './StateMachine.js';
import { IdleState, WalkState, AttackState, HitState, DeathState } from './PlayerStates.js';
import { Animator } from './Animator.js';
import { Combat } from './Combat.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.x = 400;
        this.y = 1050;
        this.speed = 6;
        this.scale = 1;
        this.facingRight = true;

        // Health
        this.hp = 100;
        this.maxHp = 100;

        // Animation
        this.animator = null;
        this.spriteSheet = null;
        this.characterData = null;

        // Combat
        this.hitboxDef = { x: 20, y: -100, w: 80, h: 60 };
        this.hurtboxDef = { x: -25, y: -120, w: 50, h: 120 };
        this.hitboxActive = false;
        this.attackDamage = 1;

        // Invincibility after being hit
        this.invincibleTimer = 0;

        // State Machine
        this.stateMachine = new StateMachine();
        this.stateMachine.addState('idle', new IdleState(this));
        this.stateMachine.addState('walk', new WalkState(this));
        this.stateMachine.addState('attack', new AttackState(this));
        this.stateMachine.addState('hit', new HitState(this));
        this.stateMachine.addState('death', new DeathState(this));
        this.stateMachine.setState('idle');
    }

    loadCharacterData(data, image) {
        this.characterData = data;
        this.spriteSheet = image;
        this.animator = new Animator(data);
        this.animator.play('idle');

        if (data.stats) {
            this.maxHp = data.stats.maxHp || 100;
            this.hp = this.maxHp;
            this.speed = data.stats.speed || 6;
            this.attackDamage = data.stats.attackDamage || 1;
        }
        if (data.hitboxDef) this.hitboxDef = data.hitboxDef;
        if (data.hurtboxDef) this.hurtboxDef = data.hurtboxDef;
    }

    update(input, dt) {
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        this.stateMachine.update(input, dt);
        if (this.animator) this.animator.update(dt);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const s = this.scale;
        ctx.scale(this.facingRight ? s : -s, s);

        // Flash when invincible
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.spriteSheet && this.animator) {
            this.drawSprite(ctx);
        } else {
            this.drawPlaceholder(ctx);
        }

        ctx.restore();
    }

    drawSprite(ctx) {
        const frame = this.animator.getCurrentFrame();
        if (!frame) return;

        // Draw centered on X, bottom on Y (feet at origin)
        ctx.drawImage(
            this.spriteSheet,
            frame.x, frame.y, frame.w, frame.h,
            -frame.w / 2, -frame.h, frame.w, frame.h
        );
    }

    drawPlaceholder(ctx) {
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(-25, -120, 50, 120);
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(-15, -110, 30, 25);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(15, -80, 50, 6);
    }

    getHitbox() {
        if (!this.hitboxActive) return null;
        return Combat.getHitbox(this, this.hitboxDef);
    }

    getHurtbox() {
        return Combat.getHitbox(this, this.hurtboxDef);
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0) return;
        if (this.hp <= 0) return;

        this.hp -= amount;
        this.invincibleTimer = 1000; // 1 second of invincibility

        if (this.hp <= 0) {
            this.hp = 0;
            this.stateMachine.setState('death');
        } else {
            this.stateMachine.setState('hit');
        }
    }

    get currentStateName() {
        for (const [name, state] of Object.entries(this.stateMachine.states)) {
            if (this.stateMachine.currentState === state) return name;
        }
        return 'idle';
    }
}
