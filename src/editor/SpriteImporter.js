export class SpriteImporter {
    constructor(editor) {
        this.editor = editor;
        this.spriteSheet = null;
        this.frames = []; // Array of {x, y, w, h}
        this.animations = {}; // { "idle": { loop: true, frames: [] } }
        this.currentAnimName = null;
        this.isSelectingFrame = false;
        this.selectionStart = { x: 0, y: 0 };
        this.currentSelection = null;

        this.initUI();
    }

    initUI() {
        // UI events are bound in the main html, we just attach logic here if elements exist
        const fileInput = document.getElementById('file-sprite');
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleImageUpload(e));

        const btnAddAnim = document.getElementById('btn-add-anim');
        if (btnAddAnim) btnAddAnim.onclick = () => this.createAnimation();
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.spriteSheet = img;
                console.log("Sprite Sheet loaded", img.width, img.height);
                this.editor.mode = 'sprite';
                // Reset frames?
                this.frames = [];
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    createAnimation() {
        const name = prompt("Animation Name (e.g. 'idle', 'walk'):");
        if (name) {
            this.animations[name] = { loop: true, frames: [] };
            this.currentAnimName = name;
            this.updateAnimList();
        }
    }

    updateAnimList() {
        const div = document.getElementById('anim-list');
        if (!div) return;
        div.innerHTML = '';
        for (const name in this.animations) {
            const el = document.createElement('div');
            el.innerText = `${name} (${this.animations[name].frames.length} frames)`;
            el.onclick = () => { this.currentAnimName = name; this.updateAnimList(); console.log("Selected anim:", name); };
            el.style.cursor = 'pointer';
            el.style.padding = '2px';
            if (this.currentAnimName === name) {
                el.style.fontWeight = 'bold';
                el.style.backgroundColor = '#444';
            }
            div.appendChild(el);
        }
    }

    // Called by EditorInput or Editor
    handleMouseDown(worldPos) {
        if (!this.spriteSheet) return;
        this.isSelectingFrame = true;
        this.selectionStart = { ...worldPos };
        this.currentSelection = { x: worldPos.x, y: worldPos.y, w: 0, h: 0 };
    }

    handleMouseMove(worldPos) {
        if (this.isSelectingFrame && this.currentSelection) {
            this.currentSelection.w = worldPos.x - this.selectionStart.x;
            this.currentSelection.h = worldPos.y - this.selectionStart.y;
        }
    }

    handleMouseUp(worldPos) {
        if (this.isSelectingFrame && this.currentSelection) {
            this.isSelectingFrame = false;
            // Normalize rect
            const frame = {
                x: Math.min(this.selectionStart.x, worldPos.x),
                y: Math.min(this.selectionStart.y, worldPos.y),
                w: Math.abs(worldPos.x - this.selectionStart.x),
                h: Math.abs(worldPos.y - this.selectionStart.y)
            };

            if (frame.w > 5 && frame.h > 5) {
                this.frames.push(frame);
                console.log("Frame added", frame);

                // If an animation is selected, add this frame to it
                if (this.currentAnimName && this.animations[this.currentAnimName]) {
                    this.animations[this.currentAnimName].frames.push(this.frames.length - 1);
                    this.updateAnimList();
                }
            }
            this.currentSelection = null;
        }
    }

    render(ctx) {
        // Clear
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.spriteSheet) {
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.fillText("Sprite Importer Mode", 50, 50);
            ctx.fillText("Upload a Sprite Sheet from the sidebar to begin.", 50, 80);
            return;
        }

        // Draw Sheet (at 0,0 world space, but camera is applied by editor before calling this?)
        // wait, Editor.js calls this.spriteImporter.render(this.ctx).
        // Editor.js Apply Camera happens inside editor.render() BUT for sprite mode we might want different camera?
        // Actually Editor.js Apply Camera is INSIDE render(). 
        // Checks mode -> if sprite -> calls sprite.render -> returns. 
        // So NO camera is applied yet. We need to handle our own camera or re-use editor's.
        // For simplicity, let's just reset transform and draw raw or simple pan.

        ctx.save();
        // Simple centering for now
        ctx.translate(50, 50);

        ctx.drawImage(this.spriteSheet, 0, 0);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(0, 0, this.spriteSheet.width, this.spriteSheet.height);

        // Draw all defined frames
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 1;
        this.frames.forEach((f, i) => {
            ctx.strokeRect(f.x, f.y, f.w, f.h);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fillText(i, f.x + 2, f.y + 10);
        });

        // Draw current selection
        if (this.currentSelection) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            const s = this.currentSelection;
            ctx.strokeRect(this.selectionStart.x, this.selectionStart.y, s.w, s.h);
        }

        ctx.restore();

        // Overlay info
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.fillText("Mode: Sprite Importer", 10, 20);
        ctx.fillText(`Frames: ${this.frames.length}`, 10, 40);
        if (this.currentAnimName) {
            ctx.fillText(`Editing Anim: ${this.currentAnimName}`, 10, 60);
        } else {
            ctx.fillText(`No Anim Selected`, 10, 60);
        }
    }
}
