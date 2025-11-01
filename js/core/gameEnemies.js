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
        const spawnCoords = this.getDefaultEnemyCoords();
        const endless = typeof this.isEndlessWave === 'function'
            ? this.isEndlessWave(this.wave ?? 0)
            : false;
        const intensity = enemyType === 'tank' ? 1.4 : 0.85;
        if (typeof this.triggerSpawnPortalEffect === 'function') {
            this.triggerSpawnPortalEffect(spawnCoords, {
                intensity,
                theme: endless ? 'endless' : undefined,
                seed: (this.spawned ?? 0) + (this.wave ?? 0) * 37,
            });
        }
        if (this.audio && typeof this.audio.playPortalSpawn === 'function') {
            this.audio.playPortalSpawn();
        }

        if (enemyType === 'tank') {
            this.spawnTankEnemy(hp, spawnCoords);
        } else if (enemyType === 'swarm') {
            this.spawnSwarmGroup(hp, spawnCoords);
        }
        // todo else throw error

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
            this.prepareTankScheduleForWave(cfg, this.wave);
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
    },

    spawnSwarmGroup(baseHp, overrides = {}) {
        const groupSize = Math.max(1, Math.floor(overrides.groupSize ?? gameConfig.enemies.swarm.groupSize));
        const swarmHp = Math.max(1, Math.floor(baseHp * gameConfig.enemies.swarm.hpFactor));
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

        const fallbackCoords = spawnCoords ?? this.getDefaultEnemyCoords();
        const spawnX = Number.isFinite(spawnCoords?.x) ? spawnCoords.x : fallbackCoords.x;
        const spawnYBase = Number.isFinite(spawnCoords?.y) ? spawnCoords.y : fallbackCoords.y;

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
        }
    },

    spawnEnemiesIfNeeded(dt) {
        if (!this.waveInProgress) {
            return;
        }
        if (Array.isArray(this.waveSpawnSchedule) && this.waveSpawnSchedule.length > 0) {
            this.waveElapsed = (this.waveElapsed ?? 0) + dt;
            while (this.waveSpawnCursor < this.waveSpawnSchedule.length) {
                const event = this.waveSpawnSchedule[this.waveSpawnCursor];
                if (!event || this.waveElapsed + 1e-6 < event.time) {
                    break;
                }
                this.spawnEnemyFromPlan(event);
                this.waveSpawnCursor += 1;
            }
            return;
        }
        if (this.spawned < this.enemiesPerWave) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
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
