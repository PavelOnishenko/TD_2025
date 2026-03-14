import EncounterSystem, { ForcedEncounterType } from './EncounterSystem.js';

type DeveloperUI = {
    modal: HTMLElement;
    eventType: HTMLSelectElement;
    queueList: HTMLElement;
};

type DeveloperCallbacks = {
    addVillageLog: (message: string, type?: string) => void;
    getEventLabel: (type: ForcedEncounterType) => string;
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
}
