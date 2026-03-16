/**
 * Heads-up display: player health bar, enemy health bars, inventory.
 * Rendered in screen space (not affected by camera).
 */
export class HUD {
    constructor() {
        this.visible = true;
    }

    render(ctx, player, enemies, inventory) {
        if (!this.visible) return;

        // Player health bar (top-left)
        this.drawPlayerHealth(ctx, player);

        // Inventory (below health)
        if (inventory) {
            inventory.render(ctx);
        }
    }

    drawPlayerHealth(ctx, player) {
        if (!player) return;

        const x = 20;
        const y = 20;
        const w = 200;
        const h = 16;
        const hpRatio = player.hp / player.maxHp;

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('HP', x, y - 4);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, w, h);

        // Health fill
        const color = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, (w - 2) * hpRatio, h - 2);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    /**
     * Draw health bar above an enemy (called in world space, with camera transform active)
     */
    drawEnemyHealth(ctx, enemy) {
        if (enemy.state === 'dead' || enemy.hp >= enemy.maxHp) return;

        const barW = 40;
        const barH = 4;
        const x = enemy.x - barW / 2;
        const y = enemy.y - 90 * enemy.scale;
        const hpRatio = enemy.hp / enemy.maxHp;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, barW, barH);

        ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : '#f00';
        ctx.fillRect(x + 0.5, y + 0.5, (barW - 1) * hpRatio, barH - 1);
    }
}
