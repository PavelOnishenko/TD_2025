import Game from './Game.js';
import { resizeCanvas } from '../../engine/systems/ViewportManager.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;
const restartButton = document.getElementById('restart-button') as HTMLButtonElement;
const startOverlay = document.getElementById('start-overlay') as HTMLDivElement;
const pauseOverlay = document.getElementById('pause-overlay') as HTMLDivElement;
const gameoverOverlay = document.getElementById('gameover-overlay') as HTMLDivElement;

let game: Game | null = null;

function initialize(): void {
    if (!canvas) {
        throw new Error('Canvas element not found');
    }

    game = new Game(canvas);
    game.onGameOver = (finalScore: number): void => {
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = String(finalScore);
        }
        gameoverOverlay.classList.remove('hidden');
    };

    setupViewport();
    setupEventListeners();
}

function setupViewport(): void {
    if (!canvas || !game) {
        return;
    }

    resizeCanvas({
        canvasElement: canvas,
        gameInstance: game,
    });

    window.addEventListener('resize', (): void => {
        if (!canvas || !game) {
            return;
        }

        resizeCanvas({
            canvasElement: canvas,
            gameInstance: game,
        });
    });
}

function setupEventListeners(): void {
    if (!startButton || !resumeButton || !restartButton) {
        throw new Error('Required button elements not found');
    }

    startButton.addEventListener('click', handleStartGame);
    resumeButton.addEventListener('click', handleResume);
    restartButton.addEventListener('click', handleRestart);

    document.addEventListener('keydown', (event: KeyboardEvent): void => {
        if (event.code === 'Escape' && game && !game.gameOver) {
            togglePause();
        }
    });
}

function handleStartGame(): void {
    if (!game || !startOverlay) {
        return;
    }

    startOverlay.classList.add('hidden');
    game.start();
}

function handleResume(): void {
    if (!game || !pauseOverlay) {
        return;
    }

    pauseOverlay.classList.add('hidden');
    game.resume();
}

function handleRestart(): void {
    if (!game || !gameoverOverlay) {
        return;
    }

    gameoverOverlay.classList.add('hidden');
    game.restart();
}

function togglePause(): void {
    if (!game || !pauseOverlay) {
        return;
    }

    if (game.isPaused) {
        pauseOverlay.classList.add('hidden');
        game.resume();
    } else {
        pauseOverlay.classList.remove('hidden');
        game.pause();
    }
}

initialize();
