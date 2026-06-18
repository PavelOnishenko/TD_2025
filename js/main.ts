import Game from './core/Game.js';
import featureFlags from './config/featureFlags.js';
import { loadAssets } from './systems/assets.js';
import { initializeAudio } from './systems/audio.js';
import { initializeHudController } from './systems/hudLayout.js';
import initDeveloperPositionEditor from './systems/developerPositionEditor.js';
import initBalanceViewer from './systems/balanceViewer.js';
import initSimpleSaveSystem from './systems/simpleSaveSystem.js';
import { loadAudioSettings } from './systems/dataStore.js';
import { bindUI, updateAudioControls } from './systems/ui.js';
import { callCrazyGamesEvent, crazyGamesIntegrationAllowed } from './systems/crazyGamesIntegration.js';
import { initializeCrazyGamesIfNeeded, getCrazyGamesUser } from './systems/crazyGamesUser.js';
import {
    getViewportMetrics,
    computeDisplaySize,
    createViewport,
    resizeCanvas,
} from './systems/viewportManager.js';
import gameConfig from './config/gameConfig.js';

const { width: LOGICAL_W, height: LOGICAL_H } = gameConfig.world.logicalSize;

export {
    getViewportMetrics,
    computeDisplaySize,
    createViewport,
    resizeCanvas,
    getCrazyGamesUser,
};

function getCanvasContext() {
    const canvasElement = document.getElementById('game');
    const gameContainerElement = document.getElementById('gameContainer');
    return { canvasElement, gameContainerElement, gameInstance: null };
}

function updateLoadingProgress({ loaded, total, percent, stage }) {
    const progressFill = document.getElementById('loadingProgressFill');
    const progressText = document.getElementById('loadingProgressText');

    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }

    if (progressText) {
        const stageText = stage === 'images' ? 'Loading images'
            : stage === 'sounds' ? 'Loading sounds'
            : 'Finalizing';
        progressText.textContent = `${stageText}... ${percent}%`;
    }
}

function hideLoadingProgress() {
    const loadingProgress = document.getElementById('loadingProgress');
    const startButton = document.getElementById('startGame');

    if (loadingProgress) {
        loadingProgress.classList.add('hidden');
    }

    if (startButton) {
        startButton.disabled = false;
    }
}

async function startGame(context) {
    if (!context.canvasElement) {
        return null;
    }

    const assets = await loadAssets({ onProgress: updateLoadingProgress });
    hideLoadingProgress();
    const game = new Game(context.canvasElement, { width: LOGICAL_W, height: LOGICAL_H, assets });
    context.gameInstance = game;
    registerGlobalGameReference(game);

    bindUI(game);
    initDeveloperPositionEditor(game);
    initBalanceViewer(game);
    initializeSimpleSaveIfEnabled(game);
    applySavedAudioSettings(game);
    attachAudioFocusHandlers(game);
    resizeCanvas(context);

    const resizeHandler = () => resizeCanvas(context);
    window.addEventListener('resize', resizeHandler);

    if (crazyGamesIntegrationAllowed) {
        callCrazyGamesEvent('sdkGameLoadingStop');
    }
    return { game, resizeHandler };
}

function registerGlobalGameReference(game) {
    if (typeof globalThis === 'undefined') {
        return;
    }
    globalThis.__towerDefenseActiveGame = game;
    const latestUser = globalThis.__latestCrazyGamesUser ?? null;
    if (!latestUser) {
        return;
    }

    game.crazyGamesUser = latestUser;
    if (latestUser.username) {
        game.playerName = latestUser.username;
    }
}

function initializeSimpleSaveIfEnabled(game) {
    const simpleSaveConfig = featureFlags?.simpleSaveSystem ?? {};
    const simpleSaveEnabled = typeof simpleSaveConfig === 'object'
        ? Boolean(simpleSaveConfig.enabled ?? true)
        : Boolean(simpleSaveConfig);
    if (!simpleSaveEnabled) {
        return;
    }
    const saveOptions = typeof simpleSaveConfig === 'object'
        ? { storageKey: simpleSaveConfig.storageKey, enabled: simpleSaveConfig.enabled }
        : {};
    initSimpleSaveSystem(game, saveOptions);
}

function applySavedAudioSettings(game) {
    const settings = loadAudioSettings();
    const muted = typeof settings?.muted === 'boolean' ? settings.muted : false;
    const musicEnabled = typeof settings?.musicEnabled === 'boolean' ? settings.musicEnabled : true;
    game.setAudioMuted(muted);
    game.setMusicEnabled(musicEnabled);
    updateAudioControls(game);
}

function attachAudioFocusHandlers(game) {
    if (typeof window === 'undefined') {
        return;
    }
    window.addEventListener('blur', () => handleWindowBlur(game));
    window.addEventListener('focus', () => handleWindowFocus(game));
}

function handleWindowBlur(game) {
    if (!game) {
        return;
    }
    const resumeLater = Boolean(game.musicEnabled && !game.audioMuted && game.shouldPlayMusic());
    if (!game.isPaused && typeof game.pause === 'function') {
        game.musicPausedByFocus = resumeLater;
        game.pause('focus');
        return;
    }
    if (game.pauseReason === 'focus') {
        game.musicPausedByFocus = resumeLater;
        if (resumeLater && typeof game.audio?.stopMusic === 'function') {
            game.audio.stopMusic();
        }
        return;
    }
    if (resumeLater && typeof game.audio?.stopMusic === 'function') {
        game.audio.stopMusic();
    }
    game.musicPausedByFocus = false;
}

function handleWindowFocus(game) {
    if (!game) {
        return;
    }
    const shouldResumeMusic = game.musicPausedByFocus;
    game.musicPausedByFocus = false;
    if (game.pauseReason === 'focus' && typeof game.resume === 'function') {
        const resumed = game.resume({ expectedReason: 'focus', reason: 'focus' });
        if (!resumed && shouldResumeMusic) {
            game.playMusicIfAllowed();
        }
        return;
    }
    if (shouldResumeMusic) {
        game.playMusicIfAllowed();
    }
}

async function bootstrapGame() {
    initializeAudio();
    initializeHudController();
    await initializeCrazyGamesIfNeeded();
    const context = getCanvasContext();
    await startGame(context);
}

function shouldBootstrap() {
    if (typeof document === 'undefined') {
        return false;
    }
    return Boolean(document.getElementById('game'));
}

if (shouldBootstrap()) {
    void bootstrapGame();
}
