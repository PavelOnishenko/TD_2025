import { callCrazyGamesEvent, checkCrazyGamesIntegration, initializeCrazyGamesIntegration } from './systems/crazyGamesIntegration.js';
import Game from './core/Game.js';
import { bindUI } from './systems/ui.js';
import { loadAssets } from './systems/assets.js';
import { initializeAudio } from './systems/audio.js';

function resizeCanvas() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = 9 / 16;
    let targetW, targetH;
    if (vw / vh > aspect) {
        targetH = vh;
        targetW = vh * aspect;
    } else {
        targetW = vw;
        targetH = vw / aspect;
    }
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;

    canvas.width = LOGICAL_W;
    canvas.height = LOGICAL_H;
}

const LOGICAL_W = 540;
const LOGICAL_H = 960;
await initializeCrazyGamesIntegration();
const user = await getCrazyGamesUser();
if (user) {
    console.log("Logged in as:", user.username);
}
console.log("CrazyGames integration kinda finished..");
callCrazyGamesEvent('sdkGameLoadingStart');
initializeAudio();
const canvas = document.getElementById('game');
const assets = await loadAssets();
const game = new Game(canvas, { width: LOGICAL_W, height: LOGICAL_H, assets });
bindUI(game);
callCrazyGamesEvent('sdkGameLoadingStop');
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

async function getCrazyGamesUser() {
    const available = window.CrazyGames?.SDK?.user?.isUserAccountAvailable;
    console.log("User account system available?", available);
    if (available) {
        const user = await window.CrazyGames.SDK.user.getUser();
        console.log("User info:", user);
        return { username: user.username, profilePictureUrl: user.profilePictureUrl };
    }
    return Promise.reject();
}