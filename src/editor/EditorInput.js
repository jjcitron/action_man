export class EditorInput {
    constructor(editor) {
        this.editor = editor;
        this.canvas = editor.canvas;
        this.isPanning = false;
        this.lastMouse = { x: 0, y: 0 };

        this.initListeners();
    }

    initListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // Convert Screen Space to World Space (taking zoom/pan into account)
    screenToWorld(x, y) {
        return {
            x: (x - this.editor.camera.x) / this.editor.camera.zoom,
            y: (y - this.editor.camera.y) / this.editor.camera.zoom
        };
    }

    onMouseDown(e) {
        const mouse = this.getMousePos(e);

        // Middle mouse or Space+Click to pan
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true;
            this.lastMouse = mouse;
            return;
        }

        if (this.editor.mode === 'sprite') {
            // Adjust for offset (hardcoded to 50,50 for now as per Importer render)
            const spriteMouse = { x: mouse.x - 50, y: mouse.y - 50 };
            this.editor.spriteImporter.handleMouseDown(spriteMouse);
            return;
        }

        // Tool interactions
        const worldPos = this.screenToWorld(mouse.x, mouse.y);
        this.editor.handleToolClick(e.button, worldPos);
    }

    onMouseMove(e) {
        const mouse = this.getMousePos(e);

        if (this.isPanning) {
            const dx = mouse.x - this.lastMouse.x;
            const dy = mouse.y - this.lastMouse.y;
            this.editor.camera.x += dx;
            this.editor.camera.y += dy;
            this.lastMouse = mouse;
        }

        if (this.editor.mode === 'sprite') {
            const spriteMouse = { x: mouse.x - 50, y: mouse.y - 50 };
            this.editor.spriteImporter.handleMouseMove(spriteMouse);
            return;
        }
    }

    onMouseUp(e) {
        if (this.editor.mode === 'sprite') {
            const mouse = this.getMousePos(e);
            const spriteMouse = { x: mouse.x - 50, y: mouse.y - 50 };
            this.editor.spriteImporter.handleMouseUp(spriteMouse);
        }
        this.isPanning = false;
    }

    onWheel(e) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newZoom = Math.max(0.1, Math.min(5, this.editor.camera.zoom + delta));

        // Zoom towards mouse pointer logic could go here, for now simpler zoom
        this.editor.camera.zoom = newZoom;
    }
}
