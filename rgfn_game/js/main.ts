import Game from './Game.js';

window.addEventListener('load', (): void => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const tutorialToggleBtn = document.getElementById('tutorial-toggle-btn') as HTMLButtonElement | null;
    const tutorialPanel = document.getElementById('controls') as HTMLDivElement | null;

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    if (tutorialToggleBtn && tutorialPanel) {
        tutorialToggleBtn.addEventListener('click', (): void => {
            const shouldShow = tutorialPanel.classList.contains('hidden');
            tutorialPanel.classList.toggle('hidden', !shouldShow);
            tutorialPanel.setAttribute('aria-hidden', (!shouldShow).toString());
            tutorialToggleBtn.setAttribute('aria-expanded', shouldShow.toString());
            tutorialToggleBtn.textContent = shouldShow ? 'Hide Tutorial' : 'Show Tutorial';
        });
    }


    // Create and start game
    const game = new Game(canvas);
    game.start();

    console.log('RGFN - Turn-Based RPG started!');
    console.log('Use Arrow Keys or WASD to move on the world map');
    console.log('Random encounters will trigger battles');
});
