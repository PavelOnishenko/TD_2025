import QuestLeafFactory from './QuestLeafFactory.js';
import QuestPackService from './QuestPackService.js';
import { DefaultQuestRandom, QuestRandom } from './QuestRandom.js';
import { QuestNode } from './QuestTypes.js';
import { balanceConfig } from '../../config/balanceConfig.js';

type GenerationContext = { depth: number; idPrefix: string };
type QuestGeneratorDeps = { packService?: QuestPackService; random?: QuestRandom };

const DEFAULT_DESCRIPTION = 'Complete every branch of this quest tree to prove your character can end the darkness over the region.';
const DEFAULT_CONDITION = 'All child objectives are completed.';
const BRANCH_TITLES = ['Purge Route', 'Supply Route', 'Witness Route', 'Ritual Route', 'Signal Route'];

export default class QuestGenerator {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;
    private readonly leafFactory: QuestLeafFactory;

    constructor(deps: QuestGeneratorDeps = {}) {
        this.packService = deps.packService ?? new QuestPackService();
        this.random = deps.random ?? new DefaultQuestRandom();
        this.leafFactory = new QuestLeafFactory(this.packService, this.random);
    }

    public async generateMainQuest(): Promise<QuestNode> {
        const title = await this.packService.generateName('mainQuest', balanceConfig.questNameGeneration.maxWordsByDomain.mainQuest);
        const children = await this.generateChildren();
        return this.node('main', title.text, DEFAULT_DESCRIPTION, DEFAULT_CONDITION, children);
    }

    private async generateChildren(): Promise<QuestNode[]> {
        const branchCount = this.random.nextInt(1, 3);
        return Promise.all(Array.from({ length: branchCount }, (_, index) => this.generateNode({ depth: 1, idPrefix: `main.${index + 1}` })));
    }

    private async generateNode(context: GenerationContext): Promise<QuestNode> {
        if (context.depth >= 3 || !this.random.nextBool(0.58)) {
            return this.leafFactory.create(context.idPrefix);
        }
        const children = await this.generateBranchChildren(context);
        return this.node(
            context.idPrefix,
            `${this.random.pick(BRANCH_TITLES)} ${context.depth}`,
            'A composite objective. All listed subtasks must be completed.',
            'Each subtask in this branch is completed.',
            children,
        );
    }

    private async generateBranchChildren(context: GenerationContext): Promise<QuestNode[]> {
        const childCount = this.random.nextInt(2, 3);
        const builders = Array.from({ length: childCount }, (_, index) => (
            this.generateNode({ depth: context.depth + 1, idPrefix: `${context.idPrefix}.${index + 1}` })
        ));
        return Promise.all(builders);
    }

    private node(id: string, title: string, description: string, conditionText: string, children: QuestNode[]): QuestNode {
        return { id, title, description, conditionText, objectiveType: 'scout', entities: [], children };
    }
}
