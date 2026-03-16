// Editor Entry Point
import { EditorInput } from './EditorInput.js';
import { SpriteImporter } from './SpriteImporter.js';


export class Editor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.backgroundImage = null;
        this.bgTransform = { x: 0, y: 0, scale: 1.0 };
        this.camera = { x: 0, y: 0, zoom: 1 };

        this.input = new EditorInput(this);
        this.spriteImporter = new SpriteImporter(this);

        this.currentTool = 'select'; // select, polygon, depth, object
        this.walkablePolygon = []; // Array of {x, y}
        this.objects = []; // Array of {x, y, type, properties}

        // Depth Scale Data: { y: number, scale: number }
        this.depthLines = [
            { y: 100, scale: 0.5, color: 'cyan' }, // Min scale (horizon)
            { y: 600, scale: 1.0, color: 'magenta' }  // Max scale (foreground)
        ];

        this.initUI();
        this.render();
    }

    initUI() {
        const fileInput = document.getElementById('file-bg');
        fileInput.addEventListener('change', (e) => this.handleImageUpload(e));

        document.getElementById('bg-x').oninput = (e) => this.bgTransform.x = parseFloat(e.target.value);
        document.getElementById('bg-y').oninput = (e) => this.bgTransform.y = parseFloat(e.target.value);
        document.getElementById('bg-scale').oninput = (e) => this.bgTransform.scale = parseFloat(e.target.value);

        document.getElementById('tool-select').onclick = () => this.setTool('select');
        document.getElementById('tool-polygon').onclick = () => this.setTool('polygon');
        document.getElementById('tool-depth').onclick = () => this.setTool('depth');
        document.getElementById('tool-object').onclick = () => this.setTool('object');

        document.getElementById('btn-save').onclick = () => this.saveData();
        document.getElementById('file-load-json').onchange = (e) => this.loadData(e);

        console.log("Editor UI Initialized");
    }

    setTool(tool) {
        this.currentTool = tool;
        // Update UI active state
        document.querySelectorAll('.tool-group button').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tool-${tool}`);
        if (btn) btn.classList.add('active');
        console.log("Tool set to:", tool);
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                // Reset polygon on new image? Maybe not.
                console.log("Background loaded", img.width, img.height);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleToolClick(button, worldPos) {
        if (this.currentTool === 'polygon' && button === 0) {
            this.walkablePolygon.push(worldPos);
            console.log("Added point:", worldPos);
        }
        else if (this.currentTool === 'polygon' && button === 2) {
            this.walkablePolygon.pop();
        }
        else if (this.currentTool === 'depth' && button === 0) {
            // Find closest line and move it
            const clickY = worldPos.y;
            const dist0 = Math.abs(clickY - this.depthLines[0].y);
            const dist1 = Math.abs(clickY - this.depthLines[1].y);

            if (dist0 < dist1) {
                this.depthLines[0].y = clickY;
            } else {
                this.depthLines[1].y = clickY;
            }
        }
        else if (this.currentTool === 'object' && button === 0) {
            // Place an object
            const type = prompt("Enter object type (exit, enemy, item):", "exit");
            if (type) {
                this.objects.push({
                    x: worldPos.x,
                    y: worldPos.y,
                    type: type,
                    id: Date.now()
                });
            }
        }
        else if (this.currentTool === 'select' && button === 0) {
            // Check for object selection (simple distance check)
            const clickRadius = 20;
            const selected = this.objects.find(obj => {
                const dx = obj.x - worldPos.x;
                const dy = obj.y - worldPos.y;
                return Math.sqrt(dx * dx + dy * dy) < clickRadius;
            });

            if (selected) {
                const propDiv = document.getElementById('prop-content');
                propDiv.innerHTML = `
                    <b>ID:</b> ${selected.id}<br>
                    <b>Type:</b> ${selected.type}<br>
                    <button id="btn-del-obj-${selected.id}">Delete</button>
                `;
                setTimeout(() => {
                    document.getElementById(`btn-del-obj-${selected.id}`).onclick = () => {
                        this.objects = this.objects.filter(o => o.id !== selected.id);
                        propDiv.innerHTML = "Deleted";
                    };
                }, 0);
            }
        }
    }

    saveData() {
        const data = {
            backgroundImage: this.backgroundImage ? this.backgroundImage.src : null,
            bgTransform: this.bgTransform,
            walkablePolygon: this.walkablePolygon,
            objects: this.objects,
            depthLines: this.depthLines,
            // Save Sprite Data
            sprites: {
                img: this.spriteImporter.spriteSheet ? this.spriteImporter.spriteSheet.src : null,
                frames: this.spriteImporter.frames,
                animations: this.spriteImporter.animations
            }
        };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "level_data.json";
        link.click();
    }

    loadData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.walkablePolygon = data.walkablePolygon || [];
                this.objects = data.objects || [];
                if (data.depthLines) this.depthLines = data.depthLines;

                if (data.backgroundImage) {
                    const img = new Image();
                    img.onload = () => { this.backgroundImage = img; };
                    img.src = data.backgroundImage;
                }
                console.log("Data loaded");
            } catch (err) {
                console.error("Failed to load JSON", err);
            }
        };
        reader.readAsText(file);
    }

    render() {
        if (this.mode === 'sprite') {
            this.spriteImporter.render(this.ctx);
            requestAnimationFrame(this.render.bind(this));
            return;
        }

        // Clear screen
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Apply camera
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Center zoom
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2); // Center zoom
        this.ctx.translate(this.camera.x, this.camera.y);

        // Draw Background
        if (this.backgroundImage) {
            this.ctx.save();
            this.ctx.translate(this.bgTransform.x, this.bgTransform.y);
            this.ctx.scale(this.bgTransform.scale, this.bgTransform.scale);

            this.ctx.drawImage(this.backgroundImage, 0, 0);

            // Draw border
            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 2 / this.bgTransform.scale; // keep line width constant
            this.ctx.strokeRect(0, 0, this.backgroundImage.width, this.backgroundImage.height);

            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#444';
            this.ctx.font = '20px Arial';
            this.ctx.fillText("No Background Loaded", 50, 50);
        }

        // Draw Walkable Polygon
        if (this.walkablePolygon.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.walkablePolygon[0].x, this.walkablePolygon[0].y);
            for (let i = 1; i < this.walkablePolygon.length; i++) {
                this.ctx.lineTo(this.walkablePolygon[i].x, this.walkablePolygon[i].y);
            }
            if (this.walkablePolygon.length > 2) this.ctx.closePath();

            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.fill();
            this.ctx.strokeStyle = '#0f0';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw points
            this.ctx.fillStyle = '#fff';
            for (const p of this.walkablePolygon) {
                this.ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
            }
        }

        // Draw Objects
        for (const obj of this.objects) {
            this.ctx.fillStyle = obj.type === 'exit' ? 'orange' : 'red';
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(obj.type, obj.x - 10, obj.y - 15);
        }

        // Draw Depth Lines
        if (this.currentTool === 'depth') {
            const width = this.backgroundImage ? this.backgroundImage.width : this.canvas.width;

            for (const line of this.depthLines) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, line.y);
                this.ctx.lineTo(width, line.y);
                this.ctx.strokeStyle = line.color;
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                this.ctx.fillStyle = line.color;
                this.ctx.fillText(`Scale: ${line.scale.toFixed(2)}`, 10, line.y - 5);
            }
        }

        this.ctx.restore();

        // UI Overlay
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(1)}`, 10, this.canvas.height - 10);

        requestAnimationFrame(this.render.bind(this));
    }
}
