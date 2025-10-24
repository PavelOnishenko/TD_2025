import { callCrazyGamesEvent, crazyGamesIntegrationAllowed, crazyGamesWorks } from './crazyGamesIntegration.js';

const AD_COOLDOWN_MS = 120_000;
let lastAdTimestamp = 0;

function resolveWindow(windowOverride) {
    if (windowOverride) {
        return windowOverride;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return globalThis;
}

function getAdSdk(windowOverride = null) {
    const hostWindow = resolveWindow(windowOverride);
    return hostWindow?.CrazyGames?.SDK?.ad ?? null;
}

function isAdSdkAvailable(windowOverride = null) {
    if (!crazyGamesIntegrationAllowed || !crazyGamesWorks) {
        return false;
    }
    const adSdk = getAdSdk(windowOverride);
    return typeof adSdk?.requestAd === 'function';
}

function isCooldownActive(now = Date.now()) {
    if (!lastAdTimestamp) {
        return false;
    }
    return now - lastAdTimestamp < AD_COOLDOWN_MS;
}

export function getCrazyGamesAdCooldownRemaining(now = Date.now()) {
    if (!isCooldownActive(now)) {
        return 0;
    }
    return Math.max(0, AD_COOLDOWN_MS - (now - lastAdTimestamp));
}

function pauseGameForAd(game) {
    if (!game || typeof game.pauseForAd !== 'function') {
        return false;
    }
    try {
        return game.pauseForAd();
    } catch (error) {
        console.warn('Failed to pause game for ad', error);
        return false;
    }
}

function resumeGameAfterAd(game) {
    if (!game || typeof game.resumeAfterAd !== 'function') {
        return false;
    }
    try {
        return game.resumeAfterAd();
    } catch (error) {
        console.warn('Failed to resume game after ad', error);
        return false;
    }
}

export async function showCrazyGamesAdWithPause(game, options = {}) {
    const { adType = 'midgame', windowRef = null } = options;
    if (!isAdSdkAvailable(windowRef)) {
        return { shown: false, reason: 'unavailable' };
    }
    if (isCooldownActive()) {
        return {
            shown: false,
            reason: 'cooldown',
            cooldownRemaining: getCrazyGamesAdCooldownRemaining(),
        };
    }

    const adSdk = getAdSdk(windowRef);
    const paused = pauseGameForAd(game);
    callCrazyGamesEvent('gameplayStop');

    try {
        await adSdk.requestAd(adType);
        lastAdTimestamp = Date.now();
        return { shown: true };
    } catch (error) {
        console.warn('CrazyGames ad request failed', error);
        return { shown: false, reason: 'error', error };
    } finally {
        callCrazyGamesEvent('gameplayStart');
        if (game && (paused || game.pauseReason === 'ad')) {
            resumeGameAfterAd(game);
        }
    }
}

export function markCrazyGamesAdShown(timestamp = Date.now()) {
    lastAdTimestamp = timestamp;
}

export function resetCrazyGamesAdCooldown() {
    lastAdTimestamp = 0;
}

export const crazyGamesAdInternals = {
    getAdSdk,
    isAdSdkAvailable,
    isCooldownActive,
};

export { AD_COOLDOWN_MS };
