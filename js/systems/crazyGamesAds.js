import { callCrazyGamesEvent } from './crazyGamesIntegration.js';

const CRAZYGAMES_AD_TYPE = 'midgame';
export const CRAZYGAMES_AD_COOLDOWN_MS = 2 * 60 * 1000;

let lastAdShownAt = 0;
let adInProgress = false;

function resolveWindow(reference) {
    if (reference) {
        return reference;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return typeof globalThis !== 'undefined' ? globalThis : {};
}

function getTimestamp(source) {
    if (typeof source === 'function') {
        try {
            return source();
        } catch {
            return Date.now();
        }
    }
    if (Number.isFinite(source)) {
        return source;
    }
    return Date.now();
}

function hasAdRequest(windowRef) {
    return typeof windowRef?.CrazyGames?.SDK?.ad?.requestAd === 'function';
}

function getAdSdk(windowRef) {
    return windowRef?.CrazyGames?.SDK?.ad ?? null;
}

export function getLastAdTimestamp() {
    return lastAdShownAt;
}

export function resetCrazyGamesAdState() {
    lastAdShownAt = 0;
    adInProgress = false;
}

export async function showCrazyGamesAd(options = {}) {
    const {
        game = null,
        adType = CRAZYGAMES_AD_TYPE,
        cooldownMs = CRAZYGAMES_AD_COOLDOWN_MS,
        timeSource = () => Date.now(),
        crazyGamesWindow,
    } = options;

    if (adInProgress) {
        return false;
    }

    const windowRef = resolveWindow(crazyGamesWindow);
    if (!hasAdRequest(windowRef)) {
        return false;
    }

    const now = getTimestamp(timeSource);
    if (Number.isFinite(lastAdShownAt) && lastAdShownAt > 0
        && Number.isFinite(now) && now - lastAdShownAt < cooldownMs) {
        return false;
    }

    const adSdk = getAdSdk(windowRef);
    if (!adSdk) {
        return false;
    }

    adInProgress = true;

    return new Promise(resolve => {
        let finished = false;
        let openedAt = null;

        const finalize = (wasShown) => {
            if (finished) {
                return;
            }
            finished = true;
            if (openedAt !== null) {
                lastAdShownAt = openedAt;
            }
            adInProgress = false;
            if (openedAt !== null && game && typeof game.resumeAfterAd === 'function') {
                try {
                    game.resumeAfterAd();
                } catch (error) {
                    console.warn('Failed to resume game after ad', error);
                }
            }
            if (openedAt !== null && game && !game.gameOver) {
                callCrazyGamesEvent('gameplayStart');
            }
            resolve(Boolean(wasShown && openedAt !== null));
        };

        const handleOpen = () => {
            if (openedAt !== null) {
                return;
            }
            openedAt = getTimestamp(timeSource);
            if (!Number.isFinite(openedAt)) {
                openedAt = Date.now();
            }
            if (game && typeof game.pauseForAd === 'function') {
                try {
                    game.pauseForAd();
                } catch (error) {
                    console.warn('Failed to pause game for ad', error);
                }
            }
            callCrazyGamesEvent('gameplayStop');
        };

        const callbacks = {
            onOpen: () => handleOpen(),
            onClose: () => finalize(true),
            onError: () => finalize(false),
            onOffline: () => finalize(false),
        };

        try {
            const result = adSdk.requestAd(adType, callbacks);
            if (result && typeof result.then === 'function') {
                result.catch(() => finalize(false));
            }
        } catch (error) {
            console.warn('CrazyGames ad request failed', error);
            finalize(false);
        }
    });
}
