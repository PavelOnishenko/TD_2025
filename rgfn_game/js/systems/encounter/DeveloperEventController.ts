import EncounterSystem, { ForcedEncounterType, RANDOM_ENCOUNTER_TYPES, RandomEncounterType } from './EncounterSystem.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import { MapDisplayConfig } from '../../types/game.js';
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
import {
    configureGameRandomProvider,
    getGameRandomProviderSettings,
    getNormalizedPseudoRandomSeed,
    RandomProviderMode,
} from '../../utils/RandomProvider.js';

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
    randomModeSelect: HTMLSelectElement;
    randomSeedInput: HTMLInputElement;
    randomSummary: HTMLElement;
    randomStatus: HTMLElement;
    randomApplyBtn: HTMLButtonElement;
    everythingDiscoveredToggle: HTMLInputElement;
    fogOfWarToggle: HTMLInputElement;
};

type DeveloperCallbacks = {
    addVillageLog: (message: string, type?: string) => void;
    getEventLabel: (type: ForcedEncounterType) => string;
    getMapDisplayConfig: () => MapDisplayConfig;
    setMapDisplayConfig: (config: Partial<MapDisplayConfig>) => void;
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
            this.renderRandomProviderControls();
            this.renderMapDisplayControls();
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

    public handleRandomSettingsInputChanged(): void {
        this.renderRandomProviderControls(this.readRandomSettingsInputs(), false);
    }

    public handleRandomSettingsApply(): void {
        const settings = this.readRandomSettingsInputs();
        const configured = configureGameRandomProvider(settings.mode, settings.pseudoSeed);
        this.renderRandomProviderControls(configured, true);
        this.callbacks.addVillageLog(`[DEV] Random provider set to ${this.describeRandomProviderForLog(configured)}.`, 'system');
    }

    public handleMapDisplayToggle(setting: keyof MapDisplayConfig, enabled: boolean): void {
        this.callbacks.setMapDisplayConfig({ [setting]: enabled });
        this.renderMapDisplayControls();

        const label = setting === 'everythingDiscovered' ? 'Everything discovered' : 'Fog of war';
        this.callbacks.addVillageLog(`[DEV] ${label} ${enabled ? 'enabled' : 'disabled'}.`, 'system');
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

    private renderRandomProviderControls(settings = getGameRandomProviderSettings(), wasApplied = false): void {
        const normalizedSeed = getNormalizedPseudoRandomSeed(settings.pseudoSeed);
        this.developerUI.randomModeSelect.value = settings.mode;
        this.developerUI.randomSeedInput.value = normalizedSeed;
        this.developerUI.randomSeedInput.disabled = settings.mode !== 'pseudo';
        this.developerUI.randomSummary.textContent = this.createRandomProviderSummary(settings.mode, normalizedSeed, settings.activeSeed);
        this.setRandomStatus(this.getRandomStatusMessage(settings.mode, normalizedSeed, settings.activeSeed, wasApplied), false);
    }

    private createRandomProviderSummary(mode: RandomProviderMode, pseudoSeed: string, activeSeed: string): string {
        if (mode === 'pseudo') {
            return `Random provider: pseudo random. Seed = "${pseudoSeed}". Restart with New Character to reproduce the exact same run.`;
        }

        return `Random provider: true random. Current runtime seed = "${activeSeed}".`;
    }

    private getRandomStatusMessage(mode: RandomProviderMode, pseudoSeed: string, activeSeed: string, wasApplied: boolean): string {
        if (wasApplied && mode === 'pseudo') {
            return `Pseudo-random seed "${pseudoSeed}" applied. Use New Character to replay the same sequence from the beginning.`;
        }

        if (wasApplied) {
            return `True-random runtime seed refreshed to "${activeSeed}".`;
        }

        if (mode === 'pseudo') {
            return 'Pseudo mode keeps every random roll deterministic for the same seed, including after New Character reloads.';
        }

        return 'True mode creates a fresh runtime seed every time you apply settings or reload the game.';
    }

    private describeRandomProviderForLog(settings: { mode: RandomProviderMode; pseudoSeed: string; activeSeed: string }): string {
        if (settings.mode === 'pseudo') {
            return `pseudo random (seed: ${getNormalizedPseudoRandomSeed(settings.pseudoSeed)})`;
        }

        return `true random (runtime seed: ${settings.activeSeed})`;
    }

    private readRandomSettingsInputs(): { mode: RandomProviderMode; pseudoSeed: string; activeSeed: string } {
        const mode = this.developerUI.randomModeSelect.value === 'pseudo' ? 'pseudo' : 'true';
        const pseudoSeed = getNormalizedPseudoRandomSeed(this.developerUI.randomSeedInput.value);
        const current = getGameRandomProviderSettings();

        return {
            mode,
            pseudoSeed,
            activeSeed: current.activeSeed,
        };
    }

    private setRandomStatus(message: string, isError: boolean): void {
        this.developerUI.randomStatus.textContent = message;
        this.developerUI.randomStatus.classList.toggle('dev-events-status-error', isError);
    }

    private renderMapDisplayControls(): void {
        const config = this.callbacks.getMapDisplayConfig();
        this.developerUI.everythingDiscoveredToggle.checked = config.everythingDiscovered;
        this.developerUI.fogOfWarToggle.checked = config.fogOfWar;
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
