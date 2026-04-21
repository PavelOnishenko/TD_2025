import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Player from '../../entities/player/Player.js';
import MagicSystem from '../../systems/controllers/magic/MagicSystem.js';
import { QuestNode } from '../../systems/quest/QuestTypes.js';

export type GameSaveState = {
    version: 1;
    worldMap: Record<string, unknown>;
    player: Record<string, unknown>;
    spellLevels: Record<string, number>;
    quest: QuestNode | null;
    sideQuests?: QuestNode[];
    time?: Record<string, unknown>;
    worldSimulation?: Record<string, unknown>;
};

export default class GamePersistenceRuntime {
    private lastSavedSnapshot = '';

    public constructor(private readonly saveKey: string) {}

    // eslint-disable-next-line style-guide/function-length-warning
    public saveGameIfChanged(
        worldMap: WorldMap,
        player: Player,
        magicSystem: MagicSystem,
        activeQuest: QuestNode | null,
        activeSideQuests: QuestNode[] = [],
        timeState?: Record<string, unknown>,
        worldSimulationState?: Record<string, unknown>,
    ): void {
        const snapshot = JSON.stringify({
            version: 1,
            worldMap: worldMap.getState(),
            player: player.getState(),
            spellLevels: magicSystem.getSpellLevels(),
            quest: activeQuest,
            sideQuests: activeSideQuests,
            time: timeState,
            worldSimulation: worldSimulationState,
        } as GameSaveState);
        if (snapshot === this.lastSavedSnapshot) {
            return;
        }
        this.lastSavedSnapshot = snapshot;
        window.localStorage.setItem(this.saveKey, snapshot);
    }

    public loadGame(worldMap: WorldMap, player: Player, magicSystem: MagicSystem): void {
        const parsed = this.getParsedSaveState();
        if (!parsed || !parsed.player || !parsed.worldMap || !parsed.spellLevels) {
            return;
        }
        worldMap.restoreState(parsed.worldMap);
        player.restoreState(parsed.player);
        magicSystem.restoreSpellLevels(parsed.spellLevels);
        const [x, y] = worldMap.getPlayerPixelPosition();
        player.x = x;
        player.y = y;
    }

    public getParsedSaveState(): Partial<GameSaveState> | null {
        const raw = window.localStorage.getItem(this.saveKey);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<GameSaveState>;
            return parsed.version === 1 ? parsed : null;
        } catch {
            console.warn('Failed to parse save data, starting a new character.');
            return null;
        }
    }
}
