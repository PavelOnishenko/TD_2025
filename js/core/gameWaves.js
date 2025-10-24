import { updateHUD, endGame, updateWavePhaseIndicator } from '../systems/ui.js';
import gameConfig from '../config/gameConfig.js';
import { showCrazyGamesAdWithPause } from '../systems/ads.js';

const SCORE_WAVE_CLEAR = 150;

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
        const { minDifference } = gameConfig.player.colorProbability;
        do {
            this.colorProbStart = Math.random();
            this.colorProbEnd = Math.random();
        } while (Math.abs(this.colorProbStart - this.colorProbEnd) <= minDifference);
        this.spawnEnemy();
    },

    setupWaveStuff() {
        if (this.waveInProgress) 
            return;

        this.waveInProgress = true;
        this.nextWaveBtn.disabled = true;
        updateWavePhaseIndicator(this);
        const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.prepareTankScheduleForWave(cfg, this.wave);
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
            if (this.wave === this.maxWaves) {
                endGame(this, 'WIN');
            } else {
                this.nextWaveBtn.disabled = false;
            }
            if (typeof this.addScore === 'function') {
                this.addScore(this.waveClearScore);
            }
            const completedWave = this.wave;
            this.wave += 1;
            this.energy += gameConfig.player.energyPerWave;
            updateHUD(this);
            this.triggerWaveAdIfNeeded(completedWave);
        }
    },

    triggerWaveAdIfNeeded(completedWave) {
        if (completedWave !== 5) {
            return;
        }
        if (this.wave5AdShown || this.wave5AdPending) {
            return;
        }
        this.wave5AdPending = true;

        const scheduleRetry = (delayMs) => {
            const host = typeof window !== 'undefined' ? window : globalThis;
            if (typeof host?.setTimeout !== 'function') {
                this.wave5AdPending = false;
                return;
            }
            if (this.wave5AdRetryHandle && typeof host?.clearTimeout === 'function') {
                host.clearTimeout(this.wave5AdRetryHandle);
            }
            this.wave5AdRetryHandle = host.setTimeout(() => {
                this.wave5AdRetryHandle = null;
                this.wave5AdPending = false;
                this.triggerWaveAdIfNeeded(5);
            }, delayMs);
        };

        Promise.resolve()
            .then(() => showCrazyGamesAdWithPause(this, { reason: 'wave-5', adType: 'midgame' }))
            .then(result => {
                if (result?.shown) {
                    this.wave5AdShown = true;
                    this.wave5AdPending = false;
                } else if (result?.reason === 'cooldown') {
                    const delay = Math.max(1000, Math.ceil(result.cooldownRemaining ?? 0));
                    scheduleRetry(delay);
                }
            })
            .catch(error => console.warn('Wave ad failed', error))
            .finally(() => {
                if (!this.wave5AdShown && !this.wave5AdRetryHandle) {
                    this.wave5AdPending = false;
                }
            });
    },
};
