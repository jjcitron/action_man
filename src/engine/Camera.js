/**
 * Camera system with smooth follow, viewport management, and level bounds clamping.
 * Works in world space (background native pixel coordinates).
 */
export class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // View scale: maps world space to screen space
        // Set when level loads based on background dimensions
        this.viewScale = 1;

        // Level bounds (world space)
        this.levelWidth = 0;
        this.levelHeight = 0;

        // Follow smoothing (0 = instant, 1 = no movement)
        this.lerpFactor = 0.08;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
    }

    /** Configure camera for a level's background dimensions */
    setLevelBounds(bgWidth, bgHeight) {
        this.levelWidth = bgWidth;
        this.levelHeight = bgHeight;
        // Scale so background height fills canvas
        this.viewScale = this.canvasHeight / bgHeight;
    }

    /** Viewport dimensions in world space */
    get viewportWidth() {
        return this.canvasWidth / this.viewScale;
    }

    get viewportHeight() {
        return this.canvasHeight / this.viewScale;
    }

    /** Smoothly follow a target position (world space) */
    follow(targetX, targetY) {
        // Center target in viewport
        const desiredX = targetX - this.viewportWidth / 2;
        const desiredY = targetY - this.viewportHeight / 2;

        // Lerp
        this.x += (desiredX - this.x) * this.lerpFactor;
        this.y += (desiredY - this.y) * this.lerpFactor;

        // Clamp to level bounds
        this.x = Math.max(0, Math.min(this.levelWidth - this.viewportWidth, this.x));
        this.y = Math.max(0, Math.min(this.levelHeight - this.viewportHeight, this.y));
    }

    /** Snap camera to position (no lerp) */
    snapTo(targetX, targetY) {
        this.x = targetX - this.viewportWidth / 2;
        this.y = targetY - this.viewportHeight / 2;
        this.x = Math.max(0, Math.min(this.levelWidth - this.viewportWidth, this.x));
        this.y = Math.max(0, Math.min(this.levelHeight - this.viewportHeight, this.y));
    }

    /** Trigger screen shake */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    /** Update shake (call each frame with dt) */
    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const decay = this.shakeTimer > 0 ? this.shakeTimer / 200 : 0;
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    /** Apply camera transform to canvas context (call before drawing world objects) */
    applyTransform(ctx) {
        // Apply shake offset in screen space (before world scale)
        ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
        ctx.scale(this.viewScale, this.viewScale);
        ctx.translate(-this.x, -this.y);
    }
}
