import { callCrazyGamesEvent, crazyGamesIntegrationAllowed, crazyGamesWorks, initializeCrazyGamesIntegration } from './systems/crazyGamesIntegration.js';
import Game from './core/Game.js';
import { bindUI } from './systems/ui.js';
import { loadAssets } from './systems/assets.js';
import { initializeAudio } from './systems/audio.js';

function resizeCanvas() {
    if (!canvas)
        return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    const displayWidth = Math.round(viewportWidth * dpr);
    const displayHeight = Math.round(viewportHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    const scale = Math.min(displayWidth / LOGICAL_W, displayHeight / LOGICAL_H) || 1;
    const renderWidth = LOGICAL_W * scale;
    const renderHeight = LOGICAL_H * scale;
    const offsetX = (displayWidth - renderWidth) / 2;
    const offsetY = (displayHeight - renderHeight) / 2;

    const viewport = { scale, offsetX, offsetY, dpr };
    canvas.viewportTransform = viewport;
    if (game) {
        game.viewport = viewport;
    }
}

const LOGICAL_W = 540;
const LOGICAL_H = 960;

if (crazyGamesIntegrationAllowed) {
    await initializeCrazyGamesIntegration();
    let user = null;
    try {
        user = await getCrazyGamesUser();
    } catch (error) {
        console.warn("Failed to fetch CrazyGames user", error);
    }
    if (user) {
        console.log("Logged in as:", user.username);
        const userContainer = document.getElementById('crazyGamesUser');
        const usernameEl = document.getElementById('crazyGamesUsername');
        const avatarEl = document.getElementById('crazyGamesUserAvatar');
        if (usernameEl) {
            usernameEl.textContent = user.username ?? 'CrazyGames Player';
        }
        if (avatarEl) {
            if (user.profilePictureUrl) {
                avatarEl.src = user.profilePictureUrl;
                avatarEl.style.display = 'block';
            } else {
                avatarEl.style.display = 'none';
            }
        }
        if (userContainer) {
            userContainer.classList.remove('hidden');
        }
    }
    console.log("CrazyGames integration kinda finished..");
    callCrazyGamesEvent('sdkGameLoadingStart');
} else {
    console.log('CrazyGames integration disabled for this host.');
}
initializeAudio();
const canvas = document.getElementById('game');
let game = null;
const assets = await loadAssets();
game = new Game(canvas, { width: LOGICAL_W, height: LOGICAL_H, assets });
bindUI(game);
if (crazyGamesIntegrationAllowed) {
    callCrazyGamesEvent('sdkGameLoadingStop');
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

async function getCrazyGamesUser() {
    if (!crazyGamesWorks) {
        return null;
    }

    const available = window.CrazyGames?.SDK?.user?.isUserAccountAvailable;
    console.log("User account system available?", available);
    if (!available) {
        return null;
    }
    try {
        const user = await window.CrazyGames.SDK.user.getUser();
        console.log("User info:", user);
        return { username: user.username, profilePictureUrl: user.profilePictureUrl };
    } catch (error) {
        console.warn("CrazyGames SDK getUser failed", error);
        return null;
    }
}