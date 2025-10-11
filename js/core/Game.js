import { updateHUD } from '../systems/ui.js';
import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from '../systems/crazyGamesIntegration.js';
import { createGameAudio } from '../systems/audio.js';
import { updateExplosions } from '../systems/effects.js';
import GameGrid from './gameGrid.js';
import Tower from '../entities/Tower.js';
import { clearGameState, loadGameState, saveGameState } from '../systems/dataStore.js';
import { createPlatforms } from './platforms.js';

function createProjectileVisualState() {
    const pulseOffset = Math.random() * Math.PI * 2;
    const sparkleOffset = Math.random() * Math.PI * 2;
    const jitterAngle = Math.random() * Math.PI * 2;
    return {
        time: 0,
        pulseOffset,
        sparkleOffset,
        jitterAngle,
        pulseSpeed: 8 + Math.random() * 4,
        shimmerSpeed: 6 + Math.random() * 4,
        vibrationStrength: 0.35 + Math.random() * 0.15,
    };
}

class Game {
    constructor(canvas, { width = 540, height = 960, assets = null } = {}) {
        this.canvas = canvas;
        this.logicalW = width;
        this.logicalH = height;
        this.ctx = canvas.getContext('2d');
        this.viewport = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };
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
        this.initStats();
        this.base = { x: 1100, y: this.logicalH - 60, w: 40, h: 40 };
        console.log('Base position:', this.base.x, this.base.y);
        this.platforms = createPlatforms({ width: this.logicalW, height: this.logicalH });
        this.grid = new GameGrid();
        this.topCells = this.grid.topCells;
        this.bottomCells = this.grid.bottomCells;
        this.worldBounds = this.computeWorldBounds();
        this._assets = null;
        this.audio = createGameAudio();
        if (assets) {
            this.assets = assets;
        }
        this.isRestoringState = false;
        this.persistenceEnabled = true;
        this.update = this.update.bind(this);
        this.restoreSavedState();
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

    initStats() {
        this.initialLives = 5;
        this.initialEnergy = 50;
        this.lives = this.initialLives;
        this.energy = this.initialEnergy;
        this.wave = 1;
        this.maxWaves = 10;
        this.towerCost = 12;
        this.switchCost = 4;
        this.waveInProgress = false;
        this.waveConfigs = this.getWaveConfigs();
        this.tankBurstSchedule = [];
        this.tankBurstSet = new Set();
        this.tankScheduleWave = 0;
        const cfg = this.waveConfigs[0];
        this.prepareTankScheduleForWave(cfg, 1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.enemyHpPerWave = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
        this.gameOver = false;
        this.shootingInterval = 500;
        this.colorProbStart = 0.5;
        this.colorProbEnd = 0.5;
    }

    restoreSavedState() {
        const savedState = loadGameState();
        if (!savedState || typeof savedState !== 'object') {
            return;
        }

        if (savedState.version && savedState.version !== 1) {
            return;
        }

        this.isRestoringState = true;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const toInt = (value, fallback) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.floor(num) : fallback;
        };
        const targetWave = clamp(toInt(savedState.wave, 1), 1, this.maxWaves);

        this.lives = clamp(toInt(savedState.lives, this.initialLives), 0, 99);
        const savedEnergy = savedState.energy ?? savedState.gold;
        this.energy = clamp(toInt(savedEnergy, this.initialEnergy), 0, 9999);
        this.wave = targetWave;
        this.waveInProgress = false;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.maxProjectileRadius = this.projectileRadius;

        const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.prepareTankScheduleForWave(cfg, this.wave);

        this.restoreTowers(savedState.towers);

        this.isRestoringState = false;
    }

    restoreTowers(towersState) {
        this.towers = [];
        this.grid.resetCells();
        if (!Array.isArray(towersState)) {
            return;
        }

        for (const towerState of towersState) {
            const cell = this.resolveCellFromState(towerState?.cellId);
            if (!cell) {
                continue;
            }

            const color = typeof towerState?.color === 'string' ? towerState.color : 'red';
            const level = Number(towerState?.level) || 1;
            const tower = new Tower(cell.x, cell.y, color, level);
            tower.alignToCell(cell);
            tower.cell = cell;
            tower.lastShot = 0;
            tower.flashTimer = 0;
            tower.placementFlashTimer = 0;
            cell.occupied = true;
            cell.tower = tower;
            this.towers.push(tower);
        }
    }

    resolveCellFromState(identifier) {
        if (typeof identifier !== 'string') {
            return null;
        }
        const [group, indexRaw] = identifier.split(':');
        const index = Number(indexRaw);
        if (!Number.isInteger(index) || index < 0) {
            return null;
        }
        if (group === 'top') {
            return this.topCells[index] ?? null;
        }
        if (group === 'bottom') {
            return this.bottomCells[index] ?? null;
        }
        return null;
    }

    createCellIdentifier(cell) {
        const topIndex = this.topCells.indexOf(cell);
        if (topIndex !== -1) {
            return `top:${topIndex}`;
        }
        const bottomIndex = this.bottomCells.indexOf(cell);
        if (bottomIndex !== -1) {
            return `bottom:${bottomIndex}`;
        }
        return null;
    }

    getPersistentState() {
        const towerState = this.towers
            .filter(tower => tower?.cell)
            .map(tower => ({
                cellId: this.createCellIdentifier(tower.cell),
                color: tower.color,
                level: tower.level
            }))
            .filter(entry => entry.cellId !== null);

        return {
            version: 1,
            lives: this.lives,
            energy: this.energy,
            wave: this.wave,
            towers: towerState
        };
    }

    persistState() {
        if (!this.persistenceEnabled || this.isRestoringState || this.gameOver) {
            return;
        }
        const snapshot = this.getPersistentState();
        saveGameState(snapshot);
    }

    clearSavedState() {
        clearGameState();
    }

    getWaveConfigs() {
        return [
            { interval: 1, cycles: 20, tanksCount: 0 },
            { interval: 1, cycles: 25, tanksCount: 0 },
            { interval: 1, cycles: 22, tanksCount: 2 },
            { interval: 1, cycles: 25, tanksCount: 3 },
            { interval: 1, cycles: 28, tanksCount: 4 },
            { interval: 1, cycles: 30, tanksCount: 5 },
            { interval: 1, cycles: 32, tanksCount: 6 },
            { interval: 1, cycles: 35, tanksCount: 9 },
            { interval: 1, cycles: 38, tanksCount: 11 },
            { interval: 1, cycles: 40, tanksCount: 16 }
        ];
    }

    prepareTankScheduleForWave(cfg, waveNumber) {
        if (!cfg) {
            this.tankBurstSchedule = [];
            this.tankBurstSet = new Set();
            this.tankScheduleWave = waveNumber;
            return;
        }
        this.tankBurstSchedule = this.generateTankBurstSchedule(cfg.cycles, cfg.tanksCount ?? 0);
        this.tankBurstSet = new Set(this.tankBurstSchedule);
        this.tankScheduleWave = waveNumber;
    }

    generateTankBurstSchedule(totalCycles, tanksCount) {
        const total = Math.max(0, Math.floor(totalCycles ?? 0));
        const requested = Math.max(0, Math.floor(tanksCount ?? 0));
        if (total === 0 || requested === 0) {
            return [];
        }

        const clampedCount = Math.min(requested, total);
        const positions = Array.from({ length: total }, (_, i) => i + 1);
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        const selection = positions.slice(0, clampedCount);
        selection.sort((a, b) => a - b);
        return selection;
    }

    getAllCells() {
        return this.grid.getAllCells();
    }

    getProjectileRadiusForLevel(level) {
        const baseRadius = this.projectileRadius ?? 6;
        const normalizedLevel = Math.max(1, Math.min(Number(level) || 1, 3));
        const radiusIncrease = (normalizedLevel - 1) * 2;
        return baseRadius + radiusIncrease;
    }

    spawnProjectile(angle, tower) {
        const c = tower.center();
        const previousMaxRadius = this.maxProjectileRadius ?? this.projectileRadius ?? 0;
        const radius = this.getProjectileRadiusForLevel(tower?.level);
        this.projectiles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(angle) * this.projectileSpeed,
            vy: Math.sin(angle) * this.projectileSpeed,
            color: tower.color,
            damage: tower.damage,
            anim: createProjectileVisualState(),
            radius,
        });
        this.maxProjectileRadius = Math.max(previousMaxRadius, radius);
        if (this.maxProjectileRadius !== previousMaxRadius) {
            this.worldBounds = this.computeWorldBounds();
        }
        tower.triggerFlash();
        this.audio.playFire();
    }

    switchTowerColor(tower) {
        if (this.energy < this.switchCost)
            return false;
        tower.color = tower.color === 'red' ? 'blue' : 'red';
        this.energy -= this.switchCost;
        updateHUD(this);
        return true;
    }

    calcDelta(timestamp) {
        const rawDt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Number.isFinite(rawDt) ? Math.max(0, rawDt) : 0;
        this.elapsedTime = (this.elapsedTime ?? 0) + dt;
        return dt;
    }

    computeWorldBounds() {
        const bounds = {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        };

        const expand = (x, y, w = 0, h = 0) => {
            bounds.minX = Math.min(bounds.minX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxX = Math.max(bounds.maxX, x + w);
            bounds.maxY = Math.max(bounds.maxY, y + h);
        };

        const cells = this.grid?.getAllCells?.();
        if (Array.isArray(cells)) {
            cells.forEach(cell => {
                if (cell && typeof cell.x === 'number' && typeof cell.y === 'number') {
                    expand(cell.x, cell.y, cell.w ?? 0, cell.h ?? 0);
                }
            });
        }

        if (this.base) {
            expand(this.base.x, this.base.y, this.base.w ?? 0, this.base.h ?? 0);
        }

        if (typeof this.getDefaultEnemyCoords === 'function') {
            const spawn = this.getDefaultEnemyCoords();
            if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
                expand(spawn.x, spawn.y, 0, 0);
            }
        }

        const hasFiniteBounds = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite);
        if (!hasFiniteBounds) {
            return {
                minX: 0,
                maxX: this.canvas?.width ?? this.logicalW,
                minY: 0,
                maxY: this.canvas?.height ?? this.logicalH,
            };
        }

        const effectiveRadius = Math.max(
            this.projectileRadius ?? 0,
            this.maxProjectileRadius ?? 0,
        );
        const margin = Math.max(40, effectiveRadius * 2);
        return {
            minX: bounds.minX - margin,
            maxX: bounds.maxX + margin,
            minY: bounds.minY - margin,
            maxY: bounds.maxY + margin,
        };
    }

    getTowerAt(cell) {
        return cell?.tower ?? null;
    }

    update(timestamp) {
        if (this.gameOver) return;
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
        draw(this);
        if (!this.gameOver) 
            requestAnimationFrame(this.update);
    }

    resetState() {
        this.lives = this.initialLives;
        this.energy = this.initialEnergy;
        this.wave = 1;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.maxProjectileRadius = this.projectileRadius;
        this.waveInProgress = false;
        this.nextWaveBtn.disabled = false;
        if (this.mergeBtn) {
            this.mergeBtn.disabled = false;
        }
        const cfg = this.waveConfigs[0];
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.prepareTankScheduleForWave(cfg, 1);
        this.grid.resetCells();
        this.spawned = 0;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.elapsedTime = 0;
        if (this.statusEl) {
            this.statusEl.textContent = '';
            this.statusEl.style.color = '';
        }
        if (this.endOverlay) {
            this.endOverlay.classList.add('hidden');
        }
        if (this.endMenu) {
            this.endMenu.classList.remove('win');
            this.endMenu.classList.remove('lose');
        }
        if (this.endMessageEl) {
            this.endMessageEl.textContent = '';
        }
        if (this.endDetailEl) {
            this.endDetailEl.textContent = '';
        }
        updateHUD(this);
        this.persistState();
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

Object.assign(Game.prototype, enemyActions, waveActions);

export default Game;
