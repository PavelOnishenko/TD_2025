import { ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import { MapDisplayConfig } from '../../types/game.js';

export type DeveloperUI = {
    modal: HTMLElement;
    eventType: HTMLSelectElement;
    queueList: HTMLElement;
    encounterTypeSummary: HTMLElement;
    encounterTypeToggles: Record<RandomEncounterType, HTMLInputElement>;
    nextRollSummary: HTMLElement;
    nextRollModal: HTMLElement;
    nextRollTotal: HTMLElement;
    nextRollStatus: HTMLElement;
    nextRollInputs: Record<'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence', HTMLInputElement>;
    randomModeSelect: HTMLSelectElement;
    randomSeedInput: HTMLInputElement;
    randomSummary: HTMLElement;
    randomStatus: HTMLElement;
    randomApplyBtn: HTMLButtonElement;
    everythingDiscoveredToggle: HTMLInputElement;
    fogOfWarToggle: HTMLInputElement;
};

export type DeveloperCallbacks = {
    addVillageLog: (message: string, type?: string) => void;
    getEventLabel: (type: ForcedEncounterType) => string;
    getMapDisplayConfig: () => MapDisplayConfig;
    setMapDisplayConfig: (config: Partial<MapDisplayConfig>) => void;
};

export const ENCOUNTER_LABELS: Record<RandomEncounterType, string> = { monster: 'Monster', item: 'Item', traveler: 'Traveler' };
