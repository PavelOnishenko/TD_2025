import Game from './Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.bindUI(game);
game.run();
