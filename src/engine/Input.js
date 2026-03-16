export class Input {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this._pressedThisFrame = {};

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.key]) {
                this._pressedThisFrame[e.key] = true;
            }
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    /** Call at end of each frame to reset one-shot press tracking */
    endFrame() {
        this.justPressed = this._pressedThisFrame;
        this._pressedThisFrame = {};
    }

    /** True only on the frame the key was first pressed */
    pressed(key) {
        return !!this.justPressed[key];
    }

    /** True while key is held */
    held(key) {
        return !!this.keys[key];
    }

    /** True if any movement direction is held */
    get hasDirection() {
        return this.held('ArrowLeft') || this.held('ArrowRight') ||
            this.held('ArrowUp') || this.held('ArrowDown') ||
            this.held('a') || this.held('d') || this.held('w') || this.held('s');
    }

    /** True if shift is held */
    get shift() {
        return this.held('Shift');
    }

    /** Get normalized movement vector {dx, dy} */
    getDirection() {
        let dx = 0;
        let dy = 0;
        if (this.held('ArrowLeft') || this.held('a')) dx -= 1;
        if (this.held('ArrowRight') || this.held('d')) dx += 1;
        if (this.held('ArrowUp') || this.held('w')) dy -= 1;
        if (this.held('ArrowDown') || this.held('s')) dy += 1;

        if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
        }
        return { dx, dy };
    }
}
