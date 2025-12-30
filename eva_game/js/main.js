import Game from './Game.js';
import { resizeCanvas } from '../../engine/systems/ViewportManager.js';

const canvas = document.getElementById('game-canvas');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');

let game = null;

function initialize() {
    game = new Game(canvas);
    game.onGameOver = (finalScore) => {
        document.getElementById('final-score').textContent = finalScore;
        gameoverOverlay.classList.remove('hidden');
    };
    setupViewport();
    setupEventListeners();
}

function setupViewport() {
    resizeCanvas({
        canvasElement: canvas,
        gameInstance: game,
    });

    window.addEventListener('resize', () => {
        resizeCanvas({
            canvasElement: canvas,
            gameInstance: game,
        });
    });
}

function setupEventListeners() {
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
    startOverlay.classList.add('hidden');
    game.start();
}

function handleResume() {
    pauseOverlay.classList.add('hidden');
    game.resume();
}

function handleRestart() {
    gameoverOverlay.classList.add('hidden');
    game.restart();
}

function togglePause() {
    if (game.isPaused) {
        pauseOverlay.classList.add('hidden');
        game.resume();
    } else {
        pauseOverlay.classList.remove('hidden');
        game.pause();
    }
}

initialize();
