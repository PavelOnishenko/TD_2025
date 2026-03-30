import { QuestNode } from './QuestTypes.js';
import QuestUiMarkupBuilder from './QuestUiMarkupBuilder.js';
import QuestUiFeedbackPresenter from './QuestUiFeedbackPresenter.js';

const KNOWN_ONLY_TOGGLE_STORAGE_KEY = 'rgfn_quests_known_only_toggle_v1';
const KNOWN_ONLY_TOGGLE_DEFAULT = true;

type QuestUiCallbacks = {
    onLocationClick: (locationName: string) => boolean;
};

export default class QuestUiController {
    private readonly questTitle: HTMLElement;
    private readonly knownOnlyToggle: HTMLInputElement;
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;
    private readonly callbacks: QuestUiCallbacks;
    private readonly markupBuilder: QuestUiMarkupBuilder;
    private readonly feedbackPresenter: QuestUiFeedbackPresenter;
    private readonly feedbackElements: HTMLElement[];
    private lastRenderedQuest: QuestNode | null = null;

    constructor(
        questTitle: HTMLElement,
        knownOnlyToggle: HTMLInputElement,
        questBody: HTMLElement,
        introModal: HTMLElement,
        introBody: HTMLElement,
        introCloseBtn: HTMLButtonElement,
        callbacks: QuestUiCallbacks,
    ) {
        this.questTitle = questTitle;
        this.knownOnlyToggle = knownOnlyToggle;
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
        this.callbacks = callbacks;
        this.markupBuilder = new QuestUiMarkupBuilder({ isKnownOnlyEnabled: () => this.knownOnlyToggle.checked });
        this.feedbackPresenter = new QuestUiFeedbackPresenter({ containers: [this.questBody, this.introBody] });
        this.feedbackElements = this.feedbackPresenter.feedbackElements;
        this.introModal.classList.add('hidden');
        this.applyPersistedKnownOnlyState();
        this.bindEvents();
    }

    public renderQuest(quest: QuestNode): void {
        this.lastRenderedQuest = quest;
        const markup = this.markupBuilder.buildQuestTreeMarkup(quest);
        this.questTitle.textContent = `Main Quest: ${quest.title}`;
        this.questBody.innerHTML = markup;
        this.introBody.innerHTML = markup;
    }

    public showIntro(): void {
        this.introModal.classList.remove('hidden');
    }

    private setFeedback(message: string, isError: boolean): void {
        this.feedbackPresenter.setFeedback(message, isError);
    }

    private bindEvents(): void {
        this.introCloseBtn.addEventListener('click', () => this.introModal.classList.add('hidden'));
        this.knownOnlyToggle.addEventListener('change', () => this.handleKnownOnlyToggleChange());
        this.introModal.addEventListener('click', (event: MouseEvent) => this.handleIntroModalClick(event));
        this.bindLocationClicks(this.questBody);
        this.bindLocationClicks(this.introBody);
    }

    private handleKnownOnlyToggleChange(): void {
        this.persistKnownOnlyState();
        if (this.lastRenderedQuest) {
            this.renderQuest(this.lastRenderedQuest);
        }
    }

    private handleIntroModalClick(event: MouseEvent): void {
        if (event.target === this.introModal) {
            this.introModal.classList.add('hidden');
        }
    }

    private applyPersistedKnownOnlyState(): void {
        const savedState = this.readKnownOnlyState();
        this.knownOnlyToggle.checked = savedState ?? KNOWN_ONLY_TOGGLE_DEFAULT;
    }

    private persistKnownOnlyState(): void {
        const storage = this.getLocalStorage();
        if (!storage) {
            return;
        }

        storage.setItem(KNOWN_ONLY_TOGGLE_STORAGE_KEY, this.knownOnlyToggle.checked ? '1' : '0');
    }

    private readKnownOnlyState(): boolean | null {
        const storage = this.getLocalStorage();
        if (!storage) {
            return null;
        }

        const rawValue = storage.getItem(KNOWN_ONLY_TOGGLE_STORAGE_KEY);
        if (rawValue === '1') {
            return true;
        }
        if (rawValue === '0') {
            return false;
        }
        return null;
    }

    private getLocalStorage(): Storage | null {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            return window.localStorage;
        } catch {
            return null;
        }
    }

    private bindLocationClicks(container: HTMLElement): void {
        container.addEventListener('click', (event: MouseEvent) => this.handleLocationClick(event));
    }

    private handleLocationClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest('[data-location-name]');
        if (!(button instanceof HTMLElement)) {
            return;
        }

        const locationName = button.dataset.locationName;
        if (!locationName) {
            return;
        }

        const shownOnMap = this.callbacks.onLocationClick(locationName);
        this.setFeedback(
            shownOnMap ? `Showing ${locationName} on the world map.` : `${locationName} is not discovered yet.`,
            !shownOnMap,
        );
        if (shownOnMap) {
            this.introModal.classList.add('hidden');
        }
    }
}
