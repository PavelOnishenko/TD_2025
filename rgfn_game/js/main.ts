import Game from './Game.js';


function initializeHudWindows(): void {
    const overlay = document.getElementById('hud-windows-overlay');
    const openButtons = [
        { triggerId: 'open-stats-window', windowId: 'stats-window' },
        { triggerId: 'open-skills-window', windowId: 'skills-window' },
        { triggerId: 'open-inventory-window', windowId: 'inventory-window' },
    ];

    const closeAll = (): void => {
        openButtons.forEach(({ windowId }) => {
            const panel = document.getElementById(windowId);
            if (panel) {
                panel.classList.add('hidden');
                panel.setAttribute('aria-hidden', 'true');
            }
        });
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
        }
    };

    openButtons.forEach(({ triggerId, windowId }) => {
        const trigger = document.getElementById(triggerId);
        const panel = document.getElementById(windowId);

        trigger?.addEventListener('click', () => {
            closeAll();
            panel?.classList.remove('hidden');
            panel?.setAttribute('aria-hidden', 'false');
            overlay?.classList.remove('hidden');
            overlay?.setAttribute('aria-hidden', 'false');
        });
    });

    document.querySelectorAll<HTMLElement>('[data-window-close]').forEach((button) => {
        button.addEventListener('click', closeAll);
    });

    overlay?.addEventListener('click', closeAll);
}

window.addEventListener('load', (): void => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

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

    initializeHudWindows();

    console.log('RGFN - Turn-Based RPG started!');
    console.log('Use Arrow Keys or WASD to move on the world map');
    console.log('Random encounters will trigger battles');
});
