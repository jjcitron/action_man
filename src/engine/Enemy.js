import { Physics } from './Physics.js';
import { Combat } from './Combat.js';
import { Animator } from './Animator.js';

export class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.speed = 3;
        this.scale = 1;
        this.facingRight = false;

        this.hp = 3;
        this.maxHp = 3;
        this.state = 'idle'; // idle, chase, attack, hit, dead

        this.hitTimer = 0;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.attackDuration = 500;
        this.attackDamage = 10;
        this.aggroRange = 400;
        this.attackRange = 60;

        // Animation
        this.animator = null;
        this.spriteSheet = null;
        this.characterData = null;

        // Combat boxes
        this.hurtboxDef = { x: -20, y: -100, w: 40, h: 100 };
        this.hitboxDef = { x: 15, y: -80, w: 50, h: 50 };
        this.hitboxActive = false;

        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;

        // Death fade
        this.deathTimer = 0;
    }

    loadCharacterData(data, image) {
        this.characterData = data;
        this.spriteSheet = image;
        this.animator = new Animator(data);
        this.animator.play('idle');

        if (data.stats) {
            this.maxHp = data.stats.maxHp || 3;
            this.hp = this.maxHp;
            this.speed = data.stats.speed || 3;
            this.aggroRange = data.stats.aggroRange || 400;
            this.attackRange = data.stats.attackRange || 60;
            this.attackDamage = data.stats.attackDamage || 10;
        }
        if (data.hurtboxDef) this.hurtboxDef = data.hurtboxDef;
        if (data.hitboxDef) this.hitboxDef = data.hitboxDef;
    }

    update(player, dt) {
        if (this.state === 'dead') {
            this.deathTimer += dt;
            if (this.animator) this.animator.update(dt);
            return;
        }

        this.scale = Physics.getScaleAt(this.y, this.scene.depthLines);

        // Apply knockback decay
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= 0.85;
            this.knockbackY *= 0.85;
            if (Math.abs(this.knockbackX) < 0.5) this.knockbackX = 0;
            if (Math.abs(this.knockbackY) < 0.5) this.knockbackY = 0;
        }

        if (this.state === 'hit') {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) {
                this.state = 'idle';
                if (this.animator) this.animator.play('idle');
            }
            if (this.animator) this.animator.update(dt);
            return;
        }

        if (this.state === 'attack') {
            this.attackTimer += dt;
            // Hitbox active during middle of attack
            const progress = this.attackTimer / this.attackDuration;
            this.hitboxActive = progress > 0.3 && progress < 0.7;

            if (this.attackTimer >= this.attackDuration) {
                this.hitboxActive = false;
                this.state = 'idle';
                this.attackCooldown = 800;
                if (this.animator) this.animator.play('idle');
            }
            if (this.animator) this.animator.update(dt);
            return;
        }

        this.attackCooldown -= dt;

        // AI: Chase Player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.attackRange && this.attackCooldown <= 0) {
            // Attack!
            this.state = 'attack';
            this.attackTimer = 0;
            this.hitboxActive = false;
            this.facingRight = dx > 0;
            if (this.animator) this.animator.play('attack');
        } else if (dist < this.aggroRange && dist > this.attackRange * 0.8) {
            // Chase
            this.state = 'chase';
            this.facingRight = dx > 0;

            const speed = this.speed * this.scale;
            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;

            const nextX = this.x + vx;
            const nextY = this.y + vy;

            const poly = this.scene.walkablePolygon;
            if (poly.length === 0 || Physics.isPointInPolygon({ x: nextX, y: nextY }, poly)) {
                this.x = nextX;
                this.y = nextY;
            }

            if (this.animator && this.animator.currentAnimName !== 'walk') {
                this.animator.play('walk');
            }
        } else {
            if (this.state !== 'idle') {
                this.state = 'idle';
                if (this.animator) this.animator.play('idle');
            }
        }

        if (this.animator) this.animator.update(dt);
    }

    takeDamage(amount, attackerX) {
        if (this.state === 'dead' || this.state === 'hit') return;

        this.hp -= amount;
        this.state = 'hit';
        this.hitTimer = 300;
        this.hitboxActive = false;

        // Knockback away from attacker
        const knockDir = this.x > attackerX ? 1 : -1;
        this.knockbackX = knockDir * 8;
        this.knockbackY = (Math.random() - 0.5) * 2;

        if (this.animator) this.animator.play('hit');

        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.hitboxActive = false;
            this.deathTimer = 0;
            if (this.animator) this.animator.play('death');
        }
    }

    getHurtbox() {
        return Combat.getHitbox(this, this.hurtboxDef);
    }

    getHitbox() {
        if (!this.hitboxActive) return null;
        return Combat.getHitbox(this, this.hitboxDef);
    }

    render(ctx) {
        if (this.state === 'dead' && this.deathTimer > 2000) return; // Fully faded

        ctx.save();
        ctx.translate(this.x, this.y);

        const s = this.scale;
        ctx.scale(this.facingRight ? s : -s, s);

        // Hit flash
        if (this.state === 'hit') {
            ctx.globalAlpha = 0.5;
        }

        // Death fade
        if (this.state === 'dead') {
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 2000);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 7, 0, 0, Math.PI * 2);
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

        ctx.drawImage(
            this.spriteSheet,
            frame.x, frame.y, frame.w, frame.h,
            -frame.w / 2, -frame.h, frame.w, frame.h
        );
    }

    drawPlaceholder(ctx) {
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-25, -120, 50, 120);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-15, -110, 30, 25);
    }
}
