import { QuestNode } from './QuestTypes.js';
import { theme } from '../../config/ThemeConfig.js';

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';
const DEFAULT_BRANCH_DESCRIPTION = 'A composite objective. All listed subtasks must be completed.';
const DEFAULT_BRANCH_CONDITION = 'Each subtask in this branch is completed.';
const DEFAULT_DESCRIPTIONS = new Set([DEFAULT_DESCRIPTION, DEFAULT_BRANCH_DESCRIPTION]);
const DEFAULT_CONDITIONS = new Set([DEFAULT_CONDITION, DEFAULT_BRANCH_CONDITION]);
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
    private readonly feedbackElements: HTMLElement[];
    private lastRenderedQuest: QuestNode | null = null;
    private feedbackClearTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
        this.feedbackElements = [this.createFeedbackElement(this.questBody), this.createFeedbackElement(this.introBody)];
        this.introModal.classList.add('hidden');
        this.applyPersistedKnownOnlyState();
        this.bindEvents();
    }

    public renderQuest(quest: QuestNode): void {
        this.lastRenderedQuest = quest;
        const markup = this.buildQuestTreeMarkup(quest);
        this.questTitle.textContent = `Main Quest: ${quest.title}`;
        this.questBody.innerHTML = markup;
        this.introBody.innerHTML = markup;
    }

    public showIntro(): void {
        this.introModal.classList.remove('hidden');
    }

    private bindEvents(): void {
        this.introCloseBtn.addEventListener('click', () => this.introModal.classList.add('hidden'));
        this.knownOnlyToggle.addEventListener('change', () => {
            this.persistKnownOnlyState();
            if (this.lastRenderedQuest) {
                this.renderQuest(this.lastRenderedQuest);
            }
        });
        this.introModal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.introModal) {
                this.introModal.classList.add('hidden');
            }
        });
        this.bindLocationClicks(this.questBody);
        this.bindLocationClicks(this.introBody);
    }

    private buildQuestTreeMarkup(quest: QuestNode): string {
        const preorderNodes: QuestNode[] = [];
        this.collectPreorderNodes(quest, preorderNodes);
        const maxVisiblePreorderIndex = this.resolveKnownQuestCutoff(preorderNodes);
        return this.buildQuestTreeMarkupNode(quest, 0, preorderNodes, maxVisiblePreorderIndex) ?? '';
    }

    private buildQuestTreeMarkupNode(
        quest: QuestNode,
        depth: number,
        preorderNodes: QuestNode[],
        maxVisiblePreorderIndex: number,
    ): string | null {
        const childMarkup = quest.children
            .map((child) => this.buildQuestTreeMarkupNode(child, depth + 1, preorderNodes, maxVisiblePreorderIndex))
            .filter((markup): markup is string => markup !== null)
            .join('');
        const listClass = depth === 0 ? 'quest-tree-root' : 'quest-tree-children';
        const hasVisibleChildren = childMarkup.length > 0;
        const childList = hasVisibleChildren ? `<ul class="${listClass}">${childMarkup}</ul>` : '';
        const completionClass = quest.isCompleted ? ' is-completed' : '';
        const selfNode = `<li class="quest-node${completionClass}" data-depth="${depth}">${this.nodeMarkup(quest)}${childList}</li>`;
        const shouldShowNode = this.shouldShowNode(quest, preorderNodes, maxVisiblePreorderIndex) || hasVisibleChildren;
        if (!shouldShowNode) {
            return null;
        }

        return depth === 0 ? `<ul class="quest-tree-root">${selfNode}</ul>` : selfNode;
    }

    private shouldShowNode(quest: QuestNode, preorderNodes: QuestNode[], maxVisiblePreorderIndex: number): boolean {
        if (!this.knownOnlyToggle.checked) {
            return true;
        }

        if (quest.isCompleted) {
            return true;
        }

        const questPreorderIndex = preorderNodes.indexOf(quest);
        return questPreorderIndex >= 0 && questPreorderIndex <= maxVisiblePreorderIndex;
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

    private collectPreorderNodes(quest: QuestNode, nodes: QuestNode[]): void {
        nodes.push(quest);
        quest.children.forEach((child) => this.collectPreorderNodes(child, nodes));
    }

    private resolveKnownQuestCutoff(preorderNodes: QuestNode[]): number {
        if (!this.knownOnlyToggle.checked) {
            return preorderNodes.length - 1;
        }

        const firstIncompleteLeafIndex = preorderNodes.findIndex((node) => !node.isCompleted && node.children.length === 0);
        if (firstIncompleteLeafIndex >= 0) {
            return firstIncompleteLeafIndex;
        }

        const firstIncompleteIndex = preorderNodes.findIndex((node) => !node.isCompleted);
        if (firstIncompleteIndex >= 0) {
            return firstIncompleteIndex;
        }

        return preorderNodes.length - 1;
    }

    private nodeMarkup(quest: QuestNode): string {
        return `${this.titleMarkup(quest)}${this.descriptionMarkup(quest)}${this.conditionMarkup(quest)}`;
    }

    private titleMarkup(quest: QuestNode): string {
        const completionPrefix = quest.isCompleted ? '<span class="quest-node-check" aria-hidden="true">✓ </span>' : '';
        return `<div class="quest-node-title">${completionPrefix}${this.formatText(quest.title, quest)}</div>`;
    }

    private descriptionMarkup(quest: QuestNode): string {
        return this.shouldRenderDescription(quest) ? `<div class="quest-node-description">${this.formatText(quest.description, quest)}</div>` : '';
    }

    private conditionMarkup(quest: QuestNode): string {
        return this.shouldRenderCondition(quest) ? `<div class="quest-node-condition">Condition: ${this.formatText(quest.conditionText, quest)}</div>` : '';
    }

    private shouldRenderDescription(quest: QuestNode): boolean {
        return quest.description.trim().length > 0 && !DEFAULT_DESCRIPTIONS.has(quest.description);
    }

    private shouldRenderCondition(quest: QuestNode): boolean {
        return quest.conditionText.trim().length > 0 && !DEFAULT_CONDITIONS.has(quest.conditionText);
    }

    private formatText(text: string, quest: QuestNode): string {
        let markup = this.escapeHtml(text);

        const entities = [...(quest.entities ?? [])].sort((a, b) => b.text.length - a.text.length);
        for (const entity of entities) {
            const escapedText = this.escapeHtml(entity.text);
            const className = entity.type === 'location'
                ? 'quest-entity-name location'
                : entity.type === 'item'
                    ? 'quest-entity-name item'
                    : 'quest-entity-name person';
            const replacement = entity.type === 'location'
                ? `<button type="button" class="${className}" data-location-name="${escapedText}">${escapedText}</button>`
                : `<span class="${className}">${escapedText}</span>`;
            markup = markup.split(escapedText).join(replacement);
        }

        return markup;
    }

    private bindLocationClicks(container: HTMLElement): void {
        container.addEventListener('click', (event: MouseEvent) => {
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
                shownOnMap
                    ? `Showing ${locationName} on the world map.`
                    : `${locationName} is not discovered yet.`,
                !shownOnMap,
            );
            if (shownOnMap) {
                this.introModal.classList.add('hidden');
            }
        });
    }

    private createFeedbackElement(container: HTMLElement): HTMLElement {
        if (typeof document !== 'undefined' && typeof container.insertAdjacentElement === 'function') {
            const feedback = document.createElement('div');
            feedback.className = 'quest-feedback';
            container.insertAdjacentElement('afterend', feedback);
            return feedback;
        }

        const feedback = { textContent: '', className: 'quest-feedback', classList: { toggle() { /* noop in tests */ } } } as unknown as HTMLElement;

        return feedback;
    }

    private setFeedback(message: string, isError: boolean): void {
        this.clearScheduledFeedbackReset();
        for (const element of this.feedbackElements) {
            element.textContent = message;
            element.classList.toggle('is-error', isError);
        }

        const feedbackDurationMs = Math.max(0, theme.quest.feedbackMessageDurationMs);
        if (feedbackDurationMs === 0) {
            this.clearFeedback();
            return;
        }

        this.feedbackClearTimeoutId = setTimeout(() => {
            this.clearFeedback();
            this.feedbackClearTimeoutId = null;
        }, feedbackDurationMs);
    }

    private clearScheduledFeedbackReset(): void {
        if (this.feedbackClearTimeoutId === null) {
            return;
        }

        clearTimeout(this.feedbackClearTimeoutId);
        this.feedbackClearTimeoutId = null;
    }

    private clearFeedback(): void {
        for (const element of this.feedbackElements) {
            element.textContent = '';
            element.classList.toggle('is-error', false);
        }
    }

    private escapeHtml(text: string): string {
        return text
            .split('&').join('&amp;')
            .split('<').join('&lt;')
            .split('>').join('&gt;')
            .split('"').join('&quot;')
            .split("'").join('&#39;');
    }
}
