import { updateHUD, updateWavePhaseIndicator, showWaveClearedBanner } from '../systems/ui.js';
import gameConfig from '../config/gameConfig.js';
import { showCrazyGamesAdWithPause } from '../systems/ads.js';
import { getWaveEnergyMultiplier } from '../utils/energyScaling.js';

export const waveActions = {
    startWave() {
        this.setupWaveStuff();
        if (this.tutorial) {
            this.tutorial.handleWaveStarted();
        }
        if (typeof this.disableMergeMode === 'function') {
            this.disableMergeMode();
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
            this.enemiesPerWave = Number.isFinite(cfg?.difficulty)
                ? Math.max(1, Math.floor(cfg.difficulty))
                : 0;
        }
        this.prepareTankScheduleForWave(cfg, this.wave, this.enemiesPerWave, plan);
    },

    prepareWaveFormationPlan(cfg, waveNumber) {
        if (!this.formationManager || typeof this.formationManager.planWave !== 'function') {
            this.activeFormationPlan = null;
            this.waveSpawnSchedule = null;
            return null;
        }
        const plan = this.formationManager.planWave(waveNumber);
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
            const waveEnergyGain = Math.max(0, Math.round(
                gameConfig.player.energyPerWave
                * getWaveEnergyMultiplier({ wave: completedWave }),
            ));
            showWaveClearedBanner(this, completedWave);
            if (this.tutorial && typeof this.tutorial.handleWaveCompleted === 'function') {
                try {
                    this.tutorial.handleWaveCompleted(completedWave);
                } catch (error) {
                    console.warn('Tutorial wave completion handler failed', error);
                }
            }
            this.wave += 1;
            if (completedWave >= this.maxWaves && typeof this.activateEndlessMode === 'function') {
                this.activateEndlessMode();
            }
            if (this.tutorial && typeof this.tutorial.handleWavePreparation === 'function') {
                this.tutorial.handleWavePreparation(this.wave);
            }
            this.energy += waveEnergyGain;
            if (this.tutorial && typeof this.tutorial.handleEnergyGained === 'function') {
                try {
                    this.tutorial.handleEnergyGained(waveEnergyGain);
                } catch (error) {
                    console.warn('Tutorial energy handler failed', error);
                }
            }
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
