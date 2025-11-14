import {
    callCrazyGamesEvent,
    crazyGamesIntegrationAllowed,
    crazyGamesWorks,
    initializeCrazyGamesIntegration,
} from './systems/crazyGamesIntegration.js';
import Game from './core/Game.js';
import { bindUI, updateAudioControls } from './systems/ui.js';
import { loadAssets } from './systems/assets.js';
import { initializeAudio } from './systems/audio.js';
import { loadAudioSettings } from './systems/dataStore.js';
import gameConfig from './config/gameConfig.js';
import featureFlags from './config/featureFlags.js';
import initSimpleSaveSystem from './systems/simpleSaveSystem.js';
import { initializeHudController } from './systems/hudLayout.js';

const { width: LOGICAL_W, height: LOGICAL_H } = gameConfig.world.logicalSize;
export function getViewportMetrics(windowRef = window) {
    const width = windowRef.innerWidth;
    const height = windowRef.innerHeight;
    const devicePixelRatio = windowRef.devicePixelRatio || 1;
    return { width, height, dpr: devicePixelRatio };
}
export function computeDisplaySize(metrics) {
    const displayWidth = Math.round(metrics.width * metrics.dpr);
    const displayHeight = Math.round(metrics.height * metrics.dpr);
    return { displayWidth, displayHeight, dpr: metrics.dpr };
}
function resolveDimension(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeBounds(bounds, fallbackWidth, fallbackHeight) {
    const defaultBounds = {
        minX: 0,
        maxX: fallbackWidth,
        minY: 0,
        maxY: fallbackHeight,
    };

    if (!bounds) {
        return defaultBounds;
    }

    const widthValid = Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && bounds.maxX > bounds.minX;
    const heightValid = Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY) && bounds.maxY > bounds.minY;

    if (widthValid && heightValid) {
        return {
            minX: bounds.minX,
            maxX: bounds.maxX,
            minY: bounds.minY,
            maxY: bounds.maxY,
        };
    }

    return {
        minX: widthValid ? bounds.minX : 0,
        maxX: widthValid ? bounds.maxX : fallbackWidth,
        minY: heightValid ? bounds.minY : 0,
        maxY: heightValid ? bounds.maxY : fallbackHeight,
    };
}

export function createViewport(displaySize, options = {}) {
    const { displayWidth, displayHeight, dpr } = displaySize;
    const logicalWidth = resolveDimension(options.logicalWidth, LOGICAL_W);
    const logicalHeight = resolveDimension(options.logicalHeight, LOGICAL_H);
    const bounds = normalizeBounds(options.worldBounds, logicalWidth, logicalHeight);
    const gameplayWidth = Math.max(1, bounds.maxX - bounds.minX);
    const gameplayHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(displayWidth / gameplayWidth, displayHeight / gameplayHeight) || 1;
    const renderWidth = gameplayWidth * scale;
    const renderHeight = gameplayHeight * scale;
    const offsetX = (displayWidth - renderWidth) / 2 - bounds.minX * scale;
    const offsetY = (displayHeight - renderHeight) / 2 - bounds.minY * scale;
    return {
        scale,
        offsetX,
        offsetY,
        dpr,
        worldBounds: bounds,
        renderWidth,
        renderHeight,
    };
}
function updateContainerDimensions(container, metrics) {
    if (!container) {
        return;
    }
    container.style.width = `${metrics.width}px`;
    container.style.height = `${metrics.height}px`;
}
function applyCssSize(canvasElement, metrics) {
    canvasElement.style.width = `${metrics.width}px`;
    canvasElement.style.height = `${metrics.height}px`;
}
function ensureCanvasResolution(canvasElement, displaySize) {
    if (canvasElement.width === displaySize.displayWidth && canvasElement.height === displaySize.displayHeight) {
        return;
    }
    canvasElement.width = displaySize.displayWidth;
    canvasElement.height = displaySize.displayHeight;
}
function applyViewport(canvasElement, gameInstance, viewport) {
    canvasElement.viewportTransform = viewport;
    if (gameInstance) {
        if (typeof gameInstance.updateViewport === 'function') {
            gameInstance.updateViewport(viewport);
        } else {
            gameInstance.viewport = viewport;
        }
    }
}
export function resizeCanvas({ canvasElement, gameContainerElement, gameInstance, metrics }) {
    if (!canvasElement) {
        return null;
    }

    const viewportMetrics = metrics ?? getViewportMetrics();
    updateContainerDimensions(gameContainerElement, viewportMetrics);
    applyCssSize(canvasElement, viewportMetrics);
    const displaySize = computeDisplaySize(viewportMetrics);
    ensureCanvasResolution(canvasElement, displaySize);
    let worldBounds = null;
    if (gameInstance && typeof gameInstance.computeWorldBounds === 'function') {
        worldBounds = gameInstance.computeWorldBounds();
    }
    const logicalWidth = resolveDimension(gameInstance?.logicalW, LOGICAL_W);
    const logicalHeight = resolveDimension(gameInstance?.logicalH, LOGICAL_H);
    const viewport = createViewport(displaySize, { worldBounds, logicalWidth, logicalHeight });
    applyViewport(canvasElement, gameInstance, viewport);
    if (gameInstance && viewport.worldBounds) {
        gameInstance.worldBounds = viewport.worldBounds;
    }
    return viewport;
}
export async function getCrazyGamesUser(options = {}) {
    const { crazyGamesActive = crazyGamesWorks } = options;
    const crazyGamesWindow = resolveCrazyGamesWindow(options.crazyGamesWindow);
    if (!crazyGamesActive) {
        return null;
    }
    if (!isCrazyGamesAccountAvailable(crazyGamesWindow)) {
        return null;
    }
    try {
        const user = await crazyGamesWindow.CrazyGames.SDK.user.getUser();
        return { username: user.username, profilePictureUrl: user.profilePictureUrl };
    } catch (error) {
        console.warn('CrazyGames SDK getUser failed', error);
        return null;
    }
}
function isCrazyGamesAccountAvailable(crazyGamesWindow) {
    const available = crazyGamesWindow.CrazyGames?.SDK?.user?.isUserAccountAvailable;
    return Boolean(available);
}
function resolveCrazyGamesWindow(providedWindow) {
    if (providedWindow) {
        return providedWindow;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return globalThis;
}
async function fetchCrazyGamesUserSafely() {
    try {
        return await getCrazyGamesUser();
    } catch (error) {
        console.warn('Failed to fetch CrazyGames user', error);
        return null;
    }
}
async function initializeCrazyGamesIfNeeded() {
    if (!crazyGamesIntegrationAllowed) {
        console.log('CrazyGames integration disabled for this host.');
        return;
    }

    await initializeCrazyGamesIntegration();
    const user = await fetchCrazyGamesUserSafely();
    if (typeof globalThis !== 'undefined') {
        globalThis.__latestCrazyGamesUser = user ?? null;
    }
    if (user) {
        updateCrazyGamesUserUI(user);
    }
    callCrazyGamesEvent('sdkGameLoadingStart');
}
function updateCrazyGamesUserUI(user) {
    const userContainer = document.getElementById('crazyGamesUser');
    const usernameEl = document.getElementById('crazyGamesUsername');
    const avatarEl = document.getElementById('crazyGamesUserAvatar');

    if (usernameEl) {
        usernameEl.textContent = user.username ?? 'CrazyGames Player';
    }

    if (avatarEl) {
        toggleCrazyGamesAvatar(avatarEl, user.profilePictureUrl);
    }

    if (userContainer) {
        userContainer.classList.remove('hidden');
    }

    if (typeof globalThis !== 'undefined') {
        globalThis.__latestCrazyGamesUser = user ?? null;
        const activeGame = globalThis.__towerDefenseActiveGame;
        if (activeGame) {
            activeGame.crazyGamesUser = user ?? null;
            if (user?.username) {
                activeGame.playerName = user.username;
            }
        }
    }
}
function toggleCrazyGamesAvatar(avatarEl, profilePictureUrl) {
    if (!profilePictureUrl) {
        avatarEl.style.display = 'none';
        return;
    }
    avatarEl.src = profilePictureUrl;
    avatarEl.style.display = 'block';
}
function getCanvasContext() {
    const canvasElement = document.getElementById('game');
    const gameContainerElement = document.getElementById('gameContainer');
    return { canvasElement, gameContainerElement, gameInstance: null };
}
async function startGame(context) {
    if (!context.canvasElement) {
        return null;
    }

    const assets = await loadAssets();
    const game = new Game(context.canvasElement, { width: LOGICAL_W, height: LOGICAL_H, assets });
    context.gameInstance = game;
    if (typeof globalThis !== 'undefined') {
        globalThis.__towerDefenseActiveGame = game;
        const latestUser = globalThis.__latestCrazyGamesUser ?? null;
        if (latestUser) {
            game.crazyGamesUser = latestUser;
            if (latestUser.username) {
                game.playerName = latestUser.username;
            }
        }
    }
    bindUI(game);
    const simpleSaveConfig = featureFlags?.simpleSaveSystem ?? {};
    const simpleSaveEnabled = typeof simpleSaveConfig === 'object'
        ? Boolean(simpleSaveConfig.enabled ?? true)
        : Boolean(simpleSaveConfig);
    if (simpleSaveEnabled) {
        const saveOptions = typeof simpleSaveConfig === 'object'
            ? { storageKey: simpleSaveConfig.storageKey, enabled: simpleSaveConfig.enabled }
            : {};
        initSimpleSaveSystem(game, saveOptions);
    }
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
