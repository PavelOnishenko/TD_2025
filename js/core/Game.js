import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from '../systems/crazyGamesIntegration.js';
import { createGameAudio } from '../systems/audio.js';
import { updateExplosions } from '../systems/effects.js';
import GameGrid from './gameGrid.js';
import { createPlatforms } from './platforms.js';
import projectileManagement from './game/projectileManagement.js';
import tankSchedule from './game/tankSchedule.js';
import world from './game/world.js';
import statePersistence from './game/statePersistence.js';
import stateSetup from './game/stateSetup.js';

function createScreenShakeState() {
    return {
        duration: 0,
        elapsed: 0,
        intensity: 0,
        frequency: 42,
        seedX: Math.random() * Math.PI * 2,
        seedY: Math.random() * Math.PI * 2,
    };
}

class Game {
    constructor(canvas, options = {}) {
        const { width = 540, height = 960, assets = null } = options;
        this.setupCanvas(canvas, width, height);
        this.setupCollections();
        this.setupEnvironment();
        this.initStats();
        this.configureAssets(assets);
        this.update = this.update.bind(this);
        this.restoreSavedState();
    }

    setupCanvas(canvas, width, height) {
        this.canvas = canvas;
        this.logicalW = width;
        this.logicalH = height;
        this.ctx = canvas.getContext('2d');
        this.viewport = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };
    }

    setupCollections() {
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.explosions = [];
        this.projectileSpeed = 800;
        this.projectileRadius = 6;
        this.maxProjectileRadius = this.projectileRadius;
        this.projectileSpawnInterval = 500;
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.hasStarted = false;
        this.isRestoringState = false;
        this.persistenceEnabled = true;
        this.screenShake = createScreenShakeState();
    }

    setupEnvironment() {
        this.base = { x: 1100, y: this.logicalH - 60, w: 40, h: 40 };
        this.platforms = createPlatforms({ width: this.logicalW, height: this.logicalH });
        this.grid = new GameGrid();
        this.topCells = this.grid.topCells;
        this.bottomCells = this.grid.bottomCells;
        this.worldBounds = this.computeWorldBounds();
    }

    configureAssets(assets) {
        this._assets = null;
        this.audio = createGameAudio();
        if (!assets) {
            return;
        }
        this.assets = assets;
    }

    get assets() {
        return this._assets;
    }

    set assets(value) {
        this._assets = value;
        if (value?.sounds) {
            this.audio = createGameAudio(value.sounds);
        } else {
            this.audio = createGameAudio();
        }
    }

    getTowerAt(cell) {
        return cell?.tower ?? null;
    }

    update(timestamp) {
        if (this.gameOver) {
            return;
        }
        const dt = this.calcDelta(timestamp);
        this.towers.forEach(tower => tower.update(dt));
        this.spawnEnemiesIfNeeded(dt);
        this.updateEnemies(dt);
        this.towerAttacks(timestamp);
        moveProjectiles(this, dt);
        handleProjectileHits(this);
        updateExplosions(this.explosions, dt);
        this.grid.fadeHighlights(dt);
        this.checkWaveCompletion();
        this.updateScreenShake(dt);
        draw(this);
        if (!this.gameOver) {
            requestAnimationFrame(this.update);
        }
    }

    updateScreenShake(dt) {
        const shake = this.screenShake;
        if (!shake || shake.duration <= 0) {
            return;
        }

        shake.elapsed = Math.min(shake.elapsed + dt, shake.duration);
        if (shake.elapsed >= shake.duration) {
            this.resetScreenShake();
        }
    }

    resetScreenShake() {
        const shake = this.screenShake ?? createScreenShakeState();
        shake.duration = 0;
        shake.elapsed = 0;
        shake.intensity = 0;
        shake.frequency = 42;
        shake.seedX = Math.random() * Math.PI * 2;
        shake.seedY = Math.random() * Math.PI * 2;
        this.screenShake = shake;
    }

    triggerBaseHitEffects() {
        if (!this.screenShake) {
            this.screenShake = createScreenShakeState();
        }

        const shake = this.screenShake;
        const baseDuration = 0.4;
        const baseIntensity = 18;
        shake.duration = baseDuration;
        shake.elapsed = 0;
        const stackedIntensity = Math.min(30, (shake.intensity ?? 0) * 0.35 + baseIntensity);
        shake.intensity = stackedIntensity;
        shake.frequency = 44;
        shake.seedX = Math.random() * Math.PI * 2;
        shake.seedY = Math.random() * Math.PI * 2;

        if (typeof this.audio?.playBaseHit === 'function') {
            this.audio.playBaseHit();
        }
    }

    restart() {
        const wasGameOver = this.gameOver;
        this.resetState();
        this.audio.playMusic();
        if (wasGameOver) {
            this.lastTime = performance.now();
            requestAnimationFrame(this.update);
        }
        callCrazyGamesEvent('gameplayStart');
    }

    run() {
        this.hasStarted = true;
        callCrazyGamesEvent('gameplayStart');
        this.audio.playMusic();
        this.elapsedTime = 0;
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }
}

Object.assign(
    Game.prototype,
    projectileManagement,
    tankSchedule,
    world,
    statePersistence,
    stateSetup,
    enemyActions,
    waveActions,
);

export default Game;
