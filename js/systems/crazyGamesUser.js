import {
    callCrazyGamesEvent,
    crazyGamesIntegrationAllowed,
    crazyGamesWorks,
    initializeCrazyGamesIntegration,
} from './crazyGamesIntegration.js';
import { translate } from './localization.js';

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

export async function initializeCrazyGamesIfNeeded() {
    if (!crazyGamesIntegrationAllowed) {
        return null;
    }

    await initializeCrazyGamesIntegration();
    const user = await fetchCrazyGamesUserSafely();
    cacheCrazyGamesUser(user);
    if (user) {
        updateCrazyGamesUserUI(user);
    }
    callCrazyGamesEvent('sdkGameLoadingStart');
    return user;
}

function cacheCrazyGamesUser(user) {
    if (typeof globalThis === 'undefined') {
        return;
    }
    globalThis.__latestCrazyGamesUser = user ?? null;
    const activeGame = globalThis.__towerDefenseActiveGame;
    if (!activeGame) {
        return;
    }

    activeGame.crazyGamesUser = user ?? null;
    if (user?.username) {
        activeGame.playerName = user.username;
    }
}

async function fetchCrazyGamesUserSafely() {
    try {
        return await getCrazyGamesUser();
    } catch (error) {
        console.warn('Failed to fetch CrazyGames user', error);
        return null;
    }
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
}

function toggleCrazyGamesAvatar(avatarEl, profilePictureUrl) {
    if (!profilePictureUrl) {
        avatarEl.style.display = 'none';
        return;
    }
    avatarEl.src = profilePictureUrl;
    avatarEl.style.display = 'block';
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
