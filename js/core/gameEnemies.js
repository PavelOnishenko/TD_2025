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
        else {
            throw new Error(`Unknown enemy type: ${enemyType}`);
        }

        this.spawned += 1;
    },

    determineEnemyHp() {
        if (typeof this.getEnemyHpForWave === 'function') {
            return this.getEnemyHpForWave(this.wave);
        }
        return this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave.at(-1);
    },

    determineEnemyType(type) {
        if (type) {
            return type;
        }

        if (!this.tankBurstSet || this.tankScheduleWave !== this.wave) {
            const cfg = typeof this.getOrCreateWaveConfig === 'function'
                ? this.getOrCreateWaveConfig(this.wave)
                : this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
            this.prepareTankScheduleForWave(cfg, this.wave, this.enemiesPerWave);
        }

        const spawnIndex = this.spawned + 1;
        return this.tankBurstSet.has(spawnIndex) ? 'tank' : 'swarm';
    },

    getDefaultEnemyCoords() {
        return { ...gameConfig.enemies.defaultSpawn };
    },

    spawnTankEnemy(baseHp, overrides = {}) {
        const coords = this.getDefaultEnemyCoords();
        if (Number.isFinite(overrides.x)) {
            coords.x = overrides.x;
        }
        if (Number.isFinite(overrides.y)) {
            coords.y = overrides.y;
        }
        const hpMultiplier = gameConfig.enemies.tank.hpMultiplier;
        const color = overrides.color ?? this.getEnemyColor();
        const tankEnemy = new TankEnemy(baseHp * hpMultiplier, color, coords.x, coords.y);
        tankEnemy.setEngineFlamePlacement({
            anchorX: tankEnemy.engineFlame.anchor.x,
            anchorY: tankEnemy.engineFlame.anchor.y,
            offsetX: tankEnemy.engineFlame.offset.x - 10,
            offsetY: tankEnemy.engineFlame.offset.y,
            angleDegrees: tankEnemy.engineFlame.angle - 55,
        });
        this.enemies.push(tankEnemy);
        if (typeof this.triggerPortalEntry === 'function') {
            const entryY = tankEnemy.y + (tankEnemy.h ?? 0) / 2;
            this.triggerPortalEntry({ y: entryY, groupSize: 1, color });
        }
    },

    spawnSwarmGroup(baseHp, overrides = {}) {
        const groupSize = Math.max(1, Math.floor(overrides.groupSize ?? gameConfig.enemies.swarm.groupSize));
        const swarmHp = Math.max(1, Math.floor(baseHp * gameConfig.enemies.swarm.hpMultiplier));
        const spacing = Number.isFinite(overrides.spacing)
            ? overrides.spacing
            : gameConfig.enemies.swarm.spacing;
        const coords = this.getDefaultEnemyCoords();
        if (Number.isFinite(overrides.x)) {
            coords.x = overrides.x;
        }
        if (Number.isFinite(overrides.y)) {
            coords.y = overrides.y;
        }
        const offsets = Array.isArray(overrides.offsets) ? overrides.offsets : null;
        const centerOffsetBase = (groupSize - 1) / 2;
        const spawnCenters = [];
        const spawnColors = [];

        for (let i = 0; i < groupSize; i++) {
            const color = overrides.colors?.[i]
                ?? overrides.color
                ?? this.getEnemyColor();
            const swarmEnemy = new SwarmEnemy(swarmHp, color, coords.x, coords.y);
            if (offsets && Number.isFinite(offsets[i])) {
                swarmEnemy.y = offsets[i];
            } else if (groupSize > 1) {
                const centerOffset = (i - centerOffsetBase) * spacing;
                swarmEnemy.y = coords.y + centerOffset;
            } else {
                swarmEnemy.y = coords.y;
            }
            swarmEnemy.setEngineFlamePlacement({
                anchorX:swarmEnemy.engineFlame.anchor.x, anchorY:swarmEnemy.engineFlame.anchor.y,
                offsetX:swarmEnemy.engineFlame.offset.x-10, offsetY:swarmEnemy.engineFlame.offset.y,
                angleDegrees:swarmEnemy.engineFlame.angle - 55
            });
            this.enemies.push(swarmEnemy);
            spawnCenters.push(swarmEnemy.y + (swarmEnemy.h ?? 0) / 2);
            spawnColors.push(color);
        }
        if (typeof this.triggerPortalEntry === 'function') {
            const entryY = spawnCenters.length > 0
                ? spawnCenters.reduce((sum, value) => sum + value, 0) / spawnCenters.length
                : coords.y;
            const entryColor = spawnColors[0] ?? overrides.color ?? null;
            this.triggerPortalEntry({ y: entryY, groupSize, color: entryColor });
        }
    },

    spawnEnemiesIfNeeded(dt) {
        if (!this.waveInProgress) {
            return;
        }
        if (!Array.isArray(this.waveSpawnSchedule) || this.waveSpawnSchedule.length === 0) {
            throw new Error(`Missing spawn schedule for wave ${this.wave}.`);
        }
        this.waveElapsed = (this.waveElapsed ?? 0) + dt;
        while (this.waveSpawnCursor < this.waveSpawnSchedule.length) {
            const event = this.waveSpawnSchedule[this.waveSpawnCursor];
            if (!event || this.waveElapsed + 1e-6 < event.time) {
                break;
            }
            this.spawnEnemyFromPlan(event);
            this.waveSpawnCursor += 1;
        }
    },

    resolvePlannedColor(color) {
        if (!color || typeof color !== 'string') {
            return this.getEnemyColor();
        }
        const normalized = color.toLowerCase();
        if (normalized === 'auto' || normalized === 'random') {
            return this.getEnemyColor();
        }
        return normalized;
    },

    spawnEnemyFromPlan(event) {
        if (!event) {
            return;
        }
        const baseHp = this.determineEnemyHp();
        const color = this.resolvePlannedColor(event.color);
        const options = {
            color,
            x: Number.isFinite(event.x) ? event.x : undefined,
            y: Number.isFinite(event.y) ? event.y : undefined,
            groupSize: Number.isFinite(event.groupSize) ? event.groupSize : undefined,
            spacing: Number.isFinite(event.spacing) ? event.spacing : undefined,
            offsets: Array.isArray(event.offsets) ? event.offsets : undefined,
            colors: Array.isArray(event.colors) ? event.colors : undefined,
        };
        if (event.type === 'tank') {
            this.spawnTankEnemy(baseHp, options);
        } else {
            if (!options.groupSize) {
                options.groupSize = 1;
            }
            this.spawnSwarmGroup(baseHp, options);
        }
        this.spawned += 1;
    },

    updateEnemies(dt) {
        const logicalHeight = Number.isFinite(this.logicalH) ? this.logicalH : 0;
        const canvasHeight = Number.isFinite(this.canvas?.height) ? this.canvas.height : logicalHeight;
        const worldMaxY = Number.isFinite(this.worldBounds?.maxY) ? this.worldBounds.maxY : null;
        const removalThreshold = Math.max(
            worldMaxY ?? Number.NEGATIVE_INFINITY,
            canvasHeight,
            logicalHeight,
        );

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
                    this.triggerBaseHitEffects(e);
                }
                updateHUD(this);
                if (this.lives <= 0) {
                    endGame(this, 'LOSE');
                }
            } else if (e.isOutOfBounds(removalThreshold)) {
                this.enemies.splice(i, 1);
            }
        }
    },

    towerAttacks(timestamp) {
        for (const tower of this.towers) {
            const fireInterval = typeof tower.getFireInterval === 'function'
                ? tower.getFireInterval()
                : this.projectileSpawnInterval;
            const scaledElapsed = timestamp - tower.lastShot;
            if (scaledElapsed < fireInterval) {
                continue;
            }

            let chosenTarget = null;
            const towerCenter = tower.center();

            for (const target of this.enemies) {
                const enemyCenter = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
                const dx = enemyCenter.x - towerCenter.x;
                const dy = enemyCenter.y - towerCenter.y;
                if (Math.hypot(dx, dy) > tower.range) {
                    continue;
                }

                // Prefer enemies that match the tower color when several are in range.
                if (!chosenTarget) {
                    chosenTarget = { enemy: target, dx, dy };
                }
                if (target?.color === tower.color) {
                    chosenTarget = { enemy: target, dx, dy };
                    break;
                }
            }

            if (chosenTarget) {
                this.spawnProjectile(Math.atan2(chosenTarget.dy, chosenTarget.dx), tower);
                tower.lastShot = timestamp;
            }
        }
    }
};
