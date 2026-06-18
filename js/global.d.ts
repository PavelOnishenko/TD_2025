// Global type extensions for Neon Void

import type { Viewport } from './engine.js';
import type Game from './core/Game.js';

interface CrazyGamesDataClient {
    getItem?: (key: string) => Promise<string | null> | string | null;
    setItem?: (key: string, value: string) => Promise<void> | void;
    removeItem?: (key: string) => Promise<void> | void;
}

interface CrazyGamesUserClient {
    isUserAccountAvailable?: boolean;
    getUser?: () => Promise<{ username?: string; profilePictureUrl?: string } | null>;
}

interface CrazyGamesSdk {
    environment?: string;
    init?: () => Promise<void> | void;
    game?: Record<string, () => void>;
    data?: CrazyGamesDataClient;
    user?: CrazyGamesUserClient;
}

interface CrazyGamesGlobal {
    SDK?: CrazyGamesSdk;
}

interface WebApplicationBridge {
    publishEvent: (name: string, value: string) => void;
}

declare global {
    interface Window {
        neonVoidGame?: Game;
        debugMode?: boolean;
        CrazyGames?: CrazyGamesGlobal;
        printBalanceData?: () => void;
        exportBalanceCSV?: () => void;
        application?: WebApplicationBridge;
    }

    interface HTMLCanvasElement {
        viewportTransform?: Viewport;
    }

    interface HTMLScriptElement {
        readyState?: 'loading' | 'loaded' | 'complete' | string;
    }

    var CrazyGames: CrazyGamesGlobal | undefined;
    var application: WebApplicationBridge;
}

export {};
