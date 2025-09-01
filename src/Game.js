import { updateHUD, updateSwitchIndicator } from './ui.js';
import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import { enemyActions } from './gameEnemies.js';
import { waveActions } from './gameWaves.js';
import { callCrazyGamesEvent } from './crazyGamesIntegration.js';

class Game {
    constructor(canvas, { width = 540, height = 960 }) {
        this.canvas = canvas;
        this.logicalW = width;
        this.logicalH = height;
        this.ctx = canvas.getContext('2d');
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.projectileSpeed = 800;
        this.projectileRadius = 6;
        this.projectileSpawnInterval = 500;
        this.lastTime = 0;
        this.initStats();
        this.base = { x: this.logicalW, y: this.logicalH - 60, w: 40, h: 40 };
        this.createGrid();
        this.update = this.update.bind(this);
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
        const cfg = this.waveConfigs[0];
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.enemyHpPerWave = [2, 3, 4, 5, 6];
        this.gameOver = false;
        this.shootingInterval = 500;
        this.switchCooldownDuration = 0.5;
        this.switchCooldown = 0;
        this.colorProbStart = 0.5;
        this.colorProbEnd = 0.5;
    }

    getWaveConfigs() {
        return [
            { interval: 1, cycles: 20, tankChance: 0 },
            { interval: 1, cycles: 25, tankChance: 0 },
            { interval: 1, cycles: 22, tankChance: 0.1 },
            { interval: 1, cycles: 25, tankChance: 0.15 },
            { interval: 1, cycles: 28, tankChance: 0.2 },
            { interval: 1, cycles: 30, tankChance: 0.25 },
            { interval: 1, cycles: 32, tankChance: 0.3 },
            { interval: 1, cycles: 35, tankChance: 0.35 },
            { interval: 1, cycles: 38, tankChance: 0.4 },
            { interval: 1, cycles: 40, tankChance: 0.45 }
        ];
    }

    createCell(x, y) {
        return { x, y, w: 40, h: 24, occupied: false, highlight: 0 };
    }

    createGrid() {
        const topPlatform = { x: 70, y: 140 };
        const bottomPlatform = { x: 80, y: 480 };
        const topPlatformGrid = [
            this.createCell(0, 0),
            this.createCell(40, 50),
            this.createCell(100, 110),
            this.createCell(170, 165),
            this.createCell(230, 200),
            this.createCell(300, 225),
        ];
        topPlatformGrid.forEach(cell => {
            cell.x += topPlatform.x;
            cell.y += topPlatform.y;
        });
        const bottomPlatformGrid = [
            this.createCell(0, 0),
            this.createCell(75, 25),
            this.createCell(155, 65),
            this.createCell(220, 115),
            this.createCell(290, 170),
            this.createCell(325, 250),
        ];
        bottomPlatformGrid.forEach(cell => {
            cell.x += bottomPlatform.x;
            cell.y += bottomPlatform.y;
        });
        this.grid = [...topPlatformGrid, ...bottomPlatformGrid];
    }

    spawnProjectile(angle, tower) {
        const c = tower.center();
        this.projectiles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(angle) * this.projectileSpeed,
            vy: Math.sin(angle) * this.projectileSpeed,
            color: tower.color,
            damage: tower.damage
        });
    }

    switchTowerColor(tower) {
        if (this.switchCooldown > 0 || this.gold < 1) return false;
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
        return this.towers.find(t => t.x === cell.x && t.y === cell.y);
    }

    update(timestamp) {
        if (this.gameOver) return;
        const dt = this.calcDelta(timestamp);
        if (this.switchCooldown > 0) {
            this.switchCooldown = Math.max(0, this.switchCooldown - dt);
            updateSwitchIndicator(this);
        }
        this.spawnEnemiesIfNeeded(dt);
        this.updateEnemies(dt);
        this.towerAttacks(timestamp);
        moveProjectiles(this, dt);
        handleProjectileHits(this);
        this.grid.forEach(cell => {
            if (cell.highlight > 0) {
                cell.highlight = Math.max(0, cell.highlight - dt);
            }
        });
        this.checkWaveCompletion();
        draw(this);
        if (!this.gameOver) requestAnimationFrame(this.update);
    }

    resetState() {
        this.lives = this.initialLives;
        this.gold = this.initialGold;
        this.wave = 1;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.waveInProgress = false;
        this.nextWaveBtn.disabled = false;
        const cfg = this.waveConfigs[0];
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.grid.forEach(cell => {
            cell.occupied = false;
            cell.highlight = 0;
        });
        this.spawned = 0;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.statusEl.textContent = '';
        this.switchCooldown = 0;
        updateHUD(this);
        updateSwitchIndicator(this);
    }

    restart() {
        const wasGameOver = this.gameOver;
        this.resetState();
        if (wasGameOver) {
            this.lastTime = performance.now();
            requestAnimationFrame(this.update);
        }
        callCrazyGamesEvent('gameplayStart');
    }

    run() {
        callCrazyGamesEvent('gameplayStart');
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }
}

Object.assign(Game.prototype, enemyActions, waveActions);

export default Game;