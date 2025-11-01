import { updateHUD, updateWavePhaseIndicator } from '../systems/ui.js';
import gameConfig from '../config/gameConfig.js';
import { showCrazyGamesAdWithPause } from '../systems/ads.js';

export const waveActions = {
    startWave() {
        this.setupWaveStuff();
        if (this.tutorial) {
            this.tutorial.handleWaveStarted();
        }
        if (this.mergeBtn) {
            this.mergeBtn.disabled = true;
        }
        if (this.statusEl) {
            this.statusEl.textContent = '';
            this.statusEl.style.color = '';
        }
        this.enemies = [];
        this.spawned = 0;
        this.spawnTimer = 0;
        this.waveElapsed = 0;
        this.waveSpawnCursor = 0;
        const { minDifference } = gameConfig.player.colorProbability;
        do {
            this.colorProbStart = Math.random();
            this.colorProbEnd = Math.random();
        } while (Math.abs(this.colorProbStart - this.colorProbEnd) <= minDifference);
        if (Array.isArray(this.waveSpawnSchedule) && this.waveSpawnSchedule.length > 0) {
            this.spawnEnemiesIfNeeded(0);
        } else {
            this.spawnEnemy();
        }
    },

    setupWaveStuff() {
        if (this.waveInProgress)
            return;

        this.waveInProgress = true;
        this.nextWaveBtn.disabled = true;
        updateWavePhaseIndicator(this);
        const cfg = typeof this.getOrCreateWaveConfig === 'function'
            ? this.getOrCreateWaveConfig(this.wave)
            : this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
        this.spawnInterval = cfg.interval;
        const plan = this.prepareWaveFormationPlan?.(cfg, this.wave);
        if (plan && plan.totalEnemies > 0) {
            this.enemiesPerWave = plan.totalEnemies;
        } else {
            this.waveSpawnSchedule = null;
            this.activeFormationPlan = null;
            this.waveElapsed = 0;
            this.waveSpawnCursor = 0;
            this.enemiesPerWave = cfg.cycles;
        }
        this.prepareTankScheduleForWave(cfg, this.wave);
    },

    prepareWaveFormationPlan(cfg, waveNumber) {
        if (!this.formationManager || typeof this.formationManager.planWave !== 'function') {
            this.activeFormationPlan = null;
            this.waveSpawnSchedule = null;
            return null;
        }
        const totalDifficulty = Number.isFinite(cfg?.cycles) ? cfg.cycles : undefined;
        const plan = this.formationManager.planWave(waveNumber, { totalDifficulty });
        if (!plan || !Array.isArray(plan.events) || plan.events.length === 0) {
            this.activeFormationPlan = null;
            this.waveSpawnSchedule = null;
            return null;
        }
        this.activeFormationPlan = plan;
        this.waveSpawnSchedule = plan.events.slice().sort((a, b) => a.time - b.time);
        this.waveSpawnCursor = 0;
        this.waveElapsed = 0;
        return plan;
    },

    mergeTowers(row) {
        this.forEachMergeablePair(row, (cellA, cellB, towerA, towerB) => {
            this.mergeTowerPair(cellA, cellB, towerA, towerB);
        });
    },

    manualMergeTowers() {
        if (this.waveInProgress) {
            return;
        }
        this.mergeTowers(this.bottomCells);
        this.mergeTowers(this.topCells);
    },

    canMergeCells(cellA, cellB) {
        return cellA.occupied && cellB.occupied;
    },

    canMergeTowers(towerA, towerB) {
        return towerA && towerB && towerA.color === towerB.color && towerA.level === towerB.level;
    },

    forEachMergeablePair(row, callback) {
        for (let i = 0; i < row.length - 1; i++) {
            const cellA = row[i];
            const cellB = row[i + 1];
            if (!this.canMergeCells(cellA, cellB)) continue;

            const towerA = this.getTowerAt(cellA);
            const towerB = this.getTowerAt(cellB);
            if (!this.canMergeTowers(towerA, towerB)) continue;

            callback(cellA, cellB, towerA, towerB);
            i++;
        }
    },

    // TODO Merge isn't related to waves, move all merge related stuff from this file to a better place like  towers module
    mergeTowerPair(cellA, cellB, towerA, towerB) {
        cellA.tower = towerA;
        towerA.level += 1;
        towerA.updateStats();
        if (typeof this.startTowerMergeAnimation === 'function') {
            this.startTowerMergeAnimation(towerA, towerB);
        }
        if (typeof towerA.triggerPlacementFlash === 'function') {
            towerA.triggerPlacementFlash();
        }
        this.towers = this.towers.filter(t => t !== towerB);
        if (towerB.cell) {
            towerB.cell.tower = null;
            towerB.cell = null;
        }
        cellB.occupied = false;
        cellB.tower = null;
        if (typeof this.persistState === 'function') {
            this.persistState();
        }
    },

    updateMergeHints() {
        if (!this.mergeHintPairs) {
            this.mergeHintPairs = [];
        } else {
            this.mergeHintPairs.length = 0;
        }

        if (this.waveInProgress) {
            return;
        }

        const applyHint = (cellA, cellB, towerA, towerB) => {
            cellA.mergeHint = Math.min(1, (cellA.mergeHint ?? 0) + 0.9);
            cellB.mergeHint = Math.min(1, (cellB.mergeHint ?? 0) + 0.9);
            if (towerA) {
                towerA.mergeHint = Math.min(1, (towerA.mergeHint ?? 0) + 0.9);
            }
            if (towerB) {
                towerB.mergeHint = Math.min(1, (towerB.mergeHint ?? 0) + 0.9);
            }
            this.mergeHintPairs.push({ cellA, cellB, color: towerA?.color ?? 'red' });
        };

        this.forEachMergeablePair(this.bottomCells, applyHint);
        this.forEachMergeablePair(this.topCells, applyHint);
    },

    checkWaveCompletion() {
        if (this.waveInProgress && this.spawned === this.enemiesPerWave && this.enemies.length === 0) {
            this.waveInProgress = false;
            updateWavePhaseIndicator(this);
            if (this.mergeBtn) {
                this.mergeBtn.disabled = false;
            }
            if (this.nextWaveBtn) {
                this.nextWaveBtn.disabled = false;
            }
            if (typeof this.addScore === 'function') {
                this.addScore(this.waveClearScore);
            }
            const completedWave = this.wave;
            this.wave += 1;
            if (completedWave >= this.maxWaves && typeof this.activateEndlessMode === 'function') {
                this.activateEndlessMode();
            }
            this.energy += gameConfig.player.energyPerWave;
            updateHUD(this);
            this.triggerWaveAdIfNeeded(completedWave);
        }
    },

    triggerWaveAdIfNeeded(completedWave) {
        const cadence = Math.max(1, Math.floor(gameConfig.ads?.waveCadence ?? 5));
        if (completedWave < cadence || completedWave % cadence !== 0) {
            return;
        }
        const state = typeof this.getWaveAdState === 'function'
            ? this.getWaveAdState()
            : (this.waveAdState ?? { shownWaves: new Set(), pendingWave: null, retryHandle: null });
        this.waveAdState = state;
        if (!state.shownWaves || typeof state.shownWaves.has !== 'function') {
            state.shownWaves = new Set();
        }
        if (state.shownWaves.has(completedWave) || state.pendingWave === completedWave) {
            return;
        }
        state.pendingWave = completedWave;

        const scheduleRetry = (delayMs) => {
            const host = typeof window !== 'undefined' ? window : globalThis;
            if (typeof host?.setTimeout !== 'function') {
                state.pendingWave = null;
                return;
            }
            if (state.retryHandle && typeof host?.clearTimeout === 'function') {
                host.clearTimeout(state.retryHandle);
            }
            state.retryHandle = host.setTimeout(() => {
                state.retryHandle = null;
                state.pendingWave = null;
                this.triggerWaveAdIfNeeded(completedWave);
            }, delayMs);
        };

        Promise.resolve()
            .then(() => showCrazyGamesAdWithPause(this, { reason: 'wave-milestone', adType: 'midgame' }))
            .then(result => {
                if (result?.shown) {
                    state.shownWaves.add(completedWave);
                    state.pendingWave = null;
                    if (state.retryHandle) {
                        const host = typeof window !== 'undefined' ? window : globalThis;
                        if (typeof host?.clearTimeout === 'function') {
                            host.clearTimeout(state.retryHandle);
                        }
                        state.retryHandle = null;
                    }
                } else if (result?.reason === 'cooldown') {
                    const delay = Math.max(1000, Math.ceil(result.cooldownRemaining ?? 0));
                    scheduleRetry(delay);
                }
            })
            .catch(error => console.warn('Wave ad failed', error))
            .finally(() => {
                if (!state.shownWaves.has(completedWave) && !state.retryHandle) {
                    state.pendingWave = null;
                }
            });
    },
};
