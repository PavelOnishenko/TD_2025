import Enemy, { TankEnemy, SwarmEnemy } from '../entities/Enemy.js';
import { updateHUD, endGame } from '../systems/ui.js';
import gameConfig from '../config/gameConfig.js';

export const enemyActions = {
    getEnemyColor() {
        const denom = this.enemiesPerWave - 1;
        const progress = denom > 0 ? this.spawned / denom : 1;
        const p = this.colorProbStart + (this.colorProbEnd - this.colorProbStart) * progress;
        return Math.random() < p ? 'red' : 'blue';
    },

    spawnEnemy(type) {
        const hp = this.determineEnemyHp();
        const enemyType = this.determineEnemyType(type);

        if (enemyType === 'tank') {
            this.spawnTankEnemy(hp);
        } else if (enemyType === 'swarm') {
            this.spawnSwarmGroup(hp);
        }
        // todo else throw error

        this.spawned += 1;
    },

    determineEnemyHp() {
        return this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave.at(-1);
    },

    determineEnemyType(type) {
        if (type) {
            return type;
        }

        if (!this.tankBurstSet || this.tankScheduleWave !== this.wave) {
            const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
            this.prepareTankScheduleForWave(cfg, this.wave);
        }

        const spawnIndex = this.spawned + 1;
        return this.tankBurstSet.has(spawnIndex) ? 'tank' : 'swarm';
    },

    getDefaultEnemyCoords() {
        return { ...gameConfig.enemies.defaultSpawn };
    },

    spawnTankEnemy(baseHp) {
        const color = this.getEnemyColor();
        const defaultCoords = this.getDefaultEnemyCoords();
        const hpMultiplier = gameConfig.enemies.tank.hpMultiplier;
        const tankEnemy = new TankEnemy(baseHp * hpMultiplier, color, defaultCoords.x, defaultCoords.y);
        tankEnemy.setEngineFlamePlacement({
            anchorX: tankEnemy.engineFlame.anchor.x,
            anchorY: tankEnemy.engineFlame.anchor.y,
            offsetX: tankEnemy.engineFlame.offset.x - 10,
            offsetY: tankEnemy.engineFlame.offset.y,
            angleDegrees: tankEnemy.engineFlame.angle - 55,
        });
        this.enemies.push(tankEnemy);
    },

    spawnSwarmGroup(baseHp) {
        const groupSize = gameConfig.enemies.swarm.groupSize;
        const swarmHp = Math.max(1, Math.floor(baseHp * gameConfig.enemies.swarm.hpFactor));
        const spacing = gameConfig.enemies.swarm.spacing;
        const centerOffsetBase = (groupSize - 1) / 2;

        for (let i = 0; i < groupSize; i++) {
            const color = this.getEnemyColor();
            const defaultCoords = this.getDefaultEnemyCoords();
            const swarmEnemy = new SwarmEnemy(swarmHp, color, defaultCoords.x, defaultCoords.y);
            const centerOffset = (i - centerOffsetBase) * spacing;
            swarmEnemy.y += centerOffset;
            swarmEnemy.setEngineFlamePlacement({
                anchorX:swarmEnemy.engineFlame.anchor.x, anchorY:swarmEnemy.engineFlame.anchor.y,
                offsetX:swarmEnemy.engineFlame.offset.x-10, offsetY:swarmEnemy.engineFlame.offset.y,
                angleDegrees:swarmEnemy.engineFlame.angle - 55
            });
            this.enemies.push(swarmEnemy);
        }
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
                this.lives--;
                if (typeof this.addScore === 'function') {
                    const penalty = Number.isFinite(this.baseHitPenalty)
                        ? this.baseHitPenalty
                        : gameConfig.scoring.baseHitPenalty;
                    this.addScore(-penalty);
                }
                if (typeof this.triggerBaseHitEffects === 'function') {
                    this.triggerBaseHitEffects();
                }
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
