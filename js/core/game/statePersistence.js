import Tower from '../../entities/Tower.js';
import { clearGameState, loadGameState, saveGameState, saveBestScore } from '../../systems/dataStore.js';

function loadValidatedState() {
    const savedState = loadGameState();
    if (!savedState || typeof savedState !== 'object') {
        return null;
    }
    if (savedState.version && savedState.version !== 1) {
        return null;
    }
    return savedState;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toInt(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    return Math.floor(num);
}

function applySavedResources(game, savedState) {
    const targetWave = clamp(toInt(savedState.wave, 1), 1, game.maxWaves);
    game.lives = clamp(toInt(savedState.lives, game.initialLives), 0, 99);
    const savedEnergy = savedState.energy ?? savedState.gold;
    game.energy = clamp(toInt(savedEnergy, game.initialEnergy), 0, 9999);
    game.score = clamp(toInt(savedState.score, 0), 0, 9999999);
    const savedBestScore = clamp(toInt(savedState.bestScore, game.bestScore ?? 0), 0, 9999999);
    if (!Number.isFinite(game.bestScore) || savedBestScore > game.bestScore) {
        game.bestScore = savedBestScore;
        saveBestScore(game.bestScore);
    }
    game.wave = targetWave;
    game.waveInProgress = false;
    game.spawned = 0;
    game.spawnTimer = 0;
    game.enemies = [];
    game.projectiles = [];
    game.explosions = [];
    game.mergeAnimations = [];
    game.maxProjectileRadius = game.projectileRadius;
    return targetWave;
}

function configureWaveAfterRestore(game, waveNumber) {
    const index = waveNumber - 1;
    const fallback = game.waveConfigs.at(-1);
    const cfg = game.waveConfigs[index] ?? fallback;
    game.spawnInterval = cfg.interval;
    game.enemiesPerWave = cfg.cycles;
    game.prepareTankScheduleForWave(cfg, waveNumber);
}

function createTowerInCell(game, cell, towerState) {
    const color = typeof towerState?.color === 'string' ? towerState.color : 'red';
    const level = Number(towerState?.level) || 1;
    const tower = new Tower(cell.x, cell.y, color, level);
    tower.alignToCell(cell);
    tower.cell = cell;
    tower.lastShot = 0;
    tower.flashTimer = 0;
    tower.placementFlashTimer = 0;
    cell.occupied = true;
    cell.tower = tower;
    game.towers.push(tower);
}

function rebuildTowers(game, towersState) {
    game.towers = [];
    game.grid.resetCells();
    if (!Array.isArray(towersState)) {
        return;
    }
    towersState.forEach(towerState => {
        const cell = game.resolveCellFromState(towerState?.cellId);
        if (!cell) {
            return;
        }
        createTowerInCell(game, cell, towerState);
    });
}

function identifyCell(game, cell) {
    const topIndex = game.topCells.indexOf(cell);
    if (topIndex !== -1) {
        return `top:${topIndex}`;
    }
    const bottomIndex = game.bottomCells.indexOf(cell);
    if (bottomIndex !== -1) {
        return `bottom:${bottomIndex}`;
    }
    return null;
}

function resolveCell(game, identifier) {
    if (typeof identifier !== 'string') {
        return null;
    }
    const [group, indexRaw] = identifier.split(':');
    const index = Number(indexRaw);
    if (!Number.isInteger(index) || index < 0) {
        return null;
    }
    if (group === 'top') {
        return game.topCells[index] ?? null;
    }
    if (group === 'bottom') {
        return game.bottomCells[index] ?? null;
    }
    return null;
}

function snapshotTowers(game) {
    return game.towers
        .filter(tower => tower?.cell)
        .map(tower => ({
            cellId: game.createCellIdentifier(tower.cell),
            color: tower.color,
            level: tower.level,
        }))
        .filter(entry => entry.cellId !== null);
}

function persistGameState(game) {
    if (!game.persistenceEnabled || game.isRestoringState || game.gameOver) {
        return;
    }
    const snapshot = game.getPersistentState();
    saveGameState(snapshot);
}

function restoreState(game) {
    const savedState = loadValidatedState();
    if (!savedState) {
        return;
    }
    game.isRestoringState = true;
    const waveNumber = applySavedResources(game, savedState);
    configureWaveAfterRestore(game, waveNumber);
    game.restoreTowers(savedState.towers);
    game.isRestoringState = false;
}

const statePersistence = {
    restoreSavedState() {
        restoreState(this);
    },

    restoreTowers(towersState) {
        rebuildTowers(this, towersState);
    },

    resolveCellFromState(identifier) {
        return resolveCell(this, identifier);
    },

    createCellIdentifier(cell) {
        return identifyCell(this, cell);
    },

    getPersistentState() {
        return {
            version: 1,
            lives: this.lives,
            energy: this.energy,
            wave: this.wave,
            score: Number.isFinite(this.score) ? this.score : 0,
            bestScore: Number.isFinite(this.bestScore) ? this.bestScore : 0,
            towers: snapshotTowers(this),
        };
    },

    persistState() {
        persistGameState(this);
    },

    clearSavedState() {
        clearGameState();
    },
};

export default statePersistence;
