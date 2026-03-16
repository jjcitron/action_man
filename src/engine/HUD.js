/**
 * Heads-up display: health bars, combo counter, controls.
 * Rendered in screen space (not affected by camera).
 */
export class HUD {
    constructor() {
        this.visible = true;

        // Combo tracking
        this.comboCount = 0;
        this.comboTimer = 0;       // ms remaining before combo resets
        this.comboWindow = 1500;   // ms to land next hit before combo drops
        this.comboDisplayTimer = 0; // keeps text visible briefly after combo ends
        this.lastComboCount = 0;

        // Combo text animation
        this.comboPulse = 0;       // scale pulse on new hit
        this.comboShake = 0;       // x offset shake
    }

    /** Call from Game.js when player lands a hit */
    registerHit() {
        this.comboCount++;
        this.comboTimer = this.comboWindow;
        this.comboPulse = 1.0;
        this.comboShake = (Math.random() - 0.5) * 12;
    }

    /** Call each frame with dt */
    update(dt) {
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                // Combo ended — keep display briefly
                this.lastComboCount = this.comboCount;
                this.comboDisplayTimer = this.comboCount >= 3 ? 800 : 0;
                this.comboCount = 0;
            }
        }

        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
        }

        // Decay pulse
        if (this.comboPulse > 0) {
            this.comboPulse *= 0.88;
            if (this.comboPulse < 0.02) this.comboPulse = 0;
        }
        // Decay shake
        this.comboShake *= 0.85;
    }

    render(ctx, player, enemies, inventory) {
        if (!this.visible) return;

        this.drawPlayerHealth(ctx, player);
        this.drawCombo(ctx);
        this.drawControls(ctx);
    }

    drawCombo(ctx) {
        // Show active combo
        let count = this.comboCount;
        let fading = false;

        // Or show the finished combo briefly
        if (count === 0 && this.comboDisplayTimer > 0) {
            count = this.lastComboCount;
            fading = true;
        }

        if (count < 2) return;

        ctx.save();

        const cx = ctx.canvas.width / 2;
        const cy = 80;

        // Fade out when combo display is ending
        if (fading) {
            ctx.globalAlpha = Math.min(1, this.comboDisplayTimer / 400);
        }

        // Pulse scale
        const baseScale = 1.0;
        const pulse = baseScale + this.comboPulse * 0.4;

        ctx.translate(cx + this.comboShake, cy);
        ctx.scale(pulse, pulse);

        // Combo number
        const size = Math.min(60, 28 + count * 4);
        ctx.font = `bold ${size}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Bright magenta fill, thick white stroke for contrast
        const fill = '#ff00ff';
        const stroke = '#ffffff';
        const strokeW = Math.max(3, size / 8);

        // Number — white outline then magenta fill
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = stroke;
        ctx.strokeText(`${count}`, 0, 0);
        ctx.fillStyle = fill;
        ctx.fillText(`${count}`, 0, 0);

        // Label below
        ctx.font = 'bold 16px monospace';
        let label;
        if (count >= 10) label = 'UNSTOPPABLE!';
        else if (count >= 7) label = 'INCREDIBLE!';
        else if (count >= 5) label = 'AWESOME!';
        else if (count >= 3) label = 'COMBO!';
        else label = 'HITS';

        ctx.lineWidth = 3;
        ctx.strokeStyle = stroke;
        ctx.strokeText(label, 0, size / 2 + 14);
        ctx.fillStyle = fill;
        ctx.fillText(label, 0, size / 2 + 14);

        ctx.restore();
    }

    drawControls(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px monospace';
        const x = ctx.canvas.width - 210;
        let y = ctx.canvas.height - 95;
        const lines = [
            'WASD/Arrows  Move',
            'Shift+Move   Run',
            'Space/Z      Attack',
            'Space again   Combo',
            'X            Heavy Attack',
            'C            Dash',
            'Down         Crouch',
        ];
        for (const line of lines) {
            ctx.fillText(line, x, y);
            y += 13;
        }
        ctx.restore();
    }

    drawPlayerHealth(ctx, player) {
        if (!player) return;

        const x = 20;
        const y = 20;
        const w = 200;
        const h = 16;
        const hpRatio = player.hp / player.maxHp;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('HP', x, y - 4);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, w, h);

        const color = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, (w - 2) * hpRatio, h - 2);

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
