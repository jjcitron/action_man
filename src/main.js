// Game Entry Point
import { Game } from './engine/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = 1280;
    canvas.height = 720;

    const game = new Game(canvas);

    // Auto-load the first level
    game.start('assets/levels/level1.json');

    // Restart on R key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            if (game.player.hp <= 0) {
                game.start('assets/levels/level1.json');
            }
        }
    });
});
