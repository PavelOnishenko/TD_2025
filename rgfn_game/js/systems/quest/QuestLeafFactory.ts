import QuestPackService from './QuestPackService.js';
import { QuestRandom } from './QuestRandom.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import {
    DeliverObjectiveData,
    GeneratedName,
    QuestNode,
    QuestObjectiveData,
    QuestObjectiveType,
    QuestTextEntity,
    RareMonsterProfile,
} from './QuestTypes.js';

const LEAF_TYPES: QuestObjectiveType[] = ['eliminate', 'deliver', 'travel', 'barter', 'scout', 'hunt', 'recover', 'escort', 'defend'];
const MONSTER_STATS = ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'];
const MONSTER_EFFECTS = ['causes fear', 'leaves toxic fog', 'shatters armor', 'drains mana', 'summons spores', 'breaks formation'];
const MONSTER_BONUSES = ['rich trophy cache', 'legendary reagent drop', 'rare relic trail', 'faction gratitude', 'reputation surge'];
const MUTATED_FROM_SPECIES = ['wolf', 'boar', 'bear', 'crow', 'human', 'stag', 'hound', 'lizard'];

export default class QuestLeafFactory {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;
    private readonly maxWordsByDomain = balanceConfig.questNameGeneration.maxWordsByDomain;

    constructor(packService: QuestPackService, random: QuestRandom) {
        this.packService = packService;
        this.random = random;
    }

    public async create(id: string): Promise<QuestNode> {
        const type = this.random.pick(LEAF_TYPES);
        if (type === 'eliminate') {return this.createEliminateNode(id);}
        if (type === 'deliver') {return this.createDeliverNode(id);}
        if (type === 'travel') {return this.createTravelNode(id);}
        if (type === 'barter') {return this.createBarterNode(id);}
        if (type === 'scout') {return this.createScoutNode(id);}
        if (type === 'hunt') {return this.createHuntNode(id);}
        if (type === 'recover') {return this.createRecoverNode(id);}
        if (type === 'escort') {return this.createEscortNode(id);}
        return this.createDefendNode(id);
    }

    private async createEliminateNode(id: string): Promise<QuestNode> {
        const target = await this.generateName('monster');
        const amount = this.random.nextInt(1, 4);
        const location = await this.generateName('location');
        const where = ` near ${location.text}`;
        const mutatedFrom = this.random.pick(MUTATED_FROM_SPECIES);
        const mutations = this.pickMany(MONSTER_STATS, this.random.nextBool(0.5) ? 2 : 3);
        const details = `Origin: mutated from ${mutatedFrom}. Traits observed: ${mutations.join(', ')}.`;
        return this.node(
            id,
            `Purge ${target.text}${amount > 1 ? ' Pack' : ''}`,
            `${this.removeText(amount, target, where)} ${details}`,
            this.killText(amount, target, where),
            'eliminate',
            this.entities(target, location),
            {
                monster: {
                    targetName: target.text,
                    requiredKills: amount,
                    villageName: location.text,
                    mutations,
                    mutatedFrom,
                },
            },
        );
    }

    private async createDeliverNode(id: string): Promise<QuestNode> {
        const artifact = await this.generateName('artifact');
        const sourceTrader = await this.generateName('character');
        const sourceVillage = await this.generateName('location');
        let destination = await this.generateName('location');
        if (destination.text.trim().toLocaleLowerCase() === sourceVillage.text.trim().toLocaleLowerCase()) {
            destination = await this.generateName('location');
        }
        const objectiveData: DeliverObjectiveData = {
            sourceVillage: sourceVillage.text,
            sourceTrader: sourceTrader.text,
            destinationVillage: destination.text,
            itemName: artifact.text,
        };
        return this.node(
            id,
            `Courier: ${artifact.text}`,
            `Acquire ${this.label(artifact)} from ${sourceTrader.text} in ${sourceVillage.text}, then carry it to ${destination.text}.`,
            `Reach ${destination.text} while carrying ${this.label(artifact)} obtained from ${sourceTrader.text} in ${sourceVillage.text}.`,
            'deliver',
            this.entities(artifact, sourceTrader, sourceVillage, destination),
            { deliver: objectiveData },
        );
    }

    private async createTravelNode(id: string): Promise<QuestNode> {
        const destination = await this.generateName('location');
        return this.node(
            id,
            `Scout ${destination.text}`,
            `Travel to ${destination.text} and secure the path.`,
            `Enter ${destination.text}.`,
            'travel',
            this.entities(destination),
        );
    }

    private async createBarterNode(id: string): Promise<QuestNode> {
        const trader = await this.generateName('character');
        const artifact = await this.generateName('artifact');
        return this.node(
            id,
            `Barter with ${trader.text}`,
            `Negotiate with ${trader.text} and exchange for ${this.label(artifact)}.`,
            `Complete one barter deal and obtain ${this.label(artifact)}.`,
            'barter',
            this.entities(trader, artifact),
        );
    }

    private async createScoutNode(id: string): Promise<QuestNode> {
        const destination = await this.generateName('location');
        return this.node(
            id,
            `Investigate ${destination.text}`,
            `Inspect tracks, ruins, and anomalies around ${destination.text}.`,
            `Finish one scouting investigation at ${destination.text}.`,
            'scout',
            this.entities(destination),
        );
    }

    private async createHuntNode(id: string): Promise<QuestNode> {
        const profile = await this.rareMonsterProfile();
        const location = await this.generateName('location');
        const details = `Origin: mutated from ${profile.mutatedFrom}. Stats: ${profile.stats.join(', ')}. Effects: ${profile.effects.join(', ')}. Bonus: ${profile.bonus}.`;
        return this.node(
            id,
            `Hunt ${profile.name.text}`,
            `Track ${profile.count} rare mutant target${profile.count > 1 ? 's' : ''} near ${location.text}. ${details}`,
            `Kill ${profile.count} ${this.pluralLabel(profile.name, profile.count)} near ${location.text}.`,
            'hunt',
            this.entities(profile.name, location),
            {
                monster: {
                    targetName: profile.name.text,
                    requiredKills: profile.count,
                    villageName: location.text,
                    mutations: profile.stats,
                    mutatedFrom: profile.mutatedFrom,
                },
            },
        );
    }

    private async createRecoverNode(id: string): Promise<QuestNode> {
        const artifact = await this.generateName('artifact');
        const location = await this.generateName('location');
        return this.node(
            id,
            `Recover ${artifact.text}`,
            `Retrieve the ${this.label(artifact)} from ${location.text} and extract intact.`,
            `Obtain ${this.label(artifact)} at ${location.text}.`,
            'recover',
            this.entities(artifact, location),
        );
    }

    private async createEscortNode(id: string): Promise<QuestNode> {
        const character = await this.generateName('character');
        const destination = await this.generateName('location');
        return this.node(
            id,
            `Escort ${character.text}`,
            `Guide ${character.text} through danger and reach ${destination.text}.`,
            `Arrive at ${destination.text} with ${character.text} alive.`,
            'escort',
            this.entities(character, destination),
        );
    }

    private async createDefendNode(id: string): Promise<QuestNode> {
        const location = await this.generateName('location');
        const artifact = await this.generateName('artifact');
        return this.node(
            id,
            `Defend ${location.text}`,
            `Hold ${location.text} until the ${this.label(artifact)} is secured.`,
            `Prevent the fall of ${location.text} while securing ${this.label(artifact)}.`,
            'defend',
            this.entities(location, artifact),
        );
    }

    private removeText(amount: number, target: GeneratedName, where: string): string {
        return `Remove ${amount} ${this.pluralLabel(target, amount)}${where}.`;
    }

    private killText(amount: number, target: GeneratedName, where: string): string {
        return `Kill ${amount} ${this.pluralLabel(target, amount)}${where}.`;
    }

    private pluralLabel(name: GeneratedName, count: number): string {
        return `${this.label(name)}${count > 1 ? 's' : ''}`;
    }

    private async rareMonsterProfile(): Promise<RareMonsterProfile> {
        return {
            name: await this.generateName('monster'),
            count: this.random.nextInt(1, 3),
            stats: this.pickMany(MONSTER_STATS, 2),
            effects: this.pickMany(MONSTER_EFFECTS, 2),
            bonus: this.random.pick(MONSTER_BONUSES),
            mutatedFrom: this.random.pick(MUTATED_FROM_SPECIES),
        };
    }

    private async generateName(domain: 'location' | 'artifact' | 'character' | 'monster'): Promise<GeneratedName> {
        return this.packService.generateName(domain, this.maxWordsByDomain[domain]);
    }

    private pickMany(pool: string[], count: number): string[] {
        const selected = new Set<string>();
        let attempts = 0;
        while (selected.size < count && attempts < pool.length * 4) {
            selected.add(this.random.pick(pool));
            attempts += 1;
        }

        for (const candidate of pool) {
            if (selected.size >= count) {
                break;
            }
            selected.add(candidate);
        }
        return Array.from(selected);
    }

    private label(name: GeneratedName): string {
        return name.text;
    }

    private entities(...names: Array<GeneratedName | null>): QuestTextEntity[] {
        const unique = new Map<string, QuestTextEntity>();

        for (const name of names) {
            if (!name) {
                continue;
            }

            const type = name.domain === 'location'
                ? 'location'
                : name.domain === 'artifact'
                    ? 'item'
                    : name.domain === 'character'
                        ? 'person'
                        : name.domain === 'monster'
                            ? 'monster'
                            : null;

            if (!type) {
                continue;
            }

            unique.set(`${type}:${name.text}`, { text: name.text, type });
        }

        return Array.from(unique.values());
    }

    private node(
        id: string,
        title: string,
        description: string,
        conditionText: string,
        objectiveType: QuestObjectiveType,
        entities: QuestTextEntity[],
        objectiveData?: QuestObjectiveData,
    ): QuestNode {
        return { id, title, description, conditionText, objectiveType, entities, objectiveData, children: [] };
    }
}
