import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from '../systems/crazyGamesIntegration.js';
import { createGameAudio } from '../systems/audio.js';
import { createExplosion, updateExplosions, updateColorSwitchBursts } from '../systems/effects.js';
import { saveBestScore } from '../systems/dataStore.js';
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
        this.colorSwitchBursts = [];
        this.mergeAnimations = [];
        this.projectileSpeed = 800;
        this.projectileRadius = 6;
        this.maxProjectileRadius = this.projectileRadius;
        this.projectileSpawnInterval = 500;
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.hasStarted = false;
        this.isRestoringState = false;
        this.persistenceEnabled = true;
        this.mergeHintPairs = [];
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

    getCurrentScore() {
        const current = Number.isFinite(this.score) ? this.score : 0;
        if (current < 0) {
            this.score = 0;
            return 0;
        }
        return current;
    }

    addScore(amount) {
        return this.changeScore(amount);
    }

    changeScore(amount) {
        const delta = Number.isFinite(amount) ? amount : 0;
        if (!Number.isFinite(delta) || delta === 0) {
            return this.getCurrentScore();
        }
        const current = this.getCurrentScore();
        const next = Math.max(0, Math.floor(current + delta));
        this.score = next;
        const best = Number.isFinite(this.bestScore) ? this.bestScore : 0;
        if (next > best) {
            this.bestScore = next;
            saveBestScore(next);
        }
        return next;
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
        this.updateMergeAnimations(dt);
        updateExplosions(this.explosions, dt);
        updateColorSwitchBursts(this.colorSwitchBursts, dt);
        this.grid.fadeHighlights(dt);
        this.grid.fadeMergeHints(dt);
        this.updateMergeHints();
        this.checkWaveCompletion();
        this.updateScreenShake(dt);
        draw(this);
        if (!this.gameOver) {
            requestAnimationFrame(this.update);
        }
    }

    startTowerMergeAnimation(targetTower, consumedTower) {
        if (!targetTower || !consumedTower) {
            return;
        }

        if (typeof targetTower.triggerMergePulse === 'function') {
            targetTower.triggerMergePulse();
        }

        const duration = 0.48;
        const startPosition = { x: consumedTower.x, y: consumedTower.y };
        const endPosition = { x: targetTower.x, y: targetTower.y };
        const startCenter = consumedTower.center();
        const endCenter = targetTower.center();
        const color = targetTower.color ?? 'red';
        const fromLevel = Math.max(1, consumedTower.level ?? 1);
        const colorKey = (color[0] ?? 'r').toLowerCase();
        const spriteKey = `tower_${fromLevel}${colorKey}`;
        const width = consumedTower.w ?? targetTower.w ?? 0;
        const height = consumedTower.h ?? targetTower.h ?? 0;
        const maxDimension = Math.max(width, height);

        const animation = {
            elapsed: 0,
            duration,
            start: startPosition,
            end: endPosition,
            startCenter,
            endCenter,
            width,
            height,
            color,
            spriteKey,
            targetTower,
            orbRadius: maxDimension * 0.26,
            trailWidth: maxDimension * 0.24,
            explosionTriggered: false,
        };

        if (!Array.isArray(this.mergeAnimations)) {
            this.mergeAnimations = [];
        }
        this.mergeAnimations.push(animation);
    }

    updateMergeAnimations(dt) {
        if (!Array.isArray(this.mergeAnimations) || this.mergeAnimations.length === 0) {
            return;
        }

        for (let i = this.mergeAnimations.length - 1; i >= 0; i--) {
            const animation = this.mergeAnimations[i];
            animation.elapsed = (animation.elapsed ?? 0) + dt;

            if (!animation.explosionTriggered && animation.elapsed >= animation.duration * 0.85) {
                this.triggerMergeExplosion(animation);
            }

            if (animation.elapsed >= animation.duration) {
                this.mergeAnimations.splice(i, 1);
            }
        }
    }

    triggerMergeExplosion(animation) {
        if (!animation || animation.explosionTriggered) {
            return;
        }

        animation.explosionTriggered = true;
        const targetTower = animation.targetTower;
        if (!targetTower || typeof targetTower.center !== 'function') {
            return;
        }

        const center = targetTower.center();
        const yOffset = (targetTower.h ?? 0) * 0.1;
        const explosion = createExplosion(center.x, center.y - yOffset, {
            color: animation.color,
            variant: 'merge'
        });
        this.explosions.push(explosion);
        if (this.audio) {
            if (typeof this.audio.playMerge === 'function') {
                this.audio.playMerge();
            } else if (typeof this.audio.playExplosion === 'function') {
                this.audio.playExplosion();
            }
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
