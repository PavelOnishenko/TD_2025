import EncounterSystem, { ForcedEncounterType, RANDOM_ENCOUNTER_TYPES, RandomEncounterType } from './EncounterSystem.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import {
    clearNextCharacterRollAllocation,
    createEmptyNextCharacterRollAllocation,
    getNextCharacterRollAllocationTotal,
    getPlayerStats,
    loadNextCharacterRollAllocation,
    normalizeNextCharacterRollAllocation,
    saveNextCharacterRollAllocation,
    summarizeNextCharacterRollAllocation,
} from '../../utils/NextCharacterRollConfig.js';

type DeveloperUI = {
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
};

type DeveloperCallbacks = {
    addVillageLog: (message: string, type?: string) => void;
    getEventLabel: (type: ForcedEncounterType) => string;
};

const ENCOUNTER_LABELS: Record<RandomEncounterType, string> = {
    monster: 'Monster',
    item: 'Item',
    village: 'Village',
    traveler: 'Traveler',
};
export default class DeveloperEventController {
    private developerUI: DeveloperUI;
    private encounterSystem: EncounterSystem;
    private callbacks: DeveloperCallbacks;

    constructor(developerUI: DeveloperUI, encounterSystem: EncounterSystem, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.encounterSystem = encounterSystem;
        this.callbacks = callbacks;
    }
    public toggleModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.modal.classList.contains('hidden');

        this.developerUI.modal.classList.toggle('hidden', !shouldShow);
        if (shouldShow) {
            this.renderQueue();
            this.renderEncounterTypeControls();
            this.renderNextCharacterRollSummary();
        }
    }
    public handleQueueAdd(): void {
        const type = this.developerUI.eventType.value as ForcedEncounterType;
        this.encounterSystem.queueForcedEncounter(type);
        this.renderQueue();
        this.callbacks.addVillageLog(`[DEV] Queued event: ${this.callbacks.getEventLabel(type)}`, 'system');
    }
    public handleQueueClear(): void {
        this.encounterSystem.clearForcedEncounters();
        this.renderQueue();
    }
    public handleEncounterTypeToggle(type: RandomEncounterType, enabled: boolean): void {
        this.encounterSystem.setEncounterTypeEnabled(type, enabled);
        this.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${ENCOUNTER_LABELS[type]} encounters ${enabled ? 'enabled' : 'disabled'}.`, 'system');
    }
    public handleEncounterTypesToggleAll(enabled: boolean): void {
        this.encounterSystem.setAllEncounterTypesEnabled(enabled);
        this.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${enabled ? 'Enabled' : 'Disabled'} all random encounter types.`, 'system');
    }
    public toggleNextCharacterRollModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.nextRollModal.classList.contains('hidden');

        this.developerUI.nextRollModal.classList.toggle('hidden', !shouldShow);
        if (shouldShow) {
            this.renderNextCharacterRollEditor();
        }
    }
    public handleNextCharacterRollInputChanged(): void {
        this.renderNextCharacterRollEditor(this.readNextCharacterRollInputs());
    }
    public handleNextCharacterRollSave(): void {
        const allocation = this.readNextCharacterRollInputs();
        const total = getNextCharacterRollAllocationTotal(allocation);
        const expectedTotal = Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);

        if (total !== expectedTotal) {
            this.setNextCharacterRollStatus(`Allocate exactly ${expectedTotal} points before saving.`, true);
            return;
        }

        saveNextCharacterRollAllocation(allocation);
        this.setNextCharacterRollStatus('Next new character roll saved.', false);
        this.renderNextCharacterRollSummary();
        this.callbacks.addVillageLog(`[DEV] Next character roll saved: ${summarizeNextCharacterRollAllocation(allocation)}`, 'system');
    }
    public handleNextCharacterRollClear(): void {
        clearNextCharacterRollAllocation();
        const emptyAllocation = createEmptyNextCharacterRollAllocation();
        this.writeNextCharacterRollInputs(emptyAllocation);
        this.renderNextCharacterRollEditor(emptyAllocation);
        this.renderNextCharacterRollSummary();
        this.callbacks.addVillageLog('[DEV] Cleared next character roll override.', 'system');
    }
    public renderQueue(): void {
        const queue = this.encounterSystem.getForcedEncounterQueue();
        this.developerUI.queueList.innerHTML = '';

        if (queue.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No queued events.';
            this.developerUI.queueList.appendChild(item);
            return;
        }

        queue.forEach((entry, index) => {
            const item = document.createElement('li');
            item.textContent = `${index + 1}. ${this.callbacks.getEventLabel(entry)}`;
            this.developerUI.queueList.appendChild(item);
        });
    }

    private renderEncounterTypeControls(): void {
        const states = this.encounterSystem.getEncounterTypeStates();
        RANDOM_ENCOUNTER_TYPES.forEach((type) => {
            this.developerUI.encounterTypeToggles[type].checked = states[type];
        });
        this.developerUI.encounterTypeSummary.textContent = this.createEncounterSummary(states);
    }

    private createEncounterSummary(states: Record<RandomEncounterType, boolean>): string {
        const enabledLabels = RANDOM_ENCOUNTER_TYPES.filter((type) => states[type]).map((type) => ENCOUNTER_LABELS[type]);
        if (enabledLabels.length === 0) {
            return 'Random encounters disabled. Forced queue still works.';
        }

        return `Enabled random encounters: ${enabledLabels.join(', ')}.`;
    }

    private renderNextCharacterRollSummary(): void {
        const allocation = loadNextCharacterRollAllocation();
        const expectedTotal = Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);

        if (!allocation) {
            this.developerUI.nextRollSummary.textContent = `Next character roll: random (${expectedTotal} points).`;
            return;
        }

        this.developerUI.nextRollSummary.textContent = `Next character roll: ${summarizeNextCharacterRollAllocation(allocation)} (${getNextCharacterRollAllocationTotal(allocation)}/${expectedTotal} points).`;
    }

    private renderNextCharacterRollEditor(allocation = loadNextCharacterRollAllocation() ?? createEmptyNextCharacterRollAllocation()): void {
        const normalizedAllocation = normalizeNextCharacterRollAllocation(allocation);
        const total = getNextCharacterRollAllocationTotal(normalizedAllocation);
        const expectedTotal = Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);

        this.writeNextCharacterRollInputs(normalizedAllocation);
        this.developerUI.nextRollTotal.textContent = `${total} / ${expectedTotal}`;
        this.setNextCharacterRollStatus(this.getNextCharacterRollStatus(total, expectedTotal), total !== expectedTotal);
    }

    private getNextCharacterRollStatus(total: number, expectedTotal: number): string {
        if (total === expectedTotal) {
            return 'Saved setup will be consumed by the next new character only.';
        }

        return `Allocate exactly ${expectedTotal} points to save this roll.`;
    }

    private setNextCharacterRollStatus(message: string, isError: boolean): void {
        this.developerUI.nextRollStatus.textContent = message;
        this.developerUI.nextRollStatus.classList.toggle('dev-events-status-error', isError);
    }

    private readNextCharacterRollInputs() {
        const allocation = createEmptyNextCharacterRollAllocation();
        getPlayerStats().forEach((stat) => {
            const value = Number.parseInt(this.developerUI.nextRollInputs[stat].value || '0', 10) || 0;
            allocation[stat] = Math.max(0, Math.floor(value));
        });
        return allocation;
    }

    private writeNextCharacterRollInputs(allocation: ReturnType<typeof createEmptyNextCharacterRollAllocation>): void {
        getPlayerStats().forEach((stat) => {
            this.developerUI.nextRollInputs[stat].value = String(allocation[stat]);
        });
    }
}
