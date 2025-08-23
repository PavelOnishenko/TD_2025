import Enemy, { TankEnemy } from './Enemy.js';
import { updateHUD, endGame } from './ui.js';
import { draw } from './render.js';
import { moveProjectiles, handleProjectileHits } from './projectiles.js';

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
        this.pathY = canvas.height / 2 - 15;
        this.base = { x: canvas.width - 40, y: this.pathY, w: 40, h: 40 };
        this.createGrid();
        this.update = this.update.bind(this);
    }

    initStats() {
        this.initialLives = 5;
        this.initialGold = 20;
        this.lives = this.initialLives;
        this.gold = this.initialGold;
        this.wave = 1;
        this.maxWaves = 5;
        this.towerCost = 10;
        this.waveInProgress = false;
        this.spawnInterval = 0.5;
        this.enemiesPerWave = 5;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.enemyHpPerWave = [3, 4, 5, 6, 7];
        this.gameOver = false;
        this.shootingInterval = 500;
    }

    createGrid() {
        this.grid = [];
        const topY = this.pathY - 100;
        const bottomY = this.pathY + 100;
        const startX = 60;
        const step = 140;
        for (let i = 0; i < 5; i++) {
            const x = startX + i * step;
            this.grid.push({ x, y: topY, w: 40, h: 40, occupied: false, highlight: 0 });
            this.grid.push({ x, y: bottomY, w: 40, h: 40, occupied: false, highlight: 0 });
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
            damage: 1
        });
    }

    spawnEnemy(type = 'swarm') {
        const hp = this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave[this.enemyHpPerWave.length - 1];
        const color = Math.random() < 0.5 ? 'red' : 'blue';
        if (type === 'tank') {
            this.enemies.push(new TankEnemy(hp * 5, color, this.pathY));
        } else {
            this.enemies.push(new Enemy(hp, color, this.pathY));
        }
        this.spawned += 1;
    }

    startWave() {
        if (this.waveInProgress) return;
        this.waveInProgress = true;
        this.nextWaveBtn.disabled = true;
        this.enemies = [];
        this.spawned = 0;
        this.spawnTimer = 0;
        this.spawnEnemy();
    }

    calcDelta(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        return dt;
    }

    spawnEnemiesIfNeeded(dt) {
        if (this.waveInProgress && this.spawned < this.enemiesPerWave) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);
            if (e.x + e.w >= this.base.x) {
                this.enemies.splice(i, 1);
                this.lives -= 1;
                updateHUD(this);
                if (this.lives <= 0) {
                    endGame(this, 'LOSE');
                }
            } else if (e.isOutOfBounds(this.canvas.width)) {
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

    checkWaveCompletion() {
        if (this.waveInProgress && this.spawned === this.enemiesPerWave && this.enemies.length === 0) {
            this.waveInProgress = false;
            if (this.wave === this.maxWaves) {
                endGame(this, 'WIN');
            } else {
                this.nextWaveBtn.disabled = false;
            }
            this.wave += 1;
            this.gold += 3;
            updateHUD(this);
        }
    }

    update(timestamp) {
        if (this.gameOver) return;
        const dt = this.calcDelta(timestamp);
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
        this.grid.forEach(cell => {
            cell.occupied = false;
            cell.highlight = 0;
        });
        this.spawned = 0;
        this.spawnTimer = 0;
        this.gameOver = false;
        this.statusEl.textContent = '';
        updateHUD(this);
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
