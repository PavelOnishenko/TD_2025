export let crazyGamesWorks = false;

const blockedCrazyGamesHosts = new Set([
    'pavelonishenko.github.io',
]);

function getNormalizedHost() {
    if (typeof window === 'undefined') {
        return '';
    }
    const rawHost = window.location?.hostname || '';
    return rawHost.trim().toLowerCase();
}

function isGithubPagesHost(host) {
    return host.endsWith('.github.io');
}

export const crazyGamesIntegrationAllowed = (() => {
    const host = getNormalizedHost();
    if (!host) {
        return true;
    }
    if (blockedCrazyGamesHosts.has(host)) {
        return false;
    }
    if (isGithubPagesHost(host)) {
        return false;
    }
    return true;
})();

export const crazyMap = {
  sdkGameLoadingStart: "loadingStart",
  sdkGameLoadingStop: "loadingStop",
  gameplayStart: "gameplayStart",
  gameplayStop: "gameplayStop"
};

let crazyGamesSdkPromise = null;

function ensureCrazyGamesSdkLoaded() {
    if (!crazyGamesIntegrationAllowed) {
        return Promise.resolve(false);
    }
    if (window.CrazyGames?.SDK) {
        return Promise.resolve(true);
    }
    if (!crazyGamesSdkPromise) {
        crazyGamesSdkPromise = new Promise(resolve => {
            const handleResult = (success) => {
                resolve(Boolean(success));
            };

            const existingScript = document.querySelector('script[data-crazygames-sdk]');
            if (existingScript) {
                if (existingScript.dataset.crazygamesSdkLoaded === 'true') {
                    handleResult(true);
                    return;
                }
                const state = existingScript.readyState;
                if (state === 'complete' || state === 'loaded') {
                    handleResult(true);
                    return;
                }
                existingScript.addEventListener('load', () => handleResult(true), { once: true });
                existingScript.addEventListener('error', () => handleResult(false), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
            script.async = true;
            script.dataset.crazygamesSdk = 'true';
            script.addEventListener('load', () => {
                script.dataset.crazygamesSdkLoaded = 'true';
                handleResult(true);
            }, { once: true });
            script.addEventListener('error', () => handleResult(false), { once: true });
            document.head.appendChild(script);
        });
    }
    return crazyGamesSdkPromise;
}

export function callCrazyGamesEvent(fnName) {
    if (!crazyGamesIntegrationAllowed || !crazyGamesWorks) {
        return;
    }
    try {
        const realFn = crazyMap[fnName] || fnName;
        window.CrazyGames.SDK.game[realFn]();
        console.log(`[${fnName}] event called.`);
    }
    catch (e) {
        console.log(`error while calling [${fnName}] event: [${e.message}].`);
    }
}

export async function initializeCrazyGamesIntegration() {
    crazyGamesWorks = false;
    if (!crazyGamesIntegrationAllowed) {
        return;
    }

    const sdkLoaded = await ensureCrazyGamesSdkLoaded();
    if (!sdkLoaded || !window.CrazyGames?.SDK) {
        return;
    }

    preventDefaultMouseBehabior();
    console.log("Calling CrazyGames SDK init...");
    await window.CrazyGames.SDK.init();
    console.log("Finished awaiting CrazyGames SDK init.");
    const integrationWorks = checkCrazyGamesIntegration();
    if (integrationWorks) {
        crazyGamesWorks = true;
        console.log("CrazyGames integration initialized.");
    }
}

function preventDefaultMouseBehabior() {
    window.addEventListener("wheel", (event) => event.preventDefault(), {
        passive: false,
    });
    window.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
            event.preventDefault();
        }
    });
}

export function checkCrazyGamesIntegration() {
    if (!crazyGamesIntegrationAllowed) {
        return false;
    }
    console.log(`Environment: ${window.CrazyGames?.SDK?.environment}`);
    if (window.CrazyGames?.SDK?.environment === 'disabled') {
        console.warn('CrazyGames SDK is disabled on this domain.');
        crazyGamesWorks = false;
        return false;
    }

    if (window.CrazyGames && window.CrazyGames.SDK) {
        console.log("CrazyGames SDK loaded (v3)");
        return true;
    } else {
        console.log("CrazyGames SDK not found");
        return false;
    }
}