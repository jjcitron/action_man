import { Enemy } from './Enemy.js';
import { PaletteSwap } from './PaletteSwap.js';

export class Scene {
    constructor(game) {
        this.game = game;
        this.background = null;
        this.walkablePolygon = [];
        this.depthLines = [];
        this.objects = [];
        this.enemies = [];
        this.levelData = null;

        // Character data cache: { "hero": { data, image }, "villian": { data, image } }
        this.characters = {};
    }

    async loadLevel(url) {
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            this.levelData = data;

            this.walkablePolygon = data.walkablePolygon || [];
            this.depthLines = data.depthLines || [];
            this.objects = data.objects || [];
            this.enemies = [];

            // Load background
            if (data.background) {
                this.background = new Image();
                this.background.src = data.background;
                await new Promise((resolve, reject) => {
                    this.background.onload = resolve;
                    this.background.onerror = reject;
                });
                console.log(`Background loaded: ${this.background.width}x${this.background.height}`);

                // Configure camera for level bounds
                this.game.camera.setLevelBounds(this.background.width, this.background.height);
            }

            // Load character data
            if (data.characters) {
                for (const [name, path] of Object.entries(data.characters)) {
                    await this.loadCharacter(name, path);
                }
            }

            // Spawn enemies
            this.spawnEnemies();

            // Set player start position
            if (data.playerStart) {
                this.game.player.x = data.playerStart.x;
                this.game.player.y = data.playerStart.y;
            }

            // Initialize player with character data
            const heroData = this.characters['hero'];
            if (heroData) {
                this.game.player.loadCharacterData(heroData.data, heroData.image);
            }

            // Snap camera to player
            this.game.camera.snapTo(this.game.player.x, this.game.player.y);

            console.log("Level loaded:", data.name || "unnamed");
        } catch (e) {
            console.error("Failed to load level:", e);
        }
    }

    async loadCharacter(name, jsonPath) {
        try {
            const resp = await fetch(jsonPath);
            const data = await resp.json();

            // Load sprite sheet image
            const image = new Image();
            // Resolve sprite sheet path relative to character JSON location
            const basePath = jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1);
            image.src = basePath + data.spriteSheet.replace('../', '../assets/');
            // Simpler: construct from known asset path
            image.src = `assets/sprites/${name === 'hero' ? 'hero' : 'villian'}.png`;

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            this.characters[name] = { data, image };
            console.log(`Character loaded: ${name} (${data.frames.length} frames)`);
        } catch (e) {
            console.error(`Failed to load character '${name}':`, e);
        }
    }

    spawnEnemies() {
        this.enemies = [];
        const villainChar = this.characters['villian'];
        if (!villainChar) {
            console.warn("No villain character data loaded, spawning placeholder enemies");
        }

        for (const obj of this.objects) {
            if (obj.type === 'enemy') {
                const enemy = new Enemy(this, obj.x, obj.y);

                if (villainChar) {
                    // Apply palette swap if configured
                    let spriteImage = villainChar.image;
                    if (obj.tint) {
                        spriteImage = PaletteSwap.createTinted(villainChar.image, obj.tint);
                    }
                    enemy.loadCharacterData(villainChar.data, spriteImage);
                }

                this.enemies.push(enemy);
            }
        }
        console.log(`Spawned ${this.enemies.length} enemies`);
    }

    render(ctx) {
        if (!this.background) return;

        // Background (camera transform is already applied by Game.js)
        ctx.drawImage(this.background, 0, 0);
    }
}
