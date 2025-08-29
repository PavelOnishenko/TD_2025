import Game from './Game.js';
import { bindUI } from './ui.js';

let crazyGamesWorks = false;
(async () => {
  try {
    const env = await window.CrazyGames.SDK.getEnvironment();
    crazyGamesWorks = (env === 'local' || env === 'crazygames');
  } catch(e) {
    console.log(`error while checking crazy games SDK status: [${e}].`);
  }
})();

function callCrazyGamesEvent(fnName){
  if (!crazyGamesWorks) return;
  try { window.CrazyGames.SDK.game[fnName](); } 
  catch(e) {
    console.log(`error while calling [${fnName}] event: [${e}].`);
   }
}

callCrazyGamesEvent('sdkGameLoadingStart');

const canvas = document.getElementById('game');
const game = new Game(canvas);
bindUI(game);

InitializeForCrazyGames();

callCrazyGamesEvent('sdkGameLoadingStop');

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

