export class Inventory {
    constructor() {
        this.items = [];
        this.capacity = 5;
        this.uiVisible = true;
    }

    addItem(item) {
        if (this.items.length < this.capacity) {
            this.items.push(item);
            console.log("Picked up:", item.name);
            return true;
        }
        return false;
    }

    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
        }
    }

    render(ctx) {
        if (!this.uiVisible) return;

        // Draw HUD at top left
        const startX = 20;
        const startY = 55;
        const slotSize = 40;
        const padding = 5;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        for (let i = 0; i < this.capacity; i++) {
            const x = startX + i * (slotSize + padding);

            // Slot Bg
            ctx.fillRect(x, startY, slotSize, slotSize);
            ctx.strokeRect(x, startY, slotSize, slotSize);

            // Item Icon
            if (this.items[i]) {
                ctx.fillStyle = 'yellow'; // Placeholder
                ctx.beginPath();
                ctx.arc(x + slotSize / 2, startY + slotSize / 2, 10, 0, Math.PI * 2);
                ctx.fill();

                // Tooltip text?
                // ctx.font = '10px Arial';
                // ctx.fillStyle = 'white';
                // ctx.fillText(this.items[i].name[0], x+5, startY+15);
            }
        }

        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText("INVENTORY", startX, startY - 5);
        ctx.restore();
    }
}
