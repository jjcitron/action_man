/**
 * Palette swap / tinting system for enemy color variants.
 * Applies hue rotation via canvas filter or manual pixel manipulation.
 */
export class PaletteSwap {
    /**
     * Create a tinted copy of a sprite sheet image.
     * @param {HTMLImageElement} sourceImage - Original sprite sheet
     * @param {Object} tint - Tint config: { hue: degrees, saturation?: multiplier, brightness?: multiplier }
     * @returns {HTMLCanvasElement} - New canvas with tinted sprite sheet
     */
    static createTinted(sourceImage, tint) {
        if (!tint || (!tint.hue && !tint.saturation && !tint.brightness)) {
            return sourceImage;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        const ctx = canvas.getContext('2d');

        // Build CSS filter string
        const filters = [];
        if (tint.hue) filters.push(`hue-rotate(${tint.hue}deg)`);
        if (tint.saturation) filters.push(`saturate(${tint.saturation})`);
        if (tint.brightness) filters.push(`brightness(${tint.brightness})`);

        ctx.filter = filters.join(' ');
        ctx.drawImage(sourceImage, 0, 0);
        ctx.filter = 'none';

        return canvas;
    }
}
