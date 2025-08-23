import Enemy, { TankEnemy, SwarmEnemy } from './Enemy.js';
import { updateHUD, endGame, updateSwitchIndicator } from './ui.js';
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
        this.pathX = canvas.width / 2 - 15;
        this.base = { x: this.pathX, y: 0, w: 40, h: 40 };
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
        this.towerCost = 10;
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
        this.enemyHpPerWave = [3, 4, 5, 6, 7];
        this.gameOver = false;
        this.shootingInterval = 500;
        this.switchCooldownDuration = 2;
        this.switchCooldown = 0;
    }

    createGrid() {
        this.grid = [];
        const leftX = this.pathX - 100;
        const rightX = this.pathX + 100;
        const startY = 60;
        const step = 140;
        for (let i = 0; i < 5; i++) {
            const y = startY + i * step;
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
        return Math.random() < 0.5 ? 'red' : 'blue';
    }

    spawnEnemy(type) {
        const hp = this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave.at(-1);
        if (!type) {
            const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
            type = this.wave <= 2 ? 'swarm' : (Math.random() < cfg.tankChance ? 'tank' : 'swarm');
        }
        const startY = this.canvas.height - 30;
        if (type === 'tank') {
            const color = this.getEnemyColor();
            this.enemies.push(new TankEnemy(hp * 5, color, this.pathX, startY));
        } else if (type === 'swarm') {
            const groupSize = 3;
            const swarmHp = Math.max(1, Math.floor(hp / 2));
            for (let i = 0; i < groupSize; i++) {
                const color = this.getEnemyColor();
                this.enemies.push(new SwarmEnemy(swarmHp, color, this.pathX, startY));
            }
        } else {
            const color = this.getEnemyColor();
            this.enemies.push(new Enemy(hp, color, this.pathX, startY));
        }
        this.spawned += 1;
    }

    switchTowerColor(tower) {
        if (this.switchCooldown > 0) return false;
        tower.color = tower.color === 'red' ? 'blue' : 'red';
        this.switchCooldown = this.switchCooldownDuration;
        updateSwitchIndicator(this);
        return true;
    }

    startWave() {
        if (this.waveInProgress) return;
        this.waveInProgress = true;
        this.nextWaveBtn.disabled = true;
        const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
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
            if (e.y <= this.base.y + this.base.h) {
                this.enemies.splice(i, 1);
                this.lives -= 1;
                updateHUD(this);
                if (this.lives <= 0) {
                    endGame(this, 'LOSE');
                }
            } else if (e.isOutOfBounds()) {
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
        const leftCol = this.grid.filter(c => c.x < this.pathX);
        const rightCol = this.grid.filter(c => c.x > this.pathX);
        const scan = col => {
            for (let i = 0; i < col.length - 1; i++) {
                const a = col[i];
                const b = col[i + 1];
                if (a.occupied && b.occupied) {
                    const ta = this.getTowerAt(a);
                    const tb = this.getTowerAt(b);
                    if (ta && tb && ta.color === tb.color && ta.level === tb.level) {
                        ta.level += 1;
                        ta.updateStats();
                        this.towers = this.towers.filter(t => t !== tb);
                        b.occupied = false;
                        i += 1;
                    }
                }
            }
        };
        scan(leftCol);
        scan(rightCol);
    }

    checkWaveCompletion() {
        if (this.waveInProgress && this.spawned === this.enemiesPerWave && this.enemies.length === 0) {
            this.waveInProgress = false;
            this.mergeTowers();
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
