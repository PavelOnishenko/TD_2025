import { updateHUD } from '../../systems/ui.js';

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
}

function resetCollections(game) {
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.explosions = [];
    game.mergeAnimations = [];
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
    updateHUD(game);
    game.persistState();
}

const stateSetup = {
    initStats() {
        this.initialLives = 5;
        this.initialEnergy = 50;
        this.lives = this.initialLives;
        this.energy = this.initialEnergy;
        this.wave = 1;
        this.maxWaves = 10;
        this.towerCost = 12;
        this.switchCost = 4;
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
        this.enemyHpPerWave = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
        this.gameOver = false;
        this.shootingInterval = 500;
        this.colorProbStart = 0.5;
        this.colorProbEnd = 0.5;
    },

    resetState() {
        resetGame(this);
    },
};

export default stateSetup;
