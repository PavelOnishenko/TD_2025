import type { RandomEncounterType } from '../encounter/EncounterSystem.js';
import type { BattleUI, VillageUI, WorldUI } from './GameUiSceneModels.js';
import type { HudElements } from './GameUiHudElementsModel.js';

export class DeveloperUiModel {
    public modal!: HTMLElement;
    public closeBtn!: HTMLButtonElement;
    public eventType!: HTMLSelectElement;
    public queueList!: HTMLElement;
    public addBtn!: HTMLButtonElement;
    public clearBtn!: HTMLButtonElement;
    public encounterTypeSummary!: HTMLElement;
    public enableAllEncountersBtn!: HTMLButtonElement;
    public disableAllEncountersBtn!: HTMLButtonElement;
    public encounterTypeToggles!: Record<RandomEncounterType, HTMLInputElement>;
    public nextRollOpenBtn!: HTMLButtonElement;
    public nextRollSummary!: HTMLElement;
    public nextRollModal!: HTMLElement;
    public nextRollCloseBtn!: HTMLButtonElement;
    public nextRollTotal!: HTMLElement;
    public nextRollStatus!: HTMLElement;
    public nextRollSaveBtn!: HTMLButtonElement;
    public nextRollClearBtn!: HTMLButtonElement;
    public nextRollInputs!: Record<'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence', HTMLInputElement>;
    public randomModeSelect!: HTMLSelectElement;
    public randomSeedInput!: HTMLInputElement;
    public randomSummary!: HTMLElement;
    public randomStatus!: HTMLElement;
    public randomApplyBtn!: HTMLButtonElement;
    public everythingDiscoveredToggle!: HTMLInputElement;
    public fogOfWarToggle!: HTMLInputElement;
}

export type DeveloperUI = DeveloperUiModel;

export class GameLogUiModel {
    public log!: HTMLElement;
}

export type GameLogUI = GameLogUiModel;

export class GameUiBundleModel {
    public hudElements!: HudElements;
    public worldUI!: WorldUI;
    public battleUI!: BattleUI;
    public villageUI!: VillageUI;
    public gameLogUI!: GameLogUI;
    public developerUI!: DeveloperUI;
}

export type GameUiBundle = GameUiBundleModel;
