import { updateHUD, updateUpgradeAvailability } from '../../systems/ui.js';
import { loadBestScore } from '../../systems/dataStore.js';
import gameConfig from '../../config/gameConfig.js';
import { initializeBalanceTracking } from '../../systems/balanceTracking.js';

function configureFirstWave(game) {
    const cfg = game.waveConfigs[0];
    game.enemiesPerWave = 0;
    game.prepareTankScheduleForWave(cfg, 1, 0);
}

function resetResources(game) {
    game.lives = game.initialLives;
    game.energy = game.initialEnergy;
    game.wave = 1;
    game.waveInProgress = false;
    game.gameOver = false;
    game.elapsedTime = 0;
    if (game.scoreManager) {
        game.scoreManager.reset();
    }
    if (typeof game.ensureEndlessWaveTracking === 'function') {
        game.ensureEndlessWaveTracking();
    }
    game.endlessModeActive = false;
    // Reset balance tracking stats
    game.swarmKills = 0;
    game.tankKills = 0;
    game.energyGained = 0;
    game.energySpent = 0;
}

function resetCollections(game) {
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.explosions = [];
    game.mergeAnimations = [];
    game.energyPopups = [];
    game.mergeModeActive = false;
    game.upgradeModeActive = false;
    game.selectedMergeCell = null;
    game.maxProjectileRadius = game.projectileRadius;
    game.spawned = 0;
    game.grid.resetCells();
    if (typeof game.resetScreenShake === 'function') {
        game.resetScreenShake();
    }
}

function resetButtons(game) {
    if (game.nextWaveBtn) {
        game.nextWaveBtn.disabled = false;
    }
    if (game.mergeBtn) {
        game.mergeBtn.disabled = false;
    }
    updateUpgradeAvailability(game);
}

function resetStatus(game) {
    if (!game.statusEl) {
        return;
    }
    game.statusEl.textContent = '';
    game.statusEl.style.color = '';
}

function resetEndOverlay(game) {
    if (game.endOverlay) {
        game.endOverlay.classList.add('hidden');
    }
    if (game.endMenu) {
        game.endMenu.classList.remove('win');
        game.endMenu.classList.remove('lose');
    }
}

function resetEndMessages(game) {
    if (game.endMessageEl) {
        game.endMessageEl.textContent = '';
    }
    if (game.endDetailEl) {
        game.endDetailEl.textContent = '';
    }
}

function resetGame(game) {
    resetResources(game);
    resetCollections(game);
    configureFirstWave(game);
    resetButtons(game);
    resetStatus(game);
    resetEndOverlay(game);
    resetEndMessages(game);
    if (typeof game.resetWaveAdState === 'function') {
        game.resetWaveAdState();
    } else {
        const timerHost = typeof window !== 'undefined' ? window : globalThis;
        const state = game.waveAdState ?? { shownWaves: new Set(), pendingWave: null, retryHandle: null };
        if (state.retryHandle && typeof timerHost?.clearTimeout === 'function') {
            timerHost.clearTimeout(state.retryHandle);
        }
        state.retryHandle = null;
        state.pendingWave = null;
        if (state.shownWaves && typeof state.shownWaves.clear === 'function') {
            state.shownWaves.clear();
        }
        game.waveAdState = state;
    }
    updateHUD(game);
    game.persistState();
    if (game.tutorial) {
        game.tutorial.reset();
        if (typeof game.tutorial.handleWavePreparation === 'function') {
            game.tutorial.handleWavePreparation(game.wave);
        }
    }
}

const stateSetup = {
    initStats() {
        const { player, scoring } = gameConfig;
        this.initialLives = player.initialLives;
        this.initialEnergy = player.initialEnergy;
        this.lives = this.initialLives;
        this.energy = this.initialEnergy;
        this.wave = 1;
        this.maxWaves = player.maxWaves;
        this.towerCost = player.towerCost;
        this.switchCost = player.switchCost;
        this.waveInProgress = false;
        this.waveConfigs = this.getWaveConfigs();
        this.tankBurstSchedule = [];
        this.tankBurstSet = new Set();
        this.tankScheduleWave = 0;
        const cfg = this.waveConfigs[0];
        this.prepareTankScheduleForWave(cfg, 1, 0);
        this.enemiesPerWave = 0;
        this.spawned = 0;
        this.enemyHpPerWave = this.waveConfigs.map(cfg => Number.isFinite(cfg?.enemyHp)
            ? cfg.enemyHp
            : 1);
        this.gameOver = false;
        if (this.scoreManager) {
            this.scoreManager.reset();
            this.scoreManager.setBestScore(loadBestScore());
        }
        this.scorePerKill = scoring.perKill;
        this.waveClearScore = scoring.waveClear;
        this.baseHitPenalty = scoring.baseHitPenalty;
        this.endlessModeActive = false;
        this.ensureEndlessWaveTracking?.();
        // Balance tracking stats
        this.swarmKills = 0;
        this.tankKills = 0;
        this.energyGained = 0;
        this.energySpent = 0;
        // Initialize detailed balance tracking
        initializeBalanceTracking(this);
        const hasShownWavesSet = this.waveAdState
            && this.waveAdState.shownWaves
            && typeof this.waveAdState.shownWaves.clear === 'function';
        if (hasShownWavesSet) {
            this.waveAdState.shownWaves.clear();
            this.waveAdState.pendingWave = null;
            const host = typeof window !== 'undefined' ? window : globalThis;
            if (this.waveAdState.retryHandle && typeof host?.clearTimeout === 'function') {
                host.clearTimeout(this.waveAdState.retryHandle);
            }
            this.waveAdState.retryHandle = null;
        }
    },

    resetState() {
        resetGame(this);
    },
};

export default stateSetup;
