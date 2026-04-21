/* eslint-disable style-guide/file-length-warning */
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Player from '../../entities/player/Player.js';
import MagicSystem from '../../systems/controllers/magic/MagicSystem.js';
import { QuestNode } from '../../systems/quest/QuestTypes.js';

const CURRENT_SAVE_VERSION = 2;

export type GameSaveState = {
    version: typeof CURRENT_SAVE_VERSION;
    worldMap: Record<string, unknown>;
    player: Record<string, unknown>;
    spellLevels: Record<string, number>;
    quest: QuestNode | null;
    sideQuests?: QuestNode[];
    time?: Record<string, unknown>;
    worldSimulation: Record<string, unknown>;
};

export default class GamePersistenceRuntime {
    private lastSavedSnapshot = '';
    private lastSnapshotHash = '';
    private lastSavedAtIso: string | null = null;
    private lastLoadedAtIso: string | null = null;
    private lastLoadedSaveVersion: number | null = null;

    public constructor(private readonly saveKey: string, private readonly legacySaveKeys: string[] = []) {}

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
            version: CURRENT_SAVE_VERSION,
            worldMap: worldMap.getState(),
            player: player.getState(),
            spellLevels: magicSystem.getSpellLevels(),
            quest: activeQuest,
            sideQuests: activeSideQuests,
            time: timeState,
            worldSimulation: this.sanitizeWorldSimulationState(worldSimulationState),
        } as GameSaveState);
        if (snapshot === this.lastSavedSnapshot) {
            return;
        }
        this.lastSavedSnapshot = snapshot;
        this.lastSnapshotHash = this.createSnapshotHash(snapshot);
        this.lastSavedAtIso = new Date().toISOString();
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
        this.lastLoadedAtIso = new Date().toISOString();
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public getParsedSaveState(): Partial<GameSaveState> | null {
        const availableSave = this.getRawSaveWithSource();
        if (!availableSave?.raw) {
            return null;
        }
        const parsed = this.parseRawSave(availableSave.raw);
        if (!parsed) {
            return null;
        }
        this.lastSnapshotHash = this.createSnapshotHash(availableSave.raw);
        this.lastLoadedSaveVersion = typeof parsed.version === 'number' ? parsed.version : null;
        const migrated = this.migrateToCurrentVersion(parsed);
        if (!migrated) {
            return null;
        }
        if (availableSave.sourceKey !== this.saveKey || parsed.version !== CURRENT_SAVE_VERSION) {
            window.localStorage.setItem(this.saveKey, JSON.stringify(migrated));
        }
        return migrated;
    }

    public readonly getOverview = (): {
        key: string;
        version: number;
        loadedVersion: number | null;
        snapshotHash: string | null;
        lastSavedAt: string | null;
        lastLoadedAt: string | null;
    } => ({
        key: this.saveKey,
        version: CURRENT_SAVE_VERSION,
        loadedVersion: this.lastLoadedSaveVersion,
        snapshotHash: this.lastSnapshotHash || null,
        lastSavedAt: this.lastSavedAtIso,
        lastLoadedAt: this.lastLoadedAtIso,
    });

    private getRawSaveWithSource(): { sourceKey: string; raw: string } | null {
        const knownKeys = [this.saveKey, ...this.legacySaveKeys];
        for (const candidateKey of knownKeys) {
            const raw = window.localStorage.getItem(candidateKey);
            if (raw) {
                return { sourceKey: candidateKey, raw };
            }
        }
        return null;
    }

    private parseRawSave(raw: string): Partial<GameSaveState> | null {
        try {
            return JSON.parse(raw) as Partial<GameSaveState>;
        } catch {
            console.warn('Failed to parse save data, starting a new character.');
            return null;
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private migrateToCurrentVersion(parsed: Partial<GameSaveState>): GameSaveState | null {
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        const worldMap = this.asRecord(parsed.worldMap);
        const player = this.asRecord(parsed.player);
        const spellLevels = this.asSpellLevelRecord(parsed.spellLevels);
        if (!worldMap || !player || !spellLevels) {
            return null;
        }
        const legacyWorldSimulation = this.extractLegacyWorldSimulation(parsed);
        const worldSimulation = this.sanitizeWorldSimulationState({ ...legacyWorldSimulation, ...this.asRecord(parsed.worldSimulation) });
        return {
            version: CURRENT_SAVE_VERSION,
            worldMap,
            player,
            spellLevels,
            quest: parsed.quest ?? null,
            sideQuests: Array.isArray(parsed.sideQuests) ? parsed.sideQuests : [],
            time: this.asRecord(parsed.time),
            worldSimulation,
        };
    }

    private extractLegacyWorldSimulation(parsed: Partial<GameSaveState>): Record<string, unknown> {
        const parsedAsRecord = parsed as Record<string, unknown>;
        return {
            npcs: this.asArray(parsedAsRecord.npcs),
            monsters: this.asArray(parsedAsRecord.monsters),
            conflicts: this.asArray(parsedAsRecord.conflicts),
            factionControl: this.asRecord(parsedAsRecord.factionControl) ?? {},
        };
    }

    private sanitizeWorldSimulationState(worldSimulationState?: Record<string, unknown>): Record<string, unknown> {
        if (!worldSimulationState || typeof worldSimulationState !== 'object') {
            return {};
        }
        return { ...worldSimulationState };
    }

    private asRecord(value: unknown): Record<string, unknown> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        return value as Record<string, unknown>;
    }

    private readonly asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

    private asSpellLevelRecord(value: unknown): Record<string, number> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        return Object.entries(value as Record<string, unknown>).reduce((acc, [key, level]) => {
            if (typeof level === 'number' && Number.isFinite(level)) {
                acc[key] = level;
            }
            return acc;
        }, {} as Record<string, number>);
    }

    private createSnapshotHash(snapshot: string): string {
        let hash = 5381;
        for (let index = 0; index < snapshot.length; index += 1) {
            hash = ((hash << 5) + hash) + snapshot.charCodeAt(index);
            hash |= 0;
        }
        return `djb2:${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }
}
