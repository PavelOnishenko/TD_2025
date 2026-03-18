import { QuestNode } from './QuestTypes.js';

export default class QuestUiController {
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;

    constructor(questBody: HTMLElement, introModal: HTMLElement, introBody: HTMLElement, introCloseBtn: HTMLButtonElement) {
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
        this.bindEvents();
    }

    public renderQuest(quest: QuestNode): void {
        this.questBody.innerHTML = this.buildQuestTreeMarkup(quest, 0);
        this.introBody.innerHTML = this.buildQuestTreeMarkup(quest, 0);
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
        const selfNode = `
            <li class="quest-node" data-depth="${depth}">
                <div class="quest-node-title">${quest.title}</div>
                <div class="quest-node-description">${quest.description}</div>
                <div class="quest-node-condition">Condition: ${quest.conditionText}</div>
                ${quest.children.length > 0 ? `<ul class="${listClass}">${childMarkup}</ul>` : ''}
            </li>
        `;

        if (depth === 0) {
            return `<ul class="quest-tree-root">${selfNode}</ul>`;
        }

        return selfNode;
    }
}
