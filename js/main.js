import {
    callCrazyGamesEvent,
    crazyGamesIntegrationAllowed,
    crazyGamesWorks,
    initializeCrazyGamesIntegration,
} from './systems/crazyGamesIntegration.js';
import Game from './core/Game.js';
import { bindUI } from './systems/ui.js';
import { loadAssets } from './systems/assets.js';
import { initializeAudio } from './systems/audio.js';
const LOGICAL_W = 540;
const LOGICAL_H = 960;
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
export function createViewport(displaySize, logicalWidth = LOGICAL_W, logicalHeight = LOGICAL_H) {
    const { displayWidth, displayHeight, dpr } = displaySize;
    const scale = Math.min(displayWidth / logicalWidth, displayHeight / logicalHeight) || 1;
    const renderWidth = logicalWidth * scale;
    const renderHeight = logicalHeight * scale;
    const offsetX = (displayWidth - renderWidth) / 2;
    const offsetY = (displayHeight - renderHeight) / 2;
    return { scale, offsetX, offsetY, dpr };
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
        gameInstance.viewport = viewport;
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
    const viewport = createViewport(displaySize);
    applyViewport(canvasElement, gameInstance, viewport);
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
        console.log('User info:', user);
        return { username: user.username, profilePictureUrl: user.profilePictureUrl };
    } catch (error) {
        console.warn('CrazyGames SDK getUser failed', error);
        return null;
    }
}
function isCrazyGamesAccountAvailable(crazyGamesWindow) {
    const available = crazyGamesWindow.CrazyGames?.SDK?.user?.isUserAccountAvailable;
    console.log('User account system available?', available);
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
    if (user) {
        console.log('Logged in as:', user.username);
        updateCrazyGamesUserUI(user);
    }
    console.log('CrazyGames integration kinda finished..');
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
    bindUI(game);
    resizeCanvas(context);
    const resizeHandler = () => resizeCanvas(context);
    window.addEventListener('resize', resizeHandler);
    if (crazyGamesIntegrationAllowed) {
        callCrazyGamesEvent('sdkGameLoadingStop');
    }
    return { game, resizeHandler };
}
async function bootstrapGame() {
    initializeAudio();
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
