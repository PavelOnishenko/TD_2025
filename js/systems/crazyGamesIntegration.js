export let crazyGamesWorks = false;

export const crazyMap = {
  sdkGameLoadingStart: "loadingStart",
  sdkGameLoadingStop: "loadingStop",
  gameplayStart: "gameplayStart",
  gameplayStop: "gameplayStop"
};

export function callCrazyGamesEvent(fnName) {
    if (!crazyGamesWorks) {
        console.log(`CrazyGames integration not working, skipping [${fnName}] event.`);
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
    preventDefaultMouseBehabior();
    await window.CrazyGames.SDK.init();
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