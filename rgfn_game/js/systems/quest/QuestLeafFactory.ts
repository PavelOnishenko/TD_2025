import QuestPackService from './QuestPackService.js';
import { QuestRandom } from './QuestRandom.js';
import { GeneratedName, QuestNode, QuestObjectiveType, QuestTextEntity, RareMonsterProfile } from './QuestTypes.js';

const LEAF_TYPES: QuestObjectiveType[] = ['eliminate', 'deliver', 'travel', 'barter', 'scout', 'hunt', 'recover', 'escort', 'defend'];
const MONSTER_STATS = ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'];
const MONSTER_EFFECTS = ['causes fear', 'leaves toxic fog', 'shatters armor', 'drains mana', 'summons spores', 'breaks formation'];
const MONSTER_BONUSES = ['rich trophy cache', 'legendary reagent drop', 'rare relic trail', 'faction gratitude', 'reputation surge'];

export default class QuestLeafFactory {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;

    constructor(packService: QuestPackService, random: QuestRandom) {
        this.packService = packService;
        this.random = random;
    }

    public async create(id: string): Promise<QuestNode> {
        const type = this.random.pick(LEAF_TYPES);
        if (type === 'eliminate') return this.createEliminateNode(id);
        if (type === 'deliver') return this.createDeliverNode(id);
        if (type === 'travel') return this.createTravelNode(id);
        if (type === 'barter') return this.createBarterNode(id);
        if (type === 'scout') return this.createScoutNode(id);
        if (type === 'hunt') return this.createHuntNode(id);
        if (type === 'recover') return this.createRecoverNode(id);
        if (type === 'escort') return this.createEscortNode(id);
        return this.createDefendNode(id);
    }

    private async createEliminateNode(id: string): Promise<QuestNode> {
        const target = await this.packService.generateName('monster', 3);
        const amount = this.random.nextInt(1, 4);
        const location = await this.optionalLocation();
        const where = location ? ` in ${location.text}` : '';
        return this.node(
            id,
            `Purge ${target.text}${amount > 1 ? ' Pack' : ''}`,
            this.removeText(amount, target, where),
            this.killText(amount, target, where),
            'eliminate',
            this.entities(target, location),
        );
    }

    private async createDeliverNode(id: string): Promise<QuestNode> {
        const artifact = await this.packService.generateName('artifact', 4);
        const destination = await this.packService.generateName('location', 4);
        return this.node(
            id,
            `Courier: ${artifact.text}`,
            `Carry the ${this.label(artifact)} and bring it to ${destination.text}.`,
            `Reach ${destination.text} while carrying ${this.label(artifact)}.`,
            'deliver',
            this.entities(artifact, destination),
        );
    }

    private async createTravelNode(id: string): Promise<QuestNode> {
        const destination = await this.packService.generateName('location', 4);
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
        const trader = await this.packService.generateName('character', 3);
        const artifact = await this.packService.generateName('artifact', 4);
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
        const destination = await this.packService.generateName('location', 4);
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
        const location = await this.packService.generateName('location', 4);
        const details = `Stats: ${profile.stats.join(', ')}. Effects: ${profile.effects.join(', ')}. Bonus: ${profile.bonus}.`;
        return this.node(
            id,
            `Hunt ${profile.name.text}`,
            `Track ${profile.count} rare mutant target${profile.count > 1 ? 's' : ''} near ${location.text}. ${details}`,
            `Kill ${profile.count} ${this.pluralLabel(profile.name, profile.count)} near ${location.text}.`,
            'hunt',
            this.entities(profile.name, location),
        );
    }

    private async createRecoverNode(id: string): Promise<QuestNode> {
        const artifact = await this.packService.generateName('artifact', 4);
        const location = await this.packService.generateName('location', 4);
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
        const character = await this.packService.generateName('character', 3);
        const destination = await this.packService.generateName('location', 4);
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
        const location = await this.packService.generateName('location', 4);
        const artifact = await this.packService.generateName('artifact', 4);
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

    private async optionalLocation(): Promise<GeneratedName | null> {
        return this.random.nextBool(0.5) ? this.packService.generateName('location', 4) : null;
    }

    private async rareMonsterProfile(): Promise<RareMonsterProfile> {
        return {
            name: await this.packService.generateName('monster', 3),
            count: this.random.nextInt(1, 3),
            stats: this.pickMany(MONSTER_STATS, 2),
            effects: this.pickMany(MONSTER_EFFECTS, 2),
            bonus: this.random.pick(MONSTER_BONUSES),
        };
    }

    private pickMany(pool: string[], count: number): string[] {
        const selected = new Set<string>();
        while (selected.size < count) {
            selected.add(this.random.pick(pool));
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
    ): QuestNode {
        return { id, title, description, conditionText, objectiveType, entities, children: [] };
    }
}
