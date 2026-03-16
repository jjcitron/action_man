// Editor Entry Point
import { Editor } from './editor/Editor.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('editorCanvas');
    canvas.width = 1280;
    canvas.height = 720;

    const editor = new Editor(canvas);
});
