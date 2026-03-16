/**
 * Shared animation playback system.
 * Loads from character JSON data (frames + animations).
 */
export class Animator {
    constructor(characterData) {
        this.frames = characterData.frames || [];
        this.animations = characterData.animations || {};
        this.currentAnim = null;
        this.currentAnimName = '';
        this.frameIndex = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    play(animName) {
        if (this.currentAnimName === animName) return;
        const anim = this.animations[animName];
        if (!anim) return;
        this.currentAnim = anim;
        this.currentAnimName = animName;
        this.frameIndex = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    update(dt) {
        if (!this.currentAnim || this.finished) return;

        this.elapsed += dt;
        const speed = this.currentAnim.speed || 100;

        if (this.elapsed >= speed) {
            this.elapsed -= speed;
            this.frameIndex++;

            if (this.frameIndex >= this.currentAnim.frames.length) {
                if (this.currentAnim.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = this.currentAnim.frames.length - 1;
                    this.finished = true;
                }
            }
        }
    }

    /** Returns the current frame rectangle {x, y, w, h} from the sprite sheet */
    getCurrentFrame() {
        if (!this.currentAnim || this.currentAnim.frames.length === 0) return null;
        const frameId = this.currentAnim.frames[this.frameIndex];
        return this.frames[frameId] || null;
    }

    /** Check if the current frame is a "hit" frame (for attack hitbox activation) */
    isHitFrame() {
        if (!this.currentAnim || !this.currentAnim.hitFrames) return false;
        return this.currentAnim.hitFrames.includes(this.frameIndex);
    }
}
