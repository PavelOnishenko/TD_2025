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
    await window.CrazyGames.SDK.init();

    window.addEventListener("wheel", (event) => event.preventDefault(), {
        passive: false,
    });
    window.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
            event.preventDefault();
        }
    });

    const integrationWorks = checkCrazyGamesIntegration();
    if (integrationWorks) {
        crazyGamesWorks = true;
        console.log("CrazyGames integration initialized.");
    } 
}

export function checkCrazyGamesIntegration() {
    if (window.CrazyGames && window.CrazyGames.SDK) {
        console.log("CrazyGames SDK loaded (v3)");
        return true;
    } else {
        console.log("CrazyGames SDK not found");
        return false;
    }
}