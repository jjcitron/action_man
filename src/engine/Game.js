import { Scene } from './Scene.js';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { Camera } from './Camera.js';
import { Combat } from './Combat.js';
import { HUD } from './HUD.js';
import { Inventory } from './Inventory.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lastTime = 0;

        this.input = new Input();
        this.camera = new Camera(canvas.width, canvas.height);
        this.scene = new Scene(this);
        this.player = new Player(this.scene);
        this.inventory = new Inventory();
        this.hud = new HUD();

        this.state = 'loading'; // loading, playing, paused, gameover
    }

    async start(levelUrl) {
        // Show loading screen
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '24px monospace';
        this.ctx.fillText('Loading...', 50, 50);

        if (levelUrl) {
            await this.scene.loadLevel(levelUrl);
            this.state = 'playing';
        } else {
            this.state = 'playing';
        }

        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        const dt = Math.min(timestamp - this.lastTime, 50); // Cap at 50ms to prevent spiral
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (this.state !== 'playing') return;

        // Update player
        this.player.update(this.input, dt);

        // Update enemies
        for (const enemy of this.scene.enemies) {
            enemy.update(this.player, dt);
        }

        // Combat: player attacks hitting enemies
        this.checkPlayerAttacks();

        // Combat: enemy attacks hitting player
        this.checkEnemyAttacks();

        // Camera follow player
        this.camera.follow(this.player.x, this.player.y);

        // Clear one-shot key presses (for future use)
    }

    checkPlayerAttacks() {
        const playerHitbox = this.player.getHitbox();
        if (!playerHitbox) return;

        for (const enemy of this.scene.enemies) {
            if (enemy.state === 'dead') continue;

            const enemyHurtbox = enemy.getHurtbox();
            if (Combat.checkCollision(playerHitbox, enemyHurtbox)) {
                enemy.takeDamage(this.player.attackDamage, this.player.x);
            }
        }
    }

    checkEnemyAttacks() {
        const playerHurtbox = this.player.getHurtbox();
        if (!playerHurtbox) return;

        for (const enemy of this.scene.enemies) {
            const enemyHitbox = enemy.getHitbox();
            if (!enemyHitbox) continue;

            if (Combat.checkCollision(enemyHitbox, playerHurtbox)) {
                this.player.takeDamage(enemy.attackDamage);
            }
        }
    }

    render() {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'loading') return;

        // World rendering (with camera transform)
        ctx.save();
        this.camera.applyTransform(ctx);

        // Background
        this.scene.render(ctx);

        // Collect all entities and sort by Y (depth sorting)
        const entities = [];
        entities.push({ y: this.player.y, render: () => this.player.render(ctx), type: 'player' });

        for (const enemy of this.scene.enemies) {
            if (enemy.state !== 'dead' || enemy.deathTimer < 2000) {
                entities.push({ y: enemy.y, render: () => enemy.render(ctx), type: 'enemy', ref: enemy });
            }
        }

        // Sort by Y for depth ordering
        entities.sort((a, b) => a.y - b.y);

        // Render all entities
        for (const entity of entities) {
            entity.render();
        }

        // Enemy health bars (in world space)
        for (const enemy of this.scene.enemies) {
            this.hud.drawEnemyHealth(ctx, enemy);
        }

        ctx.restore();

        // HUD rendering (screen space, no camera transform)
        this.hud.render(ctx, this.player, this.scene.enemies, this.inventory);

        // Game over overlay
        if (this.player.hp <= 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '20px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
            ctx.textAlign = 'left';
        }
    }
}
