import { QuestNode } from './QuestTypes.js';

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';
type QuestUiCallbacks = {
    onLocationClick: (locationName: string) => boolean;
};

export default class QuestUiController {
    private readonly questTitle: HTMLElement;
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;
    private readonly callbacks: QuestUiCallbacks;
    private readonly feedbackElements: HTMLElement[];

    constructor(
        questTitle: HTMLElement,
        questBody: HTMLElement,
        introModal: HTMLElement,
        introBody: HTMLElement,
        introCloseBtn: HTMLButtonElement,
        callbacks: QuestUiCallbacks,
    ) {
        this.questTitle = questTitle;
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
        this.callbacks = callbacks;
        this.feedbackElements = [this.createFeedbackElement(this.questBody), this.createFeedbackElement(this.introBody)];
        this.bindEvents();
    }

    public renderQuest(quest: QuestNode): void {
        const markup = this.buildQuestTreeMarkup(quest, 0);
        this.questTitle.textContent = `Main Quest: ${quest.title}`;
        this.questBody.innerHTML = markup;
        this.introBody.innerHTML = markup;
    }

    public showIntro(): void {
        this.introModal.classList.remove('hidden');
    }

    private bindEvents(): void {
        this.introCloseBtn.addEventListener('click', () => this.introModal.classList.add('hidden'));
        this.introModal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.introModal) {
                this.introModal.classList.add('hidden');
            }
        });
        this.bindLocationClicks(this.questBody);
        this.bindLocationClicks(this.introBody);
    }

    private buildQuestTreeMarkup(quest: QuestNode, depth: number): string {
        const childMarkup = quest.children.map((child) => this.buildQuestTreeMarkup(child, depth + 1)).join('');
        const listClass = depth === 0 ? 'quest-tree-root' : 'quest-tree-children';
        const childList = quest.children.length > 0 ? `<ul class="${listClass}">${childMarkup}</ul>` : '';
        const completionClass = quest.isCompleted ? ' is-completed' : '';
        const selfNode = `<li class="quest-node${completionClass}" data-depth="${depth}">${this.nodeMarkup(quest)}${childList}</li>`;
        return depth === 0 ? `<ul class="quest-tree-root">${selfNode}</ul>` : selfNode;
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
        return quest.description.trim().length > 0 && quest.description !== DEFAULT_DESCRIPTION;
    }

    private shouldRenderCondition(quest: QuestNode): boolean {
        return quest.conditionText.trim().length > 0 && quest.conditionText !== DEFAULT_CONDITION;
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

        const feedback = {
            textContent: '',
            className: 'quest-feedback',
            classList: {
                toggle() { /* noop in tests */ },
            },
        } as unknown as HTMLElement;

        return feedback;
    }

    private setFeedback(message: string, isError: boolean): void {
        for (const element of this.feedbackElements) {
            element.textContent = message;
            element.classList.toggle('is-error', isError);
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
