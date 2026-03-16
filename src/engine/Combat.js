export class Combat {
    /*
     * Check intersection between two rectangles
     * r1, r2: {x, y, w, h} (World Space)
     */
    static checkCollision(r1, r2) {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }

    /*
     * Create a hitbox relative to an entity
     * entity: {x, y, facingRight}
     * definition: {x, y, w, h} (Relative to entity origin, assuming facing right)
     */
    static getHitbox(entity, definition) {
        // If facing left, flip X offset relative to center?
        // Let's assume origin is bottom-center for chars.

        let worldX = entity.x + definition.x;
        // If facing left/flipped, we mirror the x offset. 
        // Assuming undefined facing means right.
        if (entity.facingRight === false) {
            worldX = entity.x - definition.x - definition.w;
        }

        return {
            x: worldX,
            y: entity.y + definition.y,
            w: definition.w,
            h: definition.h
        };
    }
}
