/* eslint-disable style-guide/function-length-error, style-guide/arrow-function-style, style-guide/file-length-warning, style-guide/function-length-warning */
import { NpcDisposition, VillageNpcProfile } from './VillageDialogueEngine.js';

export type VillageNpcLifeStatus = 'alive' | 'dead';

export type VillageNpcPassport = {
    id: string;
    key: string;
    name: string;
    villageName: string;
    occupation: string;
    personality: NpcDisposition;
    speechStyle: string;
    look: string;
};

export type VillageNpcRosterEntry = {
    passport: VillageNpcPassport;
    lifeStatus: VillageNpcLifeStatus;
    firstSeenAtTick: number;
    lastUpdatedAtTick: number;
    sourceTag: string;
};

export type VillageNpcRosterState = {
    entries: VillageNpcRosterEntry[];
    tickCounter: number;
};

export class VillageRosterIntegrityError extends Error {
    public readonly shortMessage: string;
    public readonly fullMessage: string;

    public constructor(shortMessage: string, fullMessage: string) {
        super(fullMessage);
        this.name = 'VillageRosterIntegrityError';
        this.shortMessage = shortMessage;
        this.fullMessage = fullMessage;
    }
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export default class VillageNpcRoster {
    private entriesByKey: Map<string, VillageNpcRosterEntry> = new Map();
    private tickCounter = 0;

    public clear(): void {
        this.entriesByKey.clear();
        this.tickCounter = 0;
    }

    public hasVillage(villageName: string): boolean {
        const villageKey = normalize(villageName);
        if (!villageKey) {
            return false;
        }
        for (const entry of this.entriesByKey.values()) {
            if (normalize(entry.passport.villageName) === villageKey) {
                return true;
            }
        }
        return false;
    }

    public upsert(villageName: string, npc: VillageNpcProfile, sourceTag: string): VillageNpcRosterEntry {
        const key = this.getKey(villageName, npc.name);
        const nowTick = this.nextTick();
        const existing = this.entriesByKey.get(key);
        const normalizedVillage = villageName.trim();
        if (existing) {
            existing.passport = {
                ...existing.passport,
                name: npc.name,
                villageName: normalizedVillage,
                occupation: npc.role,
                personality: npc.disposition,
                speechStyle: npc.speechStyle,
                look: npc.look,
            };
            existing.lastUpdatedAtTick = nowTick;
            existing.sourceTag = sourceTag;
            this.entriesByKey.set(key, existing);
            return existing;
        }

        const created: VillageNpcRosterEntry = {
            passport: {
                id: npc.id,
                key,
                name: npc.name,
                villageName: normalizedVillage,
                occupation: npc.role,
                personality: npc.disposition,
                speechStyle: npc.speechStyle,
                look: npc.look,
            },
            lifeStatus: 'alive',
            firstSeenAtTick: nowTick,
            lastUpdatedAtTick: nowTick,
            sourceTag,
        };
        this.entriesByKey.set(key, created);
        return created;
    }

    public markDead(villageName: string, npcName: string): void {
        const key = this.getKey(villageName, npcName);
        const entry = this.entriesByKey.get(key);
        if (!entry) {
            return;
        }
        entry.lifeStatus = 'dead';
        entry.lastUpdatedAtTick = this.nextTick();
    }

    public getVillageProfiles(villageName: string): VillageNpcProfile[] {
        const villageKey = normalize(villageName);
        const entries = Array.from(this.entriesByKey.values())
            .filter((entry) => normalize(entry.passport.villageName) === villageKey)
            .sort((left, right) => left.passport.name.localeCompare(right.passport.name));

        return entries.map((entry) => this.toProfile(entry));
    }

    public getAllEntries(villageFilter: string = ''): VillageNpcRosterEntry[] {
        const normalizedFilter = normalize(villageFilter);
        return Array.from(this.entriesByKey.values())
            .filter((entry) => !normalizedFilter || normalize(entry.passport.villageName) === normalizedFilter)
            .sort((left, right) => {
                const villageCompare = left.passport.villageName.localeCompare(right.passport.villageName);
                if (villageCompare !== 0) {
                    return villageCompare;
                }
                return left.passport.name.localeCompare(right.passport.name);
            })
            .map((entry) => ({ ...entry, passport: { ...entry.passport } }));
    }

    public getVillageNames(): string[] {
        return Array.from(new Set(Array.from(this.entriesByKey.values()).map((entry) => entry.passport.villageName)))
            .sort((left, right) => left.localeCompare(right));
    }

    public getState(): VillageNpcRosterState {
        return { entries: this.getAllEntries(), tickCounter: this.tickCounter };
    }

    public restoreState(state: unknown): void {
        if (!state || typeof state !== 'object') {
            return;
        }
        const record = state as { entries?: unknown; tickCounter?: unknown };
        const rawEntries = Array.isArray(record.entries) ? record.entries : [];
        const entries = rawEntries
            .filter((entry): entry is VillageNpcRosterEntry => this.isRosterEntry(entry))
            .map((entry) => ({ ...entry, passport: { ...entry.passport } }));
        this.entriesByKey = new Map(entries.map((entry) => [entry.passport.key, entry]));
        this.tickCounter = typeof record.tickCounter === 'number' && Number.isFinite(record.tickCounter) ? Math.max(0, Math.floor(record.tickCounter)) : entries.reduce((max, entry) => Math.max(max, entry.lastUpdatedAtTick), 0);
    }

    public assertNpcExistsInVillage(villageName: string, npcName: string, context: string): void {
        const key = this.getKey(villageName, npcName);
        const entry = this.entriesByKey.get(key);
        if (entry) {
            return;
        }
        const shortMessage = `Roster integrity violation: ${npcName} is missing in ${villageName}.`;
        const fullMessage = `${shortMessage}\nContext: ${context}\nRoster key searched: ${key}\nKnown villages: ${this.getVillageNames().join(', ') || '(none)'}`;
        throw new VillageRosterIntegrityError(shortMessage, fullMessage);
    }

    private toProfile(entry: VillageNpcRosterEntry): VillageNpcProfile {
        const lifeSuffix = entry.lifeStatus === 'dead' ? ' [DEAD]' : '';
        return {
            id: entry.passport.id,
            name: entry.passport.name,
            role: `${entry.passport.occupation}${lifeSuffix}`,
            look: entry.passport.look,
            speechStyle: entry.passport.speechStyle,
            disposition: entry.passport.personality,
        };
    }

    private getKey(villageName: string, npcName: string): string {
        return `${normalize(villageName)}::${normalize(npcName)}`;
    }

    private nextTick(): number {
        this.tickCounter += 1;
        return this.tickCounter;
    }

    private isRosterEntry(entry: unknown): entry is VillageNpcRosterEntry {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        const record = entry as Record<string, unknown>;
        const passport = record.passport;
        if (!passport || typeof passport !== 'object') {
            return false;
        }
        const passportRecord = passport as Record<string, unknown>;
        const lifeStatus = record.lifeStatus;
        return typeof passportRecord.id === 'string'
            && typeof passportRecord.key === 'string'
            && typeof passportRecord.name === 'string'
            && typeof passportRecord.villageName === 'string'
            && typeof passportRecord.occupation === 'string'
            && typeof passportRecord.personality === 'string'
            && typeof passportRecord.speechStyle === 'string'
            && typeof passportRecord.look === 'string'
            && (lifeStatus === 'alive' || lifeStatus === 'dead')
            && typeof record.firstSeenAtTick === 'number'
            && typeof record.lastUpdatedAtTick === 'number'
            && typeof record.sourceTag === 'string';
    }
}
