import { randomInt } from '../../../../engine/utils/MathUtils.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import Item from '../../entities/Item.js';
import Skeleton from '../../entities/Skeleton.js';
import EncounterResolver from './EncounterResolver.js';

export type EncounterResult =
    | { type: 'battle', enemies: Skeleton[] }
    | { type: 'none' }
    | { type: 'item', item: Item }
    | { type: 'village' };

export type ForcedEncounterType = 'skeleton' | 'zombie' | 'ninja' | 'darkKnight' | 'dragon' | 'item' | 'none' | 'village';

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private itemDiscoveryChance: number;
    private encounterResolver: EncounterResolver;

    constructor(encounterRate?: number) {
        this.encounterRate = encounterRate ?? balanceConfig.encounters.encounterRate;
        this.stepsSinceEncounter = 0;
        this.itemDiscoveryChance = 0.15;
        this.encounterResolver = new EncounterResolver();
    }

    public onPlayerMove(): void {
        this.stepsSinceEncounter++;
    }

    public checkEncounter(isPreviouslyDiscovered: boolean = false): boolean {
        if (this.getForcedEncounterQueue().length > 0) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        const encounterRate = isPreviouslyDiscovered
            ? balanceConfig.encounters.discoveredEncounterRate
            : this.encounterRate;

        if (Math.random() < encounterRate) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        return false;
    }

    public generateEncounter(): EncounterResult {
        return this.encounterResolver.generateEncounter(this.itemDiscoveryChance, {
            rollEncounterEventType: () => this.rollEncounterEventType(),
            rollEncounterType: () => this.rollEncounterType(),
        });
    }

    public queueForcedEncounter(type: ForcedEncounterType): void {
        this.encounterResolver.queueForcedEncounter(type);
    }

    public clearForcedEncounters(): void {
        this.encounterResolver.clearForcedEncounters();
    }

    public getForcedEncounterQueue(): ForcedEncounterType[] {
        return this.encounterResolver.getForcedEncounterQueue();
    }

    private rollEncounterEventType(): 'monster' | 'item' | 'village' {
        const configured = Array.isArray(balanceConfig.encounters.eventTypeWeights)
            ? balanceConfig.encounters.eventTypeWeights
            : [];

        const entries: Array<{ type: 'monster' | 'item' | 'village'; weight: number }> = [];
        configured.forEach((entry) => {
            const weight = Number(entry?.weight);
            const type = entry?.type;
            if ((type === 'monster' || type === 'item' || type === 'village') && weight > 0) {
                entries.push({ type, weight });
            }
        });

        if (entries.length === 0) {
            return 'monster';
        }

        const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const entry of entries) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.type;
            }
        }

        return entries[entries.length - 1].type;
    }

    private rollEncounterType(): string {
        const weights = balanceConfig.encounters.enemyWeights;
        const orderedTypes = ['skeleton', 'zombie', 'ninja', 'darkKnight', 'dragon'];
        const totalWeight = orderedTypes.reduce((sum, type) => sum + weights[type], 0);

        let roll = randomInt(0, totalWeight - 1);

        for (const type of orderedTypes) {
            roll -= weights[type];
            if (roll < 0) {
                return type;
            }
        }

        return 'skeleton';
    }
}
