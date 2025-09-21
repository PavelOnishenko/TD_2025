import Enemy, { TankEnemy, SwarmEnemy } from './Enemy.js';
import { updateHUD, endGame } from './ui.js';

export const enemyActions = {
    getEnemyColor() {
        const denom = this.enemiesPerWave - 1;
        const progress = denom > 0 ? this.spawned / denom : 1;
        const p = this.colorProbStart + (this.colorProbEnd - this.colorProbStart) * progress;
        return Math.random() < p ? 'red' : 'blue';
    },

    spawnEnemy(type) {
        const hp = this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave.at(-1);
        if (!type) {
            const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
            type = this.wave <= 2 ? 'swarm' : (Math.random() < cfg.tankChance ? 'tank' : 'swarm');
        }
        const startY = 200;
        if (type === 'tank') {
            const color = this.getEnemyColor();
            const tankEnemy = new TankEnemy(hp * 5, color, 0, startY);
            tankEnemy.setEngineFlamePlacement({
                anchorX:this.engineFlame.anchor.x, anchorY:this.engineFlame.anchor.y, 
                offsetX:this.engineFlame.offset.x, offsetY:this.engineFlame.offset.y, angle:this.engineFlame.angle+Math.PI
            });
            this.enemies.push(tankEnemy);
        } else if (type === 'swarm') {
            const groupSize = 3;
            const swarmHp = Math.max(1, Math.floor(hp / 2));
            const spacing = 40;
            for (let i = 0; i < groupSize; i++) {
                const color = this.getEnemyColor();
                const y = startY + i * spacing;
                const swarmEnemy = new SwarmEnemy(swarmHp, color, 0, y);
                swarmEnemy.setEngineFlamePlacement({
                    anchorX:swarmEnemy.engineFlame.anchor.x, anchorY:swarmEnemy.engineFlame.anchor.y, 
                    offsetX:swarmEnemy.engineFlame.offset.x-10, offsetY:swarmEnemy.engineFlame.offset.y, 
                    angleDegrees:swarmEnemy.engineFlame.angle - 55
                });
                swarmEnemy.setEngineFlamePlacement
                this.enemies.push(swarmEnemy);
            }
        } else {
            const color = this.getEnemyColor();
            this.enemies.push(new Enemy(hp, color, this.pathX, startY));
        }
        this.spawned += 1;
    },

    spawnEnemiesIfNeeded(dt) {
        if (this.waveInProgress && this.spawned < this.enemiesPerWave) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }
    },

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
            } else if (e.isOutOfBounds(this.canvas.height)) {
                this.enemies.splice(i, 1);
            }
        }
    },

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
};
