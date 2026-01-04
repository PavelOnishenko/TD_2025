import Game from './Game';
import { resizeCanvas } from '../../engine/systems/ViewportManager';
const canvas = document.getElementById('game-canvas');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
let game = null;
function initialize() {
    if (!canvas) {
        throw new Error('Canvas element not found');
    }
    game = new Game(canvas);
    game.onGameOver = (finalScore) => {
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = String(finalScore);
        }
        gameoverOverlay.classList.remove('hidden');
    };
    setupViewport();
    setupEventListeners();
}
function setupViewport() {
    if (!canvas || !game) {
        return;
    }
    resizeCanvas({
        canvasElement: canvas,
        gameInstance: game,
    });
    window.addEventListener('resize', () => {
        if (!canvas || !game) {
            return;
        }
        resizeCanvas({
            canvasElement: canvas,
            gameInstance: game,
        });
    });
}
function setupEventListeners() {
    if (!startButton || !resumeButton || !restartButton) {
        throw new Error('Required button elements not found');
    }
    startButton.addEventListener('click', handleStartGame);
    resumeButton.addEventListener('click', handleResume);
    restartButton.addEventListener('click', handleRestart);
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && game && !game.gameOver) {
            togglePause();
        }
    });
}
function handleStartGame() {
    if (!game || !startOverlay) {
        return;
    }
    startOverlay.classList.add('hidden');
    game.start();
}
function handleResume() {
    if (!game || !pauseOverlay) {
        return;
    }
    pauseOverlay.classList.add('hidden');
    game.resume();
}
function handleRestart() {
    if (!game || !gameoverOverlay) {
        return;
    }
    gameoverOverlay.classList.add('hidden');
    game.restart();
}
function togglePause() {
    if (!game || !pauseOverlay) {
        return;
    }
    if (game.isPaused) {
        pauseOverlay.classList.add('hidden');
        game.resume();
    }
    else {
        pauseOverlay.classList.remove('hidden');
        game.pause();
    }
}
initialize();
//# sourceMappingURL=main.js.map