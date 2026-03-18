import { QuestNode, QuestObjectiveType } from './QuestTypes.js';

type GenerationContext = {
    depth: number;
    idPrefix: string;
};

const ENEMY_ARCHETYPES = ['skeleton', 'zombie', 'ninja', 'dark knight', 'grave hound'];
const LOCATIONS = ['Shattered Crossroads', 'Old Well', 'Burnt Orchard', 'Fog Chapel', 'Stone Causeway'];
const ARTIFACTS = ['amber sigil', 'crypt key', 'moon vial', 'warden seal', 'silver oath medal'];
const TRADER_TYPES = ['wandering alchemist', 'grave broker', 'village smith', 'nomad courier'];

export default class QuestGenerator {
    public generateMainQuest(): QuestNode {
        const branchCount = this.randomInt(1, 3);
        const children = Array.from({ length: branchCount }, (_, index) => this.generateNode({
            depth: 1,
            idPrefix: `main.${index + 1}`,
        }));

        return {
            id: 'main',
            title: 'Path of the Returning Dawn',
            description: 'Complete every branch of this quest tree to prove your character can end the darkness over the region.',
            conditionText: 'All child objectives are completed.',
            objectiveType: 'scout',
            children,
        };
    }

    private generateNode(context: GenerationContext): QuestNode {
        const shouldSplit = context.depth < 3 && Math.random() < 0.58;
        if (shouldSplit) {
            const childCount = this.randomInt(2, 3);
            const children = Array.from({ length: childCount }, (_, idx) => this.generateNode({
                depth: context.depth + 1,
                idPrefix: `${context.idPrefix}.${idx + 1}`,
            }));
            const operation = this.pick(['Purge route', 'Supply route', 'Witness route', 'Ritual route']);

            return {
                id: context.idPrefix,
                title: `${operation} ${context.depth}`,
                description: 'A composite objective. All listed subtasks must be completed.',
                conditionText: 'Each subtask in this branch is completed.',
                objectiveType: 'scout',
                children,
            };
        }

        return this.generateLeaf(context.idPrefix);
    }

    private generateLeaf(id: string): QuestNode {
        const objectiveType = this.pick<QuestObjectiveType>(['eliminate', 'deliver', 'travel', 'barter', 'scout']);

        if (objectiveType === 'eliminate') {
            const target = this.pick(ENEMY_ARCHETYPES);
            const amount = this.randomInt(1, 4);
            const location = Math.random() < 0.5 ? this.pick(LOCATIONS) : null;
            const locationText = location ? ` in ${location}` : '';
            return {
                id,
                title: `Purge ${target}${amount > 1 ? ' pack' : ''}`,
                description: `Remove ${amount} ${target}${amount > 1 ? 's' : ''}${locationText}.`,
                conditionText: `Kill ${amount} ${target}${amount > 1 ? 's' : ''}${locationText}.`,
                objectiveType,
                children: [],
            };
        }

        if (objectiveType === 'deliver') {
            const artifact = this.pick(ARTIFACTS);
            const destination = this.pick(LOCATIONS);
            return {
                id,
                title: `Courier: ${artifact}`,
                description: `Carry the ${artifact} and bring it to ${destination}.`,
                conditionText: `Reach ${destination} while carrying ${artifact}.`,
                objectiveType,
                children: [],
            };
        }

        if (objectiveType === 'travel') {
            const destination = this.pick(LOCATIONS);
            return {
                id,
                title: `Scout ${destination}`,
                description: `Travel to ${destination} and secure the path.`,
                conditionText: `Enter ${destination}.`,
                objectiveType,
                children: [],
            };
        }

        if (objectiveType === 'barter') {
            const trader = this.pick(TRADER_TYPES);
            const artifact = this.pick(ARTIFACTS);
            return {
                id,
                title: `Barter with ${trader}`,
                description: `Negotiate with the ${trader} and exchange for ${artifact}.`,
                conditionText: `Complete one barter deal and obtain ${artifact}.`,
                objectiveType,
                children: [],
            };
        }

        const destination = this.pick(LOCATIONS);
        return {
            id,
            title: `Investigate signs near ${destination}`,
            description: `Inspect tracks, ruins, and anomalies around ${destination}.`,
            conditionText: `Finish one scouting investigation at ${destination}.`,
            objectiveType,
            children: [],
        };
    }

    private pick<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
