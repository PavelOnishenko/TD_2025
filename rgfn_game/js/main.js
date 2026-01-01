import Game from './Game.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Create and start game
    const game = new Game(canvas);
    game.start();

    console.log('RGFN - Turn-Based RPG started!');
    console.log('Use Arrow Keys or WASD to move on the world map');
    console.log('Random encounters will trigger battles');
});
