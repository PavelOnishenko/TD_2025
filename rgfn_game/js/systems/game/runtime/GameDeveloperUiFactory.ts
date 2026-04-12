import { DeveloperUI } from '../ui/GameUiTypes.js';

export class GameDeveloperUiFactory {
    // eslint-disable-next-line style-guide/function-length-warning
    public create = (): DeveloperUI => ({
        modal: document.getElementById('dev-events-modal')!,
        closeBtn: document.getElementById('dev-events-close-btn')! as HTMLButtonElement,
        eventType: document.getElementById('dev-event-type')! as HTMLSelectElement,
        queueList: document.getElementById('dev-events-queue')!,
        addBtn: document.getElementById('dev-event-add-btn')! as HTMLButtonElement,
        clearBtn: document.getElementById('dev-event-clear-btn')! as HTMLButtonElement,
        encounterTypeSummary: document.getElementById('dev-encounter-types-summary')!,
        enableAllEncountersBtn: document.getElementById('dev-encounter-types-enable-all-btn')! as HTMLButtonElement,
        disableAllEncountersBtn: document.getElementById('dev-encounter-types-disable-all-btn')! as HTMLButtonElement,
        encounterTypeToggles: this.createEncounterTypeToggles(),
        nextRollOpenBtn: document.getElementById('dev-next-roll-open-btn')! as HTMLButtonElement,
        nextRollSummary: document.getElementById('dev-next-roll-summary')!,
        nextRollModal: document.getElementById('dev-next-roll-modal')!,
        nextRollCloseBtn: document.getElementById('dev-next-roll-close-btn')! as HTMLButtonElement,
        nextRollTotal: document.getElementById('dev-next-roll-total')!,
        nextRollStatus: document.getElementById('dev-next-roll-status')!,
        nextRollSaveBtn: document.getElementById('dev-next-roll-save-btn')! as HTMLButtonElement,
        nextRollClearBtn: document.getElementById('dev-next-roll-clear-btn')! as HTMLButtonElement,
        nextRollInputs: this.createNextRollInputs(),
        randomModeSelect: document.getElementById('dev-random-mode')! as HTMLSelectElement,
        randomSeedInput: document.getElementById('dev-random-seed')! as HTMLInputElement,
        randomSummary: document.getElementById('dev-random-summary')!,
        randomStatus: document.getElementById('dev-random-status')!,
        randomApplyBtn: document.getElementById('dev-random-apply-btn')! as HTMLButtonElement,
        developerModeToggle: document.getElementById('dev-mode-enabled')! as HTMLInputElement,
        everythingDiscoveredToggle: document.getElementById('dev-map-display-everything-discovered')! as HTMLInputElement,
        fogOfWarToggle: document.getElementById('dev-map-display-fog-of-war')! as HTMLInputElement,
        worldMapProfilingToggle: document.getElementById('dev-world-map-profiling-enabled')! as HTMLInputElement,
        worldMapProfilingOpenBtn: document.getElementById('dev-world-map-profiling-open-btn')! as HTMLButtonElement,
        worldMapProfilingPanel: document.getElementById('dev-world-map-profiling-panel')!,
        worldMapProfilingDragHandle: document.getElementById('dev-world-map-profiling-drag-handle')!,
        worldMapProfilingCloseBtn: document.getElementById('dev-world-map-profiling-close-btn')! as HTMLButtonElement,
        worldMapProfilingRefreshBtn: document.getElementById('dev-world-map-profiling-refresh-btn')! as HTMLButtonElement,
        worldMapProfilingAutoRefreshToggle: document.getElementById('dev-world-map-profiling-auto-refresh')! as HTMLInputElement,
        worldMapProfilingOutput: document.getElementById('dev-world-map-profiling-output')!,
    });

    private readonly createEncounterTypeToggles = (): DeveloperUI['encounterTypeToggles'] => ({
        monster: document.getElementById('dev-encounter-type-monster')! as HTMLInputElement,
        item: document.getElementById('dev-encounter-type-item')! as HTMLInputElement,
        traveler: document.getElementById('dev-encounter-type-traveler')! as HTMLInputElement,
    });

    private readonly createNextRollInputs = (): DeveloperUI['nextRollInputs'] => ({
        vitality: document.getElementById('dev-next-roll-vitality')! as HTMLInputElement,
        toughness: document.getElementById('dev-next-roll-toughness')! as HTMLInputElement,
        strength: document.getElementById('dev-next-roll-strength')! as HTMLInputElement,
        agility: document.getElementById('dev-next-roll-agility')! as HTMLInputElement,
        connection: document.getElementById('dev-next-roll-connection')! as HTMLInputElement,
        intelligence: document.getElementById('dev-next-roll-intelligence')! as HTMLInputElement,
    });
}
