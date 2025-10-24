import { updateHUD } from '../../systems/ui.js';
import { loadBestScore } from '../../systems/dataStore.js';
import gameConfig from '../../config/gameConfig.js';

function configureFirstWave(game) {
    const cfg = game.waveConfigs[0];
    game.spawnInterval = cfg.interval;
    game.enemiesPerWave = cfg.cycles;
    game.prepareTankScheduleForWave(cfg, 1);
}

function resetResources(game) {
    game.lives = game.initialLives;
    game.energy = game.initialEnergy;
    game.wave = 1;
    game.waveInProgress = false;
    game.gameOver = false;
    game.elapsedTime = 0;
    game.score = 0;
}

function resetCollections(game) {
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.explosions = [];
    game.mergeAnimations = [];
    game.energyPopups = [];
    game.maxProjectileRadius = game.projectileRadius;
    game.spawned = 0;
    game.spawnTimer = 0;
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
    const timerHost = typeof window !== 'undefined' ? window : globalThis;
    if (game.wave5AdRetryHandle && typeof timerHost?.clearTimeout === 'function') {
        timerHost.clearTimeout(game.wave5AdRetryHandle);
    }
    game.wave5AdRetryHandle = null;
    game.wave5AdPending = false;
    game.wave5AdShown = false;
    updateHUD(game);
    game.persistState();
    if (game.tutorial) {
        game.tutorial.reset();
    }
}

const stateSetup = {
    initStats() {
        const { player, waves, scoring } = gameConfig;
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
        this.prepareTankScheduleForWave(cfg, 1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.enemyHpPerWave = [...waves.enemyHpByWave];
        this.gameOver = false;
        this.shootingInterval = player.shootingInterval;
        this.colorProbStart = player.colorProbability.start;
        this.colorProbEnd = player.colorProbability.end;
        this.score = 0;
        this.bestScore = loadBestScore();
        this.scorePerKill = scoring.perKill;
        this.waveClearScore = scoring.waveClear;
        this.baseHitPenalty = scoring.baseHitPenalty;
    },

    resetState() {
        resetGame(this);
    },
};

export default stateSetup;
