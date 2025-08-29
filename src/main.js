import { callCrazyGamesEvent, checkCrazyGamesIntegration, initializeCrazyGamesIntegration } from './crazyGamesIntegration.js';
import Game from './Game.js';
import { bindUI } from './ui.js';

await initializeCrazyGamesIntegration();
console.log("CrazyGames integration kinda finished..");
callCrazyGamesEvent('sdkGameLoadingStart');

const canvas = document.getElementById('game');
const game = new Game(canvas);
bindUI(game);

callCrazyGamesEvent('sdkGameLoadingStop');

game.run();
