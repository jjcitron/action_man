export class Physics {
    /* 
     * Point in Polygon Ray Casting algorithm
     * polygon: Array of {x, y}
     * point: {x, y}
     */
    static isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /*
     * Calculate scale factor based on Y position and depth lines
     * point: {x, y}
     * depthLines: Array of {y, scale} (should be 2 lines: min and max depth)
     */
    static getScaleAt(y, depthLines) {
        if (!depthLines || depthLines.length < 2) return 1.0;

        // Sort lines by Y just in case
        const sorted = [...depthLines].sort((a, b) => a.y - b.y);
        const top = sorted[0];
        const bottom = sorted[1];

        // Clamp Y
        const clampedY = Math.max(top.y, Math.min(bottom.y, y));

        // Linear interpolation
        const range = bottom.y - top.y;
        if (range === 0) return top.scale;

        const ratio = (clampedY - top.y) / range;
        return top.scale + ratio * (bottom.scale - top.scale);
    }
}
