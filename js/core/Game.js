import { updateHUD, updateSwitchIndicator } from '../systems/ui.js';
import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from '../systems/crazyGamesIntegration.js';
import { createGameAudio } from '../systems/audio.js';
import { updateExplosions } from '../systems/effects.js';
import GameGrid from './gameGrid.js';

class Game {
    constructor(canvas, { width = 540, height = 960, assets = null } = {}) {
        this.canvas = canvas;
        this.logicalW = width;
        this.logicalH = height;
        this.ctx = canvas.getContext('2d');
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.explosions = [];
        this.projectileSpeed = 800;
        this.projectileRadius = 6;
        this.projectileSpawnInterval = 500;
        this.lastTime = 0;
        this.hasStarted = false;
        this.initStats();
        this.base = { x: this.logicalW, y: this.logicalH - 60, w: 40, h: 40 };
        this.grid = new GameGrid();
        this.topCells = this.grid.topCells;
        this.bottomCells = this.grid.bottomCells;
        this._assets = null;
        this.audio = createGameAudio();
        if (assets) {
            this.assets = assets;
        }
        this.update = this.update.bind(this);
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
        this.initialGold = 50;
        this.lives = this.initialLives;
        this.gold = this.initialGold;
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
        this.switchCooldownDuration = 0.5;
        this.switchCooldown = 0;
        this.colorProbStart = 0.5;
        this.colorProbEnd = 0.5;
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

    spawnProjectile(angle, tower) {
        const c = tower.center();
        this.projectiles.push({
            x: c.x, y: c.y, vx: Math.cos(angle) * this.projectileSpeed, vy: Math.sin(angle) * this.projectileSpeed, color: tower.color, damage: tower.damage
        });
        tower.triggerFlash();
        this.audio.playFire();
    }

    switchTowerColor(tower) {
        if (this.switchCooldown > 0 || this.gold < this.switchCost) 
            return false;
        tower.color = tower.color === 'red' ? 'blue' : 'red';
        this.gold -= this.switchCost;
        updateHUD(this);
        this.switchCooldown = this.switchCooldownDuration;
        updateSwitchIndicator(this);
        return true;
    }

    calcDelta(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        return dt;
    }

    getTowerAt(cell) {
        return cell?.tower ?? null;
    }

    update(timestamp) {
        if (this.gameOver) return;
        const dt = this.calcDelta(timestamp);
        this.updateSwitchCooldown(dt);
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

    updateSwitchCooldown(dt) {
        if (this.switchCooldown > 0) {
            this.switchCooldown = Math.max(0, this.switchCooldown - dt);
            updateSwitchIndicator(this);
        }
    }

    resetState() {
        this.lives = this.initialLives;
        this.gold = this.initialGold;
        this.wave = 1;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.waveInProgress = false;
        this.nextWaveBtn.disabled = false;
        const cfg = this.waveConfigs[0];
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.prepareTankScheduleForWave(cfg, 1);
        this.grid.resetCells();
        this.spawned = 0;
        this.spawnTimer = 0;
        this.gameOver = false;
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
        this.switchCooldown = 0;
        updateHUD(this);
        updateSwitchIndicator(this);
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
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }
}

Object.assign(Game.prototype, enemyActions, waveActions);

export default Game;
