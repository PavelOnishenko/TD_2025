import Game from './Game.js';
import AnimationDebugPlayer from './debug/AnimationDebugPlayer.js';
import { resizeCanvas } from '../../engine/systems/ViewportManager.js';
import { registerBackquoteToggle } from '../../engine/systems/developerHotkeys.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;
const restartButton = document.getElementById('restart-button') as HTMLButtonElement;
const startOverlay = document.getElementById('start-overlay') as HTMLDivElement;
const pauseOverlay = document.getElementById('pause-overlay') as HTMLDivElement;
const gameoverOverlay = document.getElementById('gameover-overlay') as HTMLDivElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

let game: Game | null = null;
let animationDebugPlayer: AnimationDebugPlayer | null = null;
let debugPlayerPausedGame: boolean = false;

function initialize(): void {
    if (!canvas) {
        throw new Error('Canvas element not found');
    }

    game = new Game(canvas);
    if (gameContainer) {
        animationDebugPlayer = new AnimationDebugPlayer(gameContainer, (isVisible: boolean): void => {
            if (!game || game.gameOver) {
                return;
            }

            if (isVisible) {
                if (!game.isPaused) {
                    game.pause();
                    debugPlayerPausedGame = true;
                }
                pauseOverlay.classList.add('hidden');
                return;
            }

            if (debugPlayerPausedGame) {
                game.resume();
                debugPlayerPausedGame = false;
            }
        });
    }
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

    registerBackquoteToggle((): void => {
        animationDebugPlayer?.toggle();
    }, { target: document });

    document.addEventListener('keydown', (event: KeyboardEvent): void => {
        if (event.code === 'Escape' && game && !game.gameOver) {
            if (animationDebugPlayer?.isOpen()) {
                return;
            }
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
    debugPlayerPausedGame = false;
    game.resume();
}

function handleRestart(): void {
    if (!game || !gameoverOverlay) {
        return;
    }

    gameoverOverlay.classList.add('hidden');
    debugPlayerPausedGame = false;
    game.restart();
}

function togglePause(): void {
    if (!game || !pauseOverlay) {
        return;
    }

    if (game.isPaused) {
        pauseOverlay.classList.add('hidden');
        debugPlayerPausedGame = false;
        game.resume();
    } else {
        pauseOverlay.classList.remove('hidden');
        game.pause();
    }
}

initialize();
