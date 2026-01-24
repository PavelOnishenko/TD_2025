import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item, { BOW_ITEM } from '../entities/Item.js';

export type EncounterResult =
    | { type: 'battle', enemies: Skeleton[] }
    | { type: 'item', item: Item };

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private minStepsBeforeEncounter: number;
    private bowFound: boolean;
    private itemDiscoveryChance: number;

    constructor(encounterRate?: number) {
        this.encounterRate = encounterRate ?? balanceConfig.encounters.encounterRate;
        this.stepsSinceEncounter = 0;
        this.minStepsBeforeEncounter = balanceConfig.encounters.minStepsBeforeEncounter;
        this.bowFound = false;
        this.itemDiscoveryChance = 0.15; // 15% chance to find item instead of enemies
    }

    public onPlayerMove(): void {
        this.stepsSinceEncounter++;
    }

    public checkEncounter(): boolean {
        if (this.stepsSinceEncounter < this.minStepsBeforeEncounter) {
            return false;
        }

        const roll = Math.random();
        if (roll < this.encounterRate) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        return false;
    }

    public generateEncounter(): EncounterResult {
        // Check if we should discover an item (only if bow hasn't been found yet)
        if (!this.bowFound && Math.random() < this.itemDiscoveryChance) {
            this.bowFound = true;
            const bow = new Item(BOW_ITEM);
            return { type: 'item', item: bow };
        }

        // Generate normal enemy encounter
        const enemyCount = randomInt(
            balanceConfig.encounters.minEnemies,
            balanceConfig.encounters.maxEnemies
        );
        const enemies: Skeleton[] = [];

        for (let i = 0; i < enemyCount; i++) {
            enemies.push(new Skeleton(0, 0));
        }

        return { type: 'battle', enemies };
    }
}
