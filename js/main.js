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
import { translate } from './systems/localization.js';
import initDeveloperPositionEditor from './systems/developerPositionEditor.js';
import EngineRuntime from '../engine/core/EngineRuntime.js';

const { width: LOGICAL_W, height: LOGICAL_H } = gameConfig.world.logicalSize;
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
        usernameEl.textContent = user.username ?? translate('crazyGames.defaultUser', {}, 'CrazyGames Player');
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
    const runtime = new EngineRuntime({
        canvasElement: context.canvasElement,
        gameContainerElement: context.gameContainerElement,
        logicalWidth: LOGICAL_W,
        logicalHeight: LOGICAL_H,
    });
    runtime.setGame(game);
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
    initDeveloperPositionEditor(game);
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
    runtime.init();
    if (crazyGamesIntegrationAllowed) {
        callCrazyGamesEvent('sdkGameLoadingStop');
    }
    return { game, runtime };
}

function applySavedAudioSettings(game) {
    const settings = loadAudioSettings();
    const muted = typeof settings?.muted === 'boolean' ? settings.muted : false;
    const musicEnabled = typeof settings?.musicEnabled === 'boolean' ? settings.musicEnabled : true;
    game.setAudioMuted(muted);
    game.setMusicEnabled(musicEnabled);
    updateAudioControls(game);
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
