import { updateHUD, endGame, updateSwitchIndicator } from './ui.js';
import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';
import WaveManager from './WaveManager.js';

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.projectileSpeed = 800;
        this.projectileRadius = 6;
        this.projectileSpawnInterval = 500;
        this.lastTime = 0;
        this.initStats();
        this.pathX = canvas.width / 2 - 15;
        this.base = { x: this.pathX, y: canvas.height - 40, w: 40, h: 40 };
        this.createGrid();
        this.waveManager = new WaveManager(this);
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
        this.waveConfigs = [
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

    createGrid() {
        this.grid = [];
        const leftX = this.pathX - 60;
        const rightX = this.pathX + 60;
        const startY = this.canvas.height - 100;
        const step = 80;
        for (let i = 0; i < 5; i++) {
            const y = startY - i * step;
            this.grid.push({ x: leftX, y, w: 40, h: 40, occupied: false, highlight: 0 });
            this.grid.push({ x: rightX, y, w: 40, h: 40, occupied: false, highlight: 0 });
        }
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

    getEnemyColor() {
        return this.waveManager.getEnemyColor();
    }

    spawnEnemy(type) {
        this.waveManager.spawnEnemy(type);
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

    startWave() {
        this.waveManager.startWave();
    }

    calcDelta(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        return dt;
    }

    spawnEnemiesIfNeeded(dt) {
        this.waveManager.spawnEnemiesIfNeeded(dt);
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);
            if (e.y + e.h >= this.base.y) {
                this.enemies.splice(i, 1);
                this.lives -= 1;
                updateHUD(this);
                if (this.lives <= 0) {
                    endGame(this, 'LOSE');
                }
            } else if (e.isOutOfBounds(this.canvas.height)) {
                this.enemies.splice(i, 1);
            }
        }
    }

    towerAttacks(timestamp) {
        for (const tower of this.towers) {
            for (const target of this.enemies) {
                const towerCenter = tower.center();
                const enemyCenter = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
                const dx = enemyCenter.x - towerCenter.x;
                const dy = enemyCenter.y - towerCenter.y;
                if (Math.hypot(dx, dy) <= tower.range && timestamp - tower.lastShot >= this.projectileSpawnInterval) {
                    this.spawnProjectile(Math.atan2(dy, dx), tower);
                    tower.lastShot = timestamp;
                    break;
                }
            }
        }
    }

    getTowerAt(cell) {
        return this.towers.find(t => t.x === cell.x && t.y === cell.y);
    }

    mergeTowers() {
        for (const start of [0, 1]) {
            for (let i = start; i < this.grid.length - 2; i += 2) {
                const a = this.grid[i];
                const b = this.grid[i + 2];
                if (a.occupied && b.occupied) {
                    const ta = this.getTowerAt(a);
                    const tb = this.getTowerAt(b);
                    if (ta && tb && ta.color === tb.color && ta.level === tb.level) {
                        ta.level += 1;
                        ta.updateStats();
                        this.towers = this.towers.filter(t => t !== tb);
                        b.occupied = false;
                        i += 2;
                    }
                }
            }
        }
    }

    checkWaveCompletion() {
        this.waveManager.checkWaveCompletion();
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
    }

    run() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }
}
