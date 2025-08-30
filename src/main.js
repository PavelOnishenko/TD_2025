import { callCrazyGamesEvent, checkCrazyGamesIntegration, initializeCrazyGamesIntegration } from './crazyGamesIntegration.js';
import Game from './Game.js';
import { bindUI } from './ui.js';
import { loadAssets } from './assets.js';

await initializeCrazyGamesIntegration();
console.log("CrazyGames integration kinda finished..");
callCrazyGamesEvent('sdkGameLoadingStart');


const canvas = document.getElementById('game');
console.log("Canvas element:", canvas);
const assets = await loadAssets();
console.log("Assets loaded:", assets);
const game = new Game(canvas, { width: 540, height: 960, assets });
bindUI(game);

callCrazyGamesEvent('sdkGameLoadingStop');

game.run();
