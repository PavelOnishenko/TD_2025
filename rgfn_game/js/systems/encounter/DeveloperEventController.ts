import EncounterSystem, { ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import { MapDisplayConfig } from '../../types/game.js';
import DeveloperEncounterControls from './DeveloperEncounterControls.js';
import DeveloperNextCharacterRollControls from './DeveloperNextCharacterRollControls.js';
import DeveloperRandomAndMapControls from './DeveloperRandomAndMapControls.js';
import { DeveloperCallbacks, DeveloperUI, ENCOUNTER_LABELS } from './DeveloperEventTypes.js';
import { getDeveloperModeConfig, setDeveloperModeEnabled } from '../../utils/DeveloperModeConfig.js';

export default class DeveloperEventController {
    private developerUI: DeveloperUI;
    private encounterSystem: EncounterSystem;
    private callbacks: DeveloperCallbacks;
    private encounterControls: DeveloperEncounterControls;
    private nextCharacterRollControls: DeveloperNextCharacterRollControls;
    private randomAndMapControls: DeveloperRandomAndMapControls;
    private worldMapProfilingIntervalId: ReturnType<typeof setInterval> | null;

    constructor(developerUI: DeveloperUI, encounterSystem: EncounterSystem, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.encounterSystem = encounterSystem;
        this.callbacks = callbacks;
        this.encounterControls = new DeveloperEncounterControls(developerUI, encounterSystem, callbacks);
        this.nextCharacterRollControls = new DeveloperNextCharacterRollControls(developerUI, callbacks);
        this.randomAndMapControls = new DeveloperRandomAndMapControls(developerUI, callbacks);
        this.worldMapProfilingIntervalId = null;
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public toggleModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.modal.classList.contains('hidden');

        this.developerUI.modal.classList.toggle('hidden', !shouldShow);
        if (!shouldShow) {
            this.stopWorldMapProfilingAutoRefresh();
            return;
        }

        this.encounterControls.renderQueue();
        this.encounterControls.renderEncounterTypeControls();
        this.nextCharacterRollControls.renderNextCharacterRollSummary();
        this.randomAndMapControls.renderRandomProviderControls();
        this.randomAndMapControls.renderMapDisplayControls();
        this.developerUI.developerModeToggle.checked = getDeveloperModeConfig().enabled;
        this.developerUI.worldMapProfilingToggle.checked = this.callbacks.isWorldMapDrawProfilingEnabled();
        this.renderWorldMapProfilingPanel();
    }

    public applyDeveloperModeOnStartup(): void {
        this.applyDeveloperMode(getDeveloperModeConfig(), false);
    }

    public handleDeveloperModeToggle(enabled: boolean): void {
        const config = setDeveloperModeEnabled(enabled);
        this.applyDeveloperMode(config, true);
    }

    private applyDeveloperMode(config: ReturnType<typeof getDeveloperModeConfig>, logChanges: boolean): void {
        this.developerUI.developerModeToggle.checked = config.enabled;
        this.encounterSystem.setEncounterTypeEnabled('monster', config.encounterTypes.monster);
        this.encounterSystem.setEncounterTypeEnabled('item', config.encounterTypes.item);
        this.encounterSystem.setEncounterTypeEnabled('traveler', config.encounterTypes.traveler);
        this.callbacks.setMapDisplayConfig({ everythingDiscovered: config.everythingDiscovered, fogOfWar: config.fogOfWar });
        this.encounterControls.renderEncounterTypeControls();
        this.randomAndMapControls.renderMapDisplayControls();

        if (logChanges) {
            this.callbacks.addVillageLog(`[DEV] Persistent developer mode ${config.enabled ? 'enabled' : 'disabled'}.`, 'system');
        }
    }

    public handleQueueAdd(): void {
        const type = this.developerUI.eventType.value as ForcedEncounterType;
        this.encounterSystem.queueForcedEncounter(type);
        this.encounterControls.renderQueue();
        this.callbacks.addVillageLog(`[DEV] Queued event: ${this.callbacks.getEventLabel(type)}`, 'system');
    }

    public handleQueueClear(): void {
        this.encounterSystem.clearForcedEncounters();
        this.encounterControls.renderQueue();
    }

    public handleEncounterTypeToggle(type: RandomEncounterType, enabled: boolean): void {
        this.encounterSystem.setEncounterTypeEnabled(type, enabled);
        this.encounterControls.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${ENCOUNTER_LABELS[type]} encounters ${enabled ? 'enabled' : 'disabled'}.`, 'system');
    }

    public handleEncounterTypesToggleAll(enabled: boolean): void {
        this.encounterSystem.setAllEncounterTypesEnabled(enabled);
        this.encounterControls.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${enabled ? 'Enabled' : 'Disabled'} all random encounter types.`, 'system');
    }

    public toggleNextCharacterRollModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.nextRollModal.classList.contains('hidden');

        this.developerUI.nextRollModal.classList.toggle('hidden', !shouldShow);
        if (shouldShow) {
            this.nextCharacterRollControls.renderNextCharacterRollEditor();
        }
    }

    public handleNextCharacterRollInputChanged(): void {
        const allocation = this.nextCharacterRollControls.readInputs();
        this.nextCharacterRollControls.renderNextCharacterRollEditor(allocation);
    }

    public handleNextCharacterRollSave(): void {
        this.nextCharacterRollControls.saveFromInputs();
    }

    public handleNextCharacterRollClear(): void {
        this.nextCharacterRollControls.clearOverride();
    }

    public handleRandomSettingsInputChanged(): void {
        const settings = this.randomAndMapControls.readRandomSettingsInputs();
        this.randomAndMapControls.renderRandomProviderControls(settings, false);
    }

    public handleRandomSettingsApply(): void {
        this.randomAndMapControls.applyRandomSettings();
    }

    public handleMapDisplayToggle(setting: keyof MapDisplayConfig, enabled: boolean): void {
        this.randomAndMapControls.toggleMapDisplaySetting(setting, enabled);
    }

    public handleWorldMapDrawProfilingToggle(enabled: boolean): void {
        this.callbacks.setWorldMapDrawProfilingEnabled(enabled);
        if (enabled) {
            this.callbacks.resetWorldMapDrawProfiling();
            this.callbacks.addVillageLog('[DEV] World-map draw profiling enabled and reset.', 'system');
        } else {
            this.callbacks.addVillageLog('[DEV] World-map draw profiling disabled.', 'system');
        }
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapProfilingRefresh(): void {
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapProfilingAutoRefreshToggle(enabled: boolean): void {
        if (!enabled) {
            this.stopWorldMapProfilingAutoRefresh();
            this.renderWorldMapProfilingPanel();
            return;
        }
        this.startWorldMapProfilingAutoRefresh();
    }

    private startWorldMapProfilingAutoRefresh(): void {
        this.stopWorldMapProfilingAutoRefresh();
        this.worldMapProfilingIntervalId = setInterval(() => {
            this.renderWorldMapProfilingPanel();
        }, 750);
        this.renderWorldMapProfilingPanel();
    }

    private stopWorldMapProfilingAutoRefresh(): void {
        if (this.worldMapProfilingIntervalId !== null) {
            clearInterval(this.worldMapProfilingIntervalId);
            this.worldMapProfilingIntervalId = null;
        }
    }

    public renderWorldMapProfilingPanel(): void {
        const snapshot = this.callbacks.getWorldMapDrawProfilingSnapshot();
        const payload = { capturedAt: new Date().toISOString(), profilingEnabled: this.callbacks.isWorldMapDrawProfilingEnabled(), sections: snapshot };
        this.developerUI.worldMapProfilingOutput.textContent = JSON.stringify(payload, null, 2);
    }

    public renderQueue(): void {
        this.encounterControls.renderQueue();
    }
}
