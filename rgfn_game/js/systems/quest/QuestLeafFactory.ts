import QuestPackService from './QuestPackService.js';
import { QuestRandom } from './QuestRandom.js';
import { theme } from '../../config/ThemeConfig.js';
import { DeliverObjectiveData, GeneratedName, QuestNode, QuestObjectiveType } from './QuestTypes.js';
import QuestLeafContentBuilder from './QuestLeafContentBuilder.js';

const LEAF_TYPES: QuestObjectiveType[] = ['eliminate', 'deliver', 'travel', 'barter', 'scout', 'hunt', 'recover', 'escort', 'defend'];

export default class QuestLeafFactory {
    private readonly packService: QuestPackService;
    private readonly random: QuestRandom;
    private readonly maxWordsByDomain = theme.quest.nameGeneration.maxWordsByDomain;
    private readonly contentBuilder: QuestLeafContentBuilder;

    constructor(packService: QuestPackService, random: QuestRandom) {
        this.packService = packService;
        this.random = random;
        this.contentBuilder = new QuestLeafContentBuilder(random);
    }

    public async create(id: string): Promise<QuestNode> {
        const type = this.random.pick(LEAF_TYPES);
        if (type === 'eliminate') { return this.createEliminateNode(id); }
        if (type === 'deliver') { return this.createDeliverNode(id); }
        if (type === 'travel') { return this.createTravelNode(id); }
        if (type === 'barter') { return this.createBarterNode(id); }
        if (type === 'scout') { return this.createScoutNode(id); }
        if (type === 'hunt') { return this.createHuntNode(id); }
        if (type === 'recover') { return this.createRecoverNode(id); }
        if (type === 'escort') { return this.createEscortNode(id); }
        return this.createDefendNode(id);
    }

    private async createEliminateNode(id: string): Promise<QuestNode> {
        const target = await this.generateName('monster');
        const amount = this.random.nextInt(1, 4);
        const location = await this.generateName('location');
        const where = ` near ${location.text}`;
        const mutatedFrom = this.contentBuilder.randomMutatedSpecies();
        const mutations = this.contentBuilder.randomMutations(this.random.nextBool(0.5) ? 2 : 3);
        const details = `Origin: mutated from ${mutatedFrom}. Traits observed: ${mutations.join(', ')}.`;
        return this.contentBuilder.node(
            id,
            `Purge ${target.text}${amount > 1 ? ' Pack' : ''}`,
            `${this.contentBuilder.removeText(amount, target, where)} ${details}`,
            this.contentBuilder.killText(amount, target, where),
            'eliminate',
            this.contentBuilder.entities(target, location),
            { monster: { targetName: target.text, requiredKills: amount, villageName: location.text, mutations, mutatedFrom } },
        );
    }

    private async createDeliverNode(id: string): Promise<QuestNode> {
        const artifact = await this.generateName('artifact');
        const sourceTrader = await this.generateName('character');
        const sourceVillage = await this.generateName('location');
        const destination = await this.resolveDestination(sourceVillage);
        const objectiveData: DeliverObjectiveData = {
            sourceVillage: sourceVillage.text,
            sourceTrader: sourceTrader.text,
            destinationVillage: destination.text,
            itemName: artifact.text,
        };
        const description = `Acquire ${this.contentBuilder.label(artifact)} from ${sourceTrader.text} in ${sourceVillage.text}, then carry it to ${destination.text}.`;
        const condition = `Reach ${destination.text} while carrying ${this.contentBuilder.label(artifact)} obtained from ${sourceTrader.text} in ${sourceVillage.text}.`;
        return this.contentBuilder.node(
            id,
            `Courier: ${artifact.text}`,
            description,
            condition,
            'deliver',
            this.contentBuilder.entities(artifact, sourceTrader, sourceVillage, destination),
            { deliver: objectiveData },
        );
    }

    private async createTravelNode(id: string): Promise<QuestNode> {
        const destination = await this.generateName('location');
        return this.contentBuilder.node(
            id,
            `Scout ${destination.text}`,
            `Travel to ${destination.text} and secure the path.`,
            `Enter ${destination.text}.`,
            'travel',
            this.contentBuilder.entities(destination),
        );
    }

    private async createBarterNode(id: string): Promise<QuestNode> {
        const trader = await this.generateName('character');
        const artifact = await this.generateName('artifact');
        return this.contentBuilder.node(
            id,
            `Barter with ${trader.text}`,
            `Negotiate with ${trader.text} and exchange for ${this.contentBuilder.label(artifact)}.`,
            `Complete one barter deal and obtain ${this.contentBuilder.label(artifact)}.`,
            'barter',
            this.contentBuilder.entities(trader, artifact),
        );
    }

    private async createScoutNode(id: string): Promise<QuestNode> {
        const destination = await this.generateName('location');
        return this.contentBuilder.node(
            id,
            `Investigate ${destination.text}`,
            `Inspect tracks, ruins, and anomalies around ${destination.text}.`,
            `Finish one scouting investigation at ${destination.text}.`,
            'scout',
            this.contentBuilder.entities(destination),
        );
    }

    private async createHuntNode(id: string): Promise<QuestNode> {
        const profile = await this.contentBuilder.rareMonsterProfile(() => this.generateName('monster'));
        const location = await this.generateName('location');
        const details = `Origin: mutated from ${profile.mutatedFrom}. `
            + `Stats: ${profile.stats.join(', ')}. `
            + `Effects: ${profile.effects.join(', ')}. `
            + `Bonus: ${profile.bonus}.`;
        return this.contentBuilder.node(
            id,
            `Hunt ${profile.name.text}`,
            `Track ${profile.count} rare mutant target${profile.count > 1 ? 's' : ''} near ${location.text}. ${details}`,
            `Kill ${profile.count} ${this.contentBuilder.pluralLabel(profile.name, profile.count)} near ${location.text}.`,
            'hunt',
            this.contentBuilder.entities(profile.name, location),
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
        return this.contentBuilder.node(
            id,
            `Recover ${artifact.text}`,
            `Retrieve the ${this.contentBuilder.label(artifact)} from ${location.text} and extract intact.`,
            `Obtain ${this.contentBuilder.label(artifact)} at ${location.text}.`,
            'recover',
            this.contentBuilder.entities(artifact, location),
        );
    }

    private async createEscortNode(id: string): Promise<QuestNode> {
        const character = await this.generateName('character');
        const destination = await this.generateName('location');
        return this.contentBuilder.node(
            id,
            `Escort ${character.text}`,
            `Guide ${character.text} through danger and reach ${destination.text}.`,
            `Arrive at ${destination.text} with ${character.text} alive.`,
            'escort',
            this.contentBuilder.entities(character, destination),
        );
    }

    private async createDefendNode(id: string): Promise<QuestNode> {
        const location = await this.generateName('location');
        const artifact = await this.generateName('artifact');
        return this.contentBuilder.node(
            id,
            `Defend ${location.text}`,
            `Hold ${location.text} until the ${this.contentBuilder.label(artifact)} is secured.`,
            `Prevent the fall of ${location.text} while securing ${this.contentBuilder.label(artifact)}.`,
            'defend',
            this.contentBuilder.entities(location, artifact),
        );
    }

    private generateName = (
        domain: 'location' | 'artifact' | 'character' | 'monster',
    ): Promise<GeneratedName> => this.packService.generateName(domain, this.maxWordsByDomain[domain]);

    private async resolveDestination(sourceVillage: GeneratedName): Promise<GeneratedName> {
        let destination = await this.generateName('location');
        const source = sourceVillage.text.trim().toLocaleLowerCase();
        if (destination.text.trim().toLocaleLowerCase() === source) {
            destination = await this.generateName('location');
        }
        return destination;
    }
}
