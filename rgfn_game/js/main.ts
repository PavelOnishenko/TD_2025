import Game from './Game.js';
import { initializeGameRandomProvider } from './utils/RandomProvider.js';

window.addEventListener('load', (): void => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }


    initializeGameRandomProvider();

    // Create and start game
    const game = new Game(canvas);
    game.start();

    console.log('RGFN - Turn-Based RPG started!');
    console.log('Use Arrow Keys or WASD to move on the world map (hold two directions for diagonal travel)');
    console.log('Use + / - to zoom the map, and I / J / K / L or the on-screen buttons to pan it.');
    console.log('Press Space (or the World Map panel button) while standing on a village tile to enter it again.');
    console.log('Random encounters will trigger battles');
});
