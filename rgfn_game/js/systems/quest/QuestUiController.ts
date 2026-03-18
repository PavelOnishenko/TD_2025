import { QuestNode } from './QuestTypes.js';

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';

export default class QuestUiController {
    private readonly questTitle: HTMLElement;
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;

    constructor(questTitle: HTMLElement, questBody: HTMLElement, introModal: HTMLElement, introBody: HTMLElement, introCloseBtn: HTMLButtonElement) {
        this.questTitle = questTitle;
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
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
    }

    private buildQuestTreeMarkup(quest: QuestNode, depth: number): string {
        const childMarkup = quest.children.map((child) => this.buildQuestTreeMarkup(child, depth + 1)).join('');
        const listClass = depth === 0 ? 'quest-tree-root' : 'quest-tree-children';
        const childList = quest.children.length > 0 ? `<ul class="${listClass}">${childMarkup}</ul>` : '';
        const selfNode = `<li class="quest-node" data-depth="${depth}">${this.nodeMarkup(quest)}${childList}</li>`;
        return depth === 0 ? `<ul class="quest-tree-root">${selfNode}</ul>` : selfNode;
    }

    private nodeMarkup(quest: QuestNode): string {
        return `${this.titleMarkup(quest)}${this.descriptionMarkup(quest)}${this.conditionMarkup(quest)}`;
    }

    private titleMarkup(quest: QuestNode): string {
        return `<div class="quest-node-title">${quest.title}</div>`;
    }

    private descriptionMarkup(quest: QuestNode): string {
        return this.shouldRenderDescription(quest) ? `<div class="quest-node-description">${quest.description}</div>` : '';
    }

    private conditionMarkup(quest: QuestNode): string {
        return this.shouldRenderCondition(quest) ? `<div class="quest-node-condition">Condition: ${quest.conditionText}</div>` : '';
    }

    private shouldRenderDescription(quest: QuestNode): boolean {
        return quest.description.trim().length > 0 && quest.description !== DEFAULT_DESCRIPTION;
    }

    private shouldRenderCondition(quest: QuestNode): boolean {
        return quest.conditionText.trim().length > 0 && quest.conditionText !== DEFAULT_CONDITION;
    }
}
