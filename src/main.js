import Game from './Game.js';
import { bindUI } from './ui.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
bindUI(game);
game.run();
