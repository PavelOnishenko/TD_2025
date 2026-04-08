import Tower from '../../entities/Tower.js';
import { clearGameState, loadGameState, saveBestScore, saveGameState } from '../../systems/dataStore.js';
export type SavedTowerState = { cellId?: string; color?: string; level?: number };
export type SavedGameState = {
    version?: number; wave?: number; lives?: number; energy?: number; gold?: number;
    score?: number; bestScore?: number; towers?: SavedTowerState[];
};
export type GridCell = { x: number; y: number; occupied: boolean; tower: Tower | null };
export type GameLike = any;
type RuntimeTower = Tower & { cell?: GridCell; color: string; level: number; lastShot?: number; flashTimer?: number; placementFlashTimer?: number };
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const toInt = (value: unknown, fallback: number): number => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.floor(num) : fallback;
};
export class PersistedStateValidator {
    public load(): SavedGameState | null {
        const savedState = loadGameState() as SavedGameState | null;
        if (!savedState || typeof savedState !== 'object') {
            return null;
        }
        if (savedState.version && savedState.version !== 1) {
            return null;
        }
        return savedState;
    }
}
export class TowerStateMapper {
    public createCellIdentifier(game: GameLike, cell: GridCell): string | null {
        const topIndex = game.topCells.indexOf(cell);
        if (topIndex !== -1) {
            return `top:${topIndex}`;
        }
        const bottomIndex = game.bottomCells.indexOf(cell);
        return bottomIndex !== -1 ? `bottom:${bottomIndex}` : null;
    }
    public resolveCellFromState(game: GameLike, identifier: string): GridCell | null {
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
    public snapshotTowers(game: GameLike): SavedTowerState[] {
        const towers = game.towers
            .filter((tower: RuntimeTower) => tower?.cell)
            .map((tower: RuntimeTower) => ({ cellId: this.createCellIdentifier(game, tower.cell as GridCell), color: tower.color, level: tower.level }))
            .filter((entry: SavedTowerState) => entry.cellId !== null);
        return towers;
    }
    public rebuildTowers(game: GameLike, towersState: SavedTowerState[] | undefined): void {
        game.towers = [];
        game.grid.resetCells();
        if (!Array.isArray(towersState)) {
            return;
        }
        towersState.forEach((towerState: SavedTowerState) => {
            const cell = this.resolveCellFromState(game, towerState?.cellId ?? '');
            if (cell) {
                this.createTowerInCell(game, cell, towerState);
            }
        });
    }
    private createTowerInCell(game: GameLike, cell: GridCell, towerState: SavedTowerState): void {
        const color = typeof towerState?.color === 'string' ? towerState.color : 'red';
        const level = Number(towerState?.level) || 1;
        const tower = new Tower(cell.x, cell.y, color, level) as RuntimeTower;
        tower.alignToCell(cell);
        tower.cell = cell;
        tower.lastShot = 0;
        tower.flashTimer = 0;
        tower.placementFlashTimer = 0;
        cell.occupied = true;
        cell.tower = tower;
        game.towers.push(tower);
    }
}
export class GameStateRestorer {
    public applySavedResources(game: GameLike, savedState: SavedGameState): number {
        const targetWave = clamp(toInt(savedState.wave, 1), 1, 9999);
        game.lives = clamp(toInt(savedState.lives, game.initialLives), 0, 99);
        game.energy = clamp(toInt(savedState.energy ?? savedState.gold, game.initialEnergy), 0, 999999);
        this.applyScoreState(game, savedState);
        this.applyWaveState(game, targetWave);
        this.resetWaveObjects(game);
        return targetWave;
    }
    public configureWaveAfterRestore(game: GameLike, waveNumber: number): void {
        const index = waveNumber - 1;
        const fallback = game.waveConfigs[game.waveConfigs.length - 1];
        const cfg = typeof game.getOrCreateWaveConfig === 'function'
            ? game.getOrCreateWaveConfig(waveNumber)
            : game.waveConfigs[index] ?? fallback;
        game.enemiesPerWave = 0;
        game.prepareTankScheduleForWave(cfg, waveNumber, 0);
        game.activeFormationPlan = null;
        game.waveSpawnSchedule = null;
        game.waveSpawnCursor = 0;
        game.waveElapsed = 0;
    }
    private applyScoreState(game: GameLike, savedState: SavedGameState): void {
        if (!game.scoreManager) {
            return;
        }
        const score = clamp(toInt(savedState.score, 0), 0, 9999999);
        game.scoreManager.setScore(score);
        const fallbackBest = game.scoreManager.getBestScore();
        const bestScore = clamp(toInt(savedState.bestScore, fallbackBest), 0, 9999999);
        if (bestScore > fallbackBest) {
            game.scoreManager.setBestScore(bestScore);
            saveBestScore(bestScore);
        }
    }
    private applyWaveState(game: GameLike, targetWave: number): void {
        if (typeof game.ensureEndlessWaveTracking === 'function') {
            game.ensureEndlessWaveTracking();
        }
        game.wave = targetWave;
        if (typeof game.getOrCreateWaveConfig === 'function') {
            game.getOrCreateWaveConfig(targetWave);
        }
        if (typeof game.getEnemyHpForWave === 'function') {
            game.getEnemyHpForWave(targetWave);
        }
        const endlessMode = typeof game.isEndlessWave === 'function'
            ? game.isEndlessWave(targetWave)
            : Number.isFinite(game.maxWaves) && targetWave > game.maxWaves;
        game.endlessModeActive = endlessMode;
    }

    private resetWaveObjects(game: GameLike): void {
        game.waveInProgress = false;
        game.spawned = 0;
        game.spawnTimer = 0;
        game.enemies = [];
        game.projectiles = [];
        game.explosions = [];
        game.mergeAnimations = [];
        game.maxProjectileRadius = game.projectileRadius;
    }
}
export class StatePersistenceService {
    private readonly validator = new PersistedStateValidator();
    private readonly mapper = new TowerStateMapper();
    private readonly restorer = new GameStateRestorer();
    public restoreSavedState(game: GameLike): void {
        const savedState = this.validator.load();
        if (!savedState) {
            return;
        }
        game.isRestoringState = true;
        const waveNumber = this.restorer.applySavedResources(game, savedState);
        this.restorer.configureWaveAfterRestore(game, waveNumber);
        this.mapper.rebuildTowers(game, savedState.towers);
        game.isRestoringState = false;
    }
    public persistState(game: GameLike): void {
        if (!game.persistenceEnabled || game.isRestoringState || game.gameOver) {
            return;
        }
        saveGameState(this.getPersistentState(game));
    }
    public getPersistentState(game: GameLike): SavedGameState {
        const state: SavedGameState = {
            version: 1,
            lives: game.lives,
            energy: game.energy,
            wave: game.wave,
            score: game.scoreManager ? game.scoreManager.getCurrentScore() : 0,
            bestScore: game.scoreManager ? game.scoreManager.getBestScore() : 0,
            towers: this.mapper.snapshotTowers(game),
        };
        return state;
    }
    public restoreTowers(game: GameLike, towersState: SavedTowerState[]): void { this.mapper.rebuildTowers(game, towersState); }
    public resolveCellFromState(game: GameLike, identifier: string): GridCell | null {
        const cell = this.mapper.resolveCellFromState(game, identifier);
        return cell;
    }
    public createCellIdentifier(game: GameLike, cell: GridCell): string | null {
        const cellId = this.mapper.createCellIdentifier(game, cell);
        return cellId;
    }
    public clearSavedState(): void { clearGameState(); }
}
