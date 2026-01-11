// Global type extensions for Neon Void

import type { Viewport } from './engine.js';
import type Game from './core/Game.js';

declare global {
    interface Window {
        neonVoidGame?: Game;
        debugMode?: boolean;
    }

    interface HTMLCanvasElement {
        viewportTransform?: Viewport;
    }
}

export {};
