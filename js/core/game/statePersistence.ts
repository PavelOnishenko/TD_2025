import { StatePersistenceService } from './statePersistenceService.js';
import type { GameLike, GridCell, SavedTowerState } from './statePersistenceService.js';

const persistenceService = new StatePersistenceService();

const statePersistence = {
    restoreSavedState(this: GameLike) {
        persistenceService.restoreSavedState(this);
    },
    restoreTowers(this: GameLike, towersState: SavedTowerState[]) {
        persistenceService.restoreTowers(this, towersState);
    },
    resolveCellFromState(this: GameLike, identifier: string) {
        const resolved = persistenceService.resolveCellFromState(this, identifier);
        return resolved;
    },
    createCellIdentifier(this: GameLike, cell: GridCell) {
        const identifier = persistenceService.createCellIdentifier(this, cell);
        return identifier;
    },
    getPersistentState(this: GameLike) {
        const state = persistenceService.getPersistentState(this);
        return state;
    },
    persistState(this: GameLike) {
        persistenceService.persistState(this);
    },
    clearSavedState() {
        persistenceService.clearSavedState();
    },
};

export { StatePersistenceService };
export default statePersistence;
