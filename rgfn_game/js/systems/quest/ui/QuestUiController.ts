/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import { QuestNode } from '../QuestTypes.js';
import QuestUiMarkupBuilder from './QuestUiMarkupBuilder.js';
import QuestUiFeedbackPresenter from './QuestUiFeedbackPresenter.js';

const KNOWN_ONLY_TOGGLE_STORAGE_KEY = 'rgfn_quests_known_only_toggle_v1';
const KNOWN_ONLY_TOGGLE_DEFAULT = true;
const SIDE_ACTIVE_ONLY_TOGGLE_STORAGE_KEY = 'rgfn_side_quests_active_only_toggle_v1';
const SIDE_ACTIVE_ONLY_TOGGLE_DEFAULT = true;
const MAIN_TOGGLE_LABEL = 'Show only known/current quests';
const SIDE_TOGGLE_LABEL = 'Show only active side quests';
type QuestTab = 'main' | 'side';

type QuestUiCallbacks = {
    onLocationClick: (locationName: string) => boolean;
};

export default class QuestUiController {
    private readonly questTitle: HTMLElement;
    private readonly mainTabBtn: HTMLButtonElement;
    private readonly sideTabBtn: HTMLButtonElement;
    private readonly knownOnlyToggle: HTMLInputElement;
    private readonly modeToggleContainer: HTMLElement;
    private readonly modeToggleLabel: HTMLElement;
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;
    private readonly callbacks: QuestUiCallbacks;
    private readonly markupBuilder: QuestUiMarkupBuilder;
    private readonly feedbackPresenter: QuestUiFeedbackPresenter;
    private readonly feedbackElements: HTMLElement[];
    private lastRenderedQuest: QuestNode | null = null;
    private lastRenderedSideQuests: QuestNode[] = [];
    private activeTab: QuestTab = 'main';
    private mainKnownOnlyEnabled = KNOWN_ONLY_TOGGLE_DEFAULT;
    private sideActiveOnlyEnabled = SIDE_ACTIVE_ONLY_TOGGLE_DEFAULT;

    constructor(
        questTitle: HTMLElement,
        mainTabBtn: HTMLButtonElement,
        sideTabBtn: HTMLButtonElement,
        knownOnlyToggle: HTMLInputElement,
        modeToggleContainer: HTMLElement,
        modeToggleLabel: HTMLElement,
        questBody: HTMLElement,
        introModal: HTMLElement,
        introBody: HTMLElement,
        introCloseBtn: HTMLButtonElement,
        callbacks: QuestUiCallbacks,
    ) {
        this.questTitle = questTitle;
        this.mainTabBtn = mainTabBtn;
        this.sideTabBtn = sideTabBtn;
        this.knownOnlyToggle = knownOnlyToggle;
        this.modeToggleContainer = modeToggleContainer;
        this.modeToggleLabel = modeToggleLabel;
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
        this.callbacks = callbacks;
        this.markupBuilder = new QuestUiMarkupBuilder({ isKnownOnlyEnabled: () => this.mainKnownOnlyEnabled });
        this.feedbackPresenter = new QuestUiFeedbackPresenter({ containers: [this.questBody, this.introBody] });
        this.feedbackElements = this.feedbackPresenter.feedbackElements;
        this.introModal.classList.add('hidden');
        this.switchTab('main');
        this.applyPersistedKnownOnlyState();
        this.bindEvents();
    }

    public renderQuest(quest: QuestNode, sideQuests: QuestNode[] = []): void {
        this.lastRenderedQuest = quest;
        this.lastRenderedSideQuests = sideQuests;
        const markup = this.markupBuilder.buildQuestTreeMarkup(quest);
        this.introBody.innerHTML = markup;
        this.renderCurrentTab();
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
        this.mainTabBtn.addEventListener('click', () => this.switchTab('main'));
        this.sideTabBtn.addEventListener('click', () => this.switchTab('side'));
        this.introModal.addEventListener('click', (event: MouseEvent) => this.handleIntroModalClick(event));
        this.bindLocationClicks(this.questBody);
        this.bindLocationClicks(this.introBody);
    }

    private handleKnownOnlyToggleChange(): void {
        if (this.activeTab === 'main') {
            this.mainKnownOnlyEnabled = this.knownOnlyToggle.checked;
            this.persistKnownOnlyState();
        } else {
            this.sideActiveOnlyEnabled = this.knownOnlyToggle.checked;
            this.persistSideActiveOnlyState();
        }
        if (this.lastRenderedQuest) {
            this.renderCurrentTab();
        }
    }

    private handleIntroModalClick(event: MouseEvent): void {
        if (event.target === this.introModal) {
            this.introModal.classList.add('hidden');
        }
    }

    private applyPersistedKnownOnlyState(): void {
        this.mainKnownOnlyEnabled = this.readKnownOnlyState() ?? KNOWN_ONLY_TOGGLE_DEFAULT;
        this.sideActiveOnlyEnabled = this.readSideActiveOnlyState() ?? SIDE_ACTIVE_ONLY_TOGGLE_DEFAULT;
        this.updateModeToggleUi();
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

    private persistSideActiveOnlyState(): void {
        const storage = this.getLocalStorage();
        if (!storage) {
            return;
        }

        storage.setItem(SIDE_ACTIVE_ONLY_TOGGLE_STORAGE_KEY, this.sideActiveOnlyEnabled ? '1' : '0');
    }

    private readSideActiveOnlyState(): boolean | null {
        const storage = this.getLocalStorage();
        if (!storage) {
            return null;
        }

        const rawValue = storage.getItem(SIDE_ACTIVE_ONLY_TOGGLE_STORAGE_KEY);
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

    private switchTab(tab: QuestTab): void {
        this.activeTab = tab;
        this.mainTabBtn.classList.toggle('is-active', tab === 'main');
        this.sideTabBtn.classList.toggle('is-active', tab === 'side');
        this.mainTabBtn.setAttribute('aria-selected', String(tab === 'main'));
        this.sideTabBtn.setAttribute('aria-selected', String(tab === 'side'));
        this.updateModeToggleUi();
        this.renderCurrentTab();
    }

    private updateModeToggleUi(): void {
        this.modeToggleContainer.style.display = '';
        if (this.activeTab === 'main') {
            this.modeToggleLabel.textContent = MAIN_TOGGLE_LABEL;
            this.knownOnlyToggle.checked = this.mainKnownOnlyEnabled;
            return;
        }
        this.modeToggleLabel.textContent = SIDE_TOGGLE_LABEL;
        this.knownOnlyToggle.checked = this.sideActiveOnlyEnabled;
    }

    private renderCurrentTab(): void {
        if (!this.lastRenderedQuest) {
            return;
        }
        if (this.activeTab === 'main') {
            this.renderMainQuestTab(this.lastRenderedQuest);
            return;
        }
        this.renderSideQuestTab(this.lastRenderedSideQuests);
    }

    private renderMainQuestTab(quest: QuestNode): void {
        const markup = this.markupBuilder.buildQuestTreeMarkup(quest);
        this.questTitle.textContent = `Main Quest: ${quest.title}`;
        this.questBody.innerHTML = markup;
    }

    private renderSideQuestTab(sideQuests: QuestNode[]): void {
        this.questTitle.textContent = 'Side Quests';
        const filteredQuests = this.sideActiveOnlyEnabled
            ? sideQuests.filter((quest) => (quest.status ?? 'active') !== 'available')
            : sideQuests;
        if (filteredQuests.length === 0) {
            this.questBody.innerHTML = '<p>No known side quests yet.</p>';
            return;
        }

        const cards = filteredQuests
            .map((quest) => this.buildSideQuestCardMarkup(quest))
            .join('');
        this.questBody.innerHTML = `<div class="side-quest-list">${cards}</div>`;
    }

    private buildSideQuestCardMarkup(quest: QuestNode): string {
        const status = quest.status ?? 'active';
        const giverNpc = this.escapeHtml(quest.giverNpcName ?? 'Unknown giver');
        const giverVillage = this.escapeHtml(quest.giverVillageName ?? 'Unknown village');
        const rewardMarkup = quest.reward ? `<div class="side-quest-meta">Reward: ${this.escapeHtml(quest.reward)}</div>` : '';
        const treeMarkup = this.markupBuilder.buildQuestTreeMarkup(quest);
        const title = this.escapeHtml(quest.title);
        const statusLabel = this.formatStatus(status);
        const shouldOpenByDefault = status !== 'completed';
        return `<details class="side-quest-card" ${shouldOpenByDefault ? 'open' : ''}>
            <summary>${title}<span class="side-quest-status is-${this.escapeHtml(status.toLocaleLowerCase())}">${statusLabel}</span></summary>
            <div class="side-quest-meta">Giver: ${giverNpc} · Village: ${giverVillage}</div>
            ${rewardMarkup}
            ${treeMarkup}
        </details>`;
    }

    private formatStatus = (status: string): string => status === 'readyToTurnIn' ? 'Ready to turn in' : status.charAt(0).toUpperCase() + status.slice(1);

    private escapeHtml = (text: string): string => text
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');

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
