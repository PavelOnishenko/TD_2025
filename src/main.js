import Game from './Game.js';
import { bindUI } from './ui.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
bindUI(game);

InitializeForCrazyGames();

game.run();
function InitializeForCrazyGames() {
    window.addEventListener("wheel", (event) => event.preventDefault(), {
        passive: false,
    });
    window.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
            event.preventDefault();
        }
    });
}

