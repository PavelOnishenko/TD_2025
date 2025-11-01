import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from '../systems/crazyGamesIntegration.js';
import { createGameAudio, getHowler } from '../systems/audio.js';
import { createExplosion, updateExplosions, updateColorSwitchBursts } from '../systems/effects.js';
import { saveBestScore } from '../systems/dataStore.js';
import { refreshDiagnosticsOverlay, updateHUD } from '../systems/ui.js';
import GameGrid from './gameGrid.js';
import { createPlatforms } from './platforms.js';
import { createStarfield, resizeStarfield, updateStarfield as stepStarfield } from './starfield.js';
import projectileManagement from './game/projectileManagement.js';
import tankSchedule from './game/tankSchedule.js';
import world from './game/world.js';
import statePersistence from './game/statePersistence.js';
import stateSetup from './game/stateSetup.js';
import createFormationManager from './game/formations.js';
import gameConfig from '../config/gameConfig.js';

function createScreenShakeState() {
    const { frequency } = gameConfig.world.screenShake;
    return {
        duration: 0,
        elapsed: 0,
        intensity: 0,
        frequency,
        seedX: Math.random() * Math.PI * 2,
        seedY: Math.random() * Math.PI * 2,
    };
}

function createBaseHitFlashState() {
    return {
        active: false,
        elapsed: 0,
        duration: 0,
        strength: 0,
        color: 'default',
        impactX: null,
        impactY: null,
    };
}

class Game {
    constructor(canvas, options = {}) {
        const {
            width = gameConfig.world.logicalSize.width,
            height = gameConfig.world.logicalSize.height,
            assets = null,
        } = options;
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
        this.energyPopups = [];
        this.projectileSpeed = gameConfig.projectiles.speed;
        this.projectileRadius = gameConfig.projectiles.baseRadius;
        this.maxProjectileRadius = this.projectileRadius;
        this.projectileSpawnInterval = gameConfig.projectiles.spawnInterval;
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.hasStarted = false;
        this.isRestoringState = false;
        this.persistenceEnabled = true;
        this.mergeHintPairs = [];
        this.screenShake = createScreenShakeState();
        this.baseHitFlash = createBaseHitFlashState();
        this.audioMuted = false;
        this.musicEnabled = true;
        this.musicPausedByFocus = false;
        this.isPaused = false;
        this.pauseReason = null;
        this.pauseListeners = new Set();
        this.waveAdState = this.createWaveAdState();
        this.endlessModeActive = false;
        this.endlessWaveStart = 0;
        this.diagnosticsOverlay = null;
        this.diagnosticsState = { visible: false, fps: 0, lastCommit: 0 };
        this.formationManager = createFormationManager(gameConfig.waves?.formations ?? {});
        this.activeFormationPlan = null;
        this.waveSpawnSchedule = null;
        this.waveSpawnCursor = 0;
        this.waveElapsed = 0;
    }

    setupEnvironment() {
        const baseConfig = gameConfig.world.base;
        this.base = {
            x: baseConfig.x,
            y: this.logicalH - baseConfig.bottomOffset,
            w: baseConfig.width,
            h: baseConfig.height,
        };
        this.platforms = createPlatforms({
            width: this.logicalW,
            height: this.logicalH,
            platformConfigs: gameConfig.world.platforms,
        });
        this.grid = new GameGrid(gameConfig.world.grid);
        this.topCells = this.grid.topCells;
        this.bottomCells = this.grid.bottomCells;
        this.worldBounds = this.computeWorldBounds();
        const { width: starfieldWidth, height: starfieldHeight } = this.getStarfieldDimensions();
        this.starfield = createStarfield(starfieldWidth, starfieldHeight);
    }

    configureAssets(assets) {
        this._assets = null;
        this.audio = createGameAudio();
        this.applyAudioPreferences();
        if (!assets) {
            return;
        }
        this.assets = assets;
    }

    createWaveAdState() {
        return {
            shownWaves: new Set(),
            pendingWave: null,
            retryHandle: null,
        };
    }

    getWaveAdState() {
        if (!this.waveAdState) {
            this.waveAdState = this.createWaveAdState();
        }
        return this.waveAdState;
    }

    resetWaveAdState() {
        const state = this.getWaveAdState();
        const host = typeof window !== 'undefined' ? window : globalThis;
        if (state.retryHandle && typeof host?.clearTimeout === 'function') {
            host.clearTimeout(state.retryHandle);
        }
        state.retryHandle = null;
        state.pendingWave = null;
        state.shownWaves.clear();
    }

    ensureEndlessWaveTracking() {
        if (this.endlessWaveStart) {
            return;
        }
        const configuredMax = Number.isFinite(this.maxWaves)
            ? this.maxWaves
            : Number.isFinite(gameConfig.player?.maxWaves)
                ? gameConfig.player.maxWaves
                : 0;
        this.endlessWaveStart = configuredMax + 1;
    }

    activateEndlessMode() {
        this.ensureEndlessWaveTracking();
        this.endlessModeActive = true;
    }

    isEndlessWave(waveNumber = this.wave) {
        this.ensureEndlessWaveTracking();
        if (!Number.isFinite(waveNumber)) {
            return false;
        }
        return waveNumber >= this.endlessWaveStart;
    }

    getOrCreateWaveConfig(waveNumber) {
        this.ensureEndlessWaveTracking();
        const targetWave = Math.max(1, Math.floor(waveNumber));
        const index = targetWave - 1;
        if (index < this.waveConfigs.length) {
            return this.waveConfigs[index];
        }

        const endless = gameConfig.waves?.endless ?? {};
        const intervalFactor = Number.isFinite(endless.intervalFactor) ? endless.intervalFactor : 0.95;
        const minInterval = Number.isFinite(endless.minInterval) ? endless.minInterval : 0.4;
        const cyclesIncrement = Number.isFinite(endless.cyclesIncrement) ? endless.cyclesIncrement : 3;
        const tanksIncrement = Number.isFinite(endless.tanksIncrement) ? endless.tanksIncrement : 2;

        let previous = this.waveConfigs.at(-1) ?? { interval: 1, cycles: 30, tanksCount: 0 };
        for (let wave = this.waveConfigs.length + 1; wave <= targetWave; wave += 1) {
            const nextInterval = Math.max(minInterval, Number((previous.interval * intervalFactor).toFixed(3)));
            const nextCycles = Math.max(1, Math.round(previous.cycles + cyclesIncrement));
            const nextTanks = Math.max(0, Math.round(previous.tanksCount + tanksIncrement));
            const nextConfig = { interval: nextInterval, cycles: nextCycles, tanksCount: nextTanks };
            this.waveConfigs.push(nextConfig);
            previous = nextConfig;
        }

        return this.waveConfigs[index];
    }

    getEnemyHpForWave(waveNumber) {
        const targetWave = Math.max(1, Math.floor(waveNumber));
        const index = targetWave - 1;
        if (index < this.enemyHpPerWave.length) {
            return this.enemyHpPerWave[index];
        }

        const endless = gameConfig.waves?.endless ?? {};
        const hpGrowth = Number.isFinite(endless.hpGrowth) ? endless.hpGrowth : 1.15;
        let previousHp = this.enemyHpPerWave.at(-1) ?? 1;
        for (let wave = this.enemyHpPerWave.length + 1; wave <= targetWave; wave += 1) {
            previousHp = Math.max(1, Math.round(previousHp * hpGrowth));
            this.enemyHpPerWave.push(previousHp);
        }

        return this.enemyHpPerWave[index];
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
        const sounds = value?.sounds ?? null;
        this.audio = sounds ? createGameAudio(sounds) : createGameAudio();
        this.applyAudioPreferences();
    }

    addPauseListener(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.pauseListeners.add(listener);
        return () => {
            this.pauseListeners.delete(listener);
        };
    }

    emitPauseState(paused, reason) {
        if (!this.pauseListeners || this.pauseListeners.size === 0) {
            return;
        }
        for (const listener of this.pauseListeners) {
            try {
                listener(paused, reason);
            } catch (error) {
                console.warn('Pause listener failed', error);
            }
        }
    }

    pause(reason = 'manual') {
        if (this.gameOver) {
            return false;
        }
        const wasPaused = this.isPaused;
        const previousReason = this.pauseReason;
        this.isPaused = true;
        this.pauseReason = reason;
        if (typeof this.audio?.stopMusic === 'function') {
            this.audio.stopMusic();
        }
        if (!wasPaused || previousReason !== reason) {
            this.emitPauseState(true, reason);
        }
        return !wasPaused || previousReason !== reason;
    }

    resume(options = {}) {
        const { expectedReason = null, force = false, reason = null } = options;
        const wasPaused = this.isPaused;
        const previousReason = this.pauseReason;
        if (!wasPaused) {
            if (force) {
                this.pauseReason = null;
                this.emitPauseState(false, reason ?? expectedReason ?? previousReason ?? 'manual');
            }
            return false;
        }
        if (!force && expectedReason && previousReason !== expectedReason) {
            return false;
        }
        this.isPaused = false;
        this.pauseReason = null;
        this.emitPauseState(false, reason ?? expectedReason ?? previousReason ?? 'manual');
        if (this.hasStarted && !this.gameOver) {
            this.playMusicIfAllowed();
        }
        return true;
    }

    togglePause() {
        if (this.isPaused) {
            if (this.pauseReason === 'ad') {
                return false;
            }
            return this.resume();
        }
        return this.pause();
    }

    pauseForAd() {
        return this.pause('ad');
    }

    resumeAfterAd() {
        return this.resume({ expectedReason: 'ad', reason: 'ad' });
    }

    getTowerAt(cell) {
        return cell?.tower ?? null;
    }

    update(timestamp) {
        if (this.gameOver) {
            refreshDiagnosticsOverlay(this, { dt: 0, timestamp });
            return;
        }
        if (this.isPaused) {
            refreshDiagnosticsOverlay(this, { dt: 0, timestamp });
            this.lastTime = timestamp;
            requestAnimationFrame(this.update);
            return;
        }
        const dt = this.calcDelta(timestamp);
        this.tickStarfield(dt);
        const towersPendingRemoval = [];
        for (const tower of this.towers) {
            tower.update(dt);
            if (typeof tower.shouldTriggerRemoval === 'function' && tower.shouldTriggerRemoval()) {
                towersPendingRemoval.push(tower);
            }
        }
        if (towersPendingRemoval.length > 0) {
            towersPendingRemoval.forEach(tower => {
                this.removeTower(tower, { cause: 'long-press' });
            });
        }
        this.spawnEnemiesIfNeeded(dt);
        this.updateEnemies(dt);
        this.towerAttacks(timestamp);
        moveProjectiles(this, dt);
        handleProjectileHits(this);
        this.updateMergeAnimations(dt);
        updateExplosions(this.explosions, dt);
        updateColorSwitchBursts(this.colorSwitchBursts, dt);
        this.updateEnergyPopups(dt);
        this.grid.fadeHighlights(dt);
        this.grid.fadeMergeHints(dt);
        this.updateMergeHints();
        this.checkWaveCompletion();
        this.updateScreenShake(dt);
        this.updateBaseHitFlash(dt);
        draw(this);
        refreshDiagnosticsOverlay(this, { dt, timestamp });
        if (!this.gameOver) {
            requestAnimationFrame(this.update);
        }
    }

    getStarfieldDimensions() {
        const canvas = this.ctx?.canvas;
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            return { width: canvas.width, height: canvas.height };
        }
        return { width: Math.max(1, this.logicalW), height: Math.max(1, this.logicalH) };
    }

    ensureStarfield() {
        if (!this.starfield) {
            const { width, height } = this.getStarfieldDimensions();
            this.starfield = createStarfield(width, height);
        }
        return this.starfield;
    }

    syncStarfieldDimensions(starfield = this.starfield) {
        if (!starfield) {
            return;
        }
        const { width, height } = this.getStarfieldDimensions();
        const currentWidth = starfield.width ?? 0;
        const currentHeight = starfield.height ?? 0;
        if (Math.abs(currentWidth - width) > 0.5 || Math.abs(currentHeight - height) > 0.5) {
            resizeStarfield(starfield, width, height);
        }
    }

    updateViewport(viewport) {
        this.viewport = viewport;
        this.syncStarfieldDimensions();
    }

    tickStarfield(dt) {
        const starfield = this.ensureStarfield();
        this.syncStarfieldDimensions(starfield);
        stepStarfield(starfield, dt);
    }

    removeTower(tower, options = {}) {
        if (!tower) {
            return false;
        }

        const index = this.towers.indexOf(tower);
        if (index === -1) {
            return false;
        }

        this.towers.splice(index, 1);

        if (tower.cell) {
            tower.cell.occupied = false;
            tower.cell.tower = null;
            tower.cell = null;
        }

        if (typeof tower.acknowledgeRemoval === 'function') {
            tower.acknowledgeRemoval();
        }

        if (Array.isArray(this.mergeAnimations) && this.mergeAnimations.length > 0) {
            this.mergeAnimations = this.mergeAnimations.filter(animation => animation?.targetTower !== tower);
        }

        const center = typeof tower.center === 'function'
            ? tower.center()
            : {
                x: (tower.x ?? 0) + (tower.w ?? 0) / 2,
                y: (tower.y ?? 0) + (tower.h ?? 0) / 2,
            };
        const yOffset = (tower.h ?? 0) * 0.18;
        const explosion = createExplosion(center.x, center.y - yOffset, {
            color: tower.color ?? 'default',
            variant: 'dismantle',
        });

        if (explosion) {
            if (!Array.isArray(this.explosions)) {
                this.explosions = [];
            }
            this.explosions.push(explosion);
        }

        const playAudio = options?.silent !== true;
        if (playAudio && this.audio) {
            if (typeof this.audio.playTowerRemoveExplosion === 'function') {
                this.audio.playTowerRemoveExplosion();
            } else if (typeof this.audio.playExplosion === 'function') {
                this.audio.playExplosion();
            }
        }

        updateHUD(this);
        return true;
    }

    addEnergyPopup(text, x, y, options = {}) {
        if (!Array.isArray(this.energyPopups)) {
            this.energyPopups = [];
        }

        const duration = Math.max(0.2, Number.isFinite(options.duration) ? options.duration : 1);
        const popup = {
            text: typeof text === 'string' ? text : `${text ?? ''}`,
            startX: Number.isFinite(x) ? x : 0,
            startY: Number.isFinite(y) ? y : 0,
            elapsed: 0,
            duration,
            driftX: Number.isFinite(options.driftX) ? options.driftX : 0,
            driftY: Number.isFinite(options.driftY) ? options.driftY : -60,
            color: options.color ?? '#facc15',
            stroke: options.stroke ?? 'rgba(0,0,0,0.5)',
            font: options.font ?? '600 26px "Baloo 2", sans-serif',
        };

        this.energyPopups.push(popup);
    }

    updateEnergyPopups(dt) {
        if (!Array.isArray(this.energyPopups) || this.energyPopups.length === 0) {
            return;
        }

        for (let i = this.energyPopups.length - 1; i >= 0; i--) {
            const popup = this.energyPopups[i];
            popup.elapsed = (popup.elapsed ?? 0) + dt;
            if (popup.elapsed >= (popup.duration ?? 0.8)) {
                this.energyPopups.splice(i, 1);
            }
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

    updateBaseHitFlash(dt) {
        const flash = this.baseHitFlash;
        if (!flash || !flash.active) {
            return;
        }

        flash.elapsed = (flash.elapsed ?? 0) + dt;
        if (flash.elapsed >= (flash.duration ?? 0)) {
            flash.active = false;
            flash.strength = 0;
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

    triggerBaseHitEffects(enemy = null) {
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

        this.spawnBaseHitExplosion(enemy);
        this.activateBaseHitFlash(enemy);

        if (typeof this.audio?.playBaseHit === 'function') {
            this.audio.playBaseHit();
        }
    }

    spawnBaseHitExplosion(enemy) {
        if (!enemy) {
            return;
        }

        const width = Number.isFinite(enemy.w) ? enemy.w : 0;
        const height = Number.isFinite(enemy.h) ? enemy.h : 0;
        const baseCenterX = this.base ? this.base.x + (this.base.w ?? 0) / 2 : 0;
        const baseCenterY = this.base ? this.base.y + (this.base.h ?? 0) / 2 : 0;
        const centerX = Number.isFinite(enemy.x) ? enemy.x + width / 2 : baseCenterX;
        const centerY = Number.isFinite(enemy.y) ? enemy.y + height / 2 : baseCenterY;
        const explosion = createExplosion(centerX, centerY, {
            color: enemy.color ?? 'default',
            variant: 'match',
        });

        if (!Array.isArray(this.explosions)) {
            this.explosions = [];
        }

        this.explosions.push(explosion);
    }

    activateBaseHitFlash(enemy) {
        const base = this.base;
        if (!base) {
            return;
        }

        if (!this.baseHitFlash) {
            this.baseHitFlash = createBaseHitFlashState();
        }

        const flash = this.baseHitFlash;
        const baseRight = base.x + (base.w ?? 0);
        const baseBottom = base.y + (base.h ?? 0);
        const defaultImpactX = base.x + (base.w ?? 0) * 0.2;
        const defaultImpactY = base.y + (base.h ?? 0) * 0.5;

        let impactX = defaultImpactX;
        let impactY = defaultImpactY;

        if (enemy) {
            const enemyFrontX = Number.isFinite(enemy.x)
                ? enemy.x + (Number.isFinite(enemy.w) ? enemy.w : 0)
                : defaultImpactX;
            const enemyCenterY = Number.isFinite(enemy.y)
                ? enemy.y + (Number.isFinite(enemy.h) ? enemy.h : 0) / 2
                : defaultImpactY;
            impactX = Math.min(Math.max(enemyFrontX, base.x), baseRight);
            impactY = Math.min(Math.max(enemyCenterY, base.y), baseBottom);
        }

        flash.color = enemy?.color ?? 'default';
        flash.impactX = impactX;
        flash.impactY = impactY;
        flash.duration = 0.45;
        flash.elapsed = 0;
        flash.active = true;
        const previousStrength = Number.isFinite(flash.strength) ? flash.strength : 0;
        flash.strength = Math.min(1.35, previousStrength * 0.45 + 1);
    }

    restart() {
        this.resume({ force: true, reason: 'system' });
        const wasGameOver = this.gameOver;
        this.resetState();
        this.playMusicIfAllowed();
        if (wasGameOver) {
            this.lastTime = performance.now();
            requestAnimationFrame(this.update);
        }
        callCrazyGamesEvent('gameplayStart');
    }

    run() {
        this.hasStarted = true;
        this.resume({ force: true, reason: 'system' });
        callCrazyGamesEvent('gameplayStart');
        this.playMusicIfAllowed();
        this.elapsedTime = 0;
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }

    setAudioMuted(muted) {
        this.audioMuted = Boolean(muted);
        const howler = getHowler();
        if (howler && typeof howler.mute === 'function') {
            howler.mute(this.audioMuted);
        }
        if (this.audioMuted && typeof this.audio?.stopMusic === 'function') {
            this.audio.stopMusic();
        }
        if (!this.audioMuted) {
            this.playMusicIfAllowed();
        }
    }

    setMusicEnabled(enabled) {
        this.musicEnabled = Boolean(enabled);
        if (!this.musicEnabled && typeof this.audio?.stopMusic === 'function') {
            this.audio.stopMusic();
        }
        if (this.musicEnabled) {
            this.playMusicIfAllowed();
        }
    }

    playMusicIfAllowed() {
        if (!this.musicEnabled || this.audioMuted) {
            return;
        }
        if (!this.shouldPlayMusic()) {
            return;
        }
        if (typeof this.audio?.playMusic === 'function') {
            this.audio.playMusic();
        }
    }

    shouldPlayMusic() {
        return Boolean(this.hasStarted && !this.gameOver);
    }

    applyAudioPreferences() {
        this.setAudioMuted(this.audioMuted);
        this.setMusicEnabled(this.musicEnabled);
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
