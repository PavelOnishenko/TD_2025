import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton, { EnemyConfig } from '../entities/Skeleton.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item, { BOW_ITEM } from '../entities/Item.js';

export type EncounterResult =
    | { type: 'battle', enemies: Skeleton[] }
    | { type: 'none' }
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

        const encounterType = this.rollEncounterType();

        if (encounterType === 'dragon') {
            const dragon = new Skeleton(0, 0, balanceConfig.enemies.dragon);
            if (dragon.shouldPassEncounter()) {
                return { type: 'none' };
            }

            return { type: 'battle', enemies: [dragon] };
        }

        const enemies = this.createEnemiesForEncounter(encounterType);
        return { type: 'battle', enemies };
    }

    private createEnemiesForEncounter(encounterType: string): Skeleton[] {
        const enemies: Skeleton[] = [];

        if (encounterType === 'skeleton') {
            const count = randomInt(
                balanceConfig.encounters.minEnemies,
                balanceConfig.encounters.maxEnemies
            );

            for (let i = 0; i < count; i++) {
                enemies.push(new Skeleton(0, 0, balanceConfig.enemies.skeleton));
            }

            return enemies;
        }

        if (encounterType === 'zombie') {
            const count = randomInt(
                balanceConfig.encounters.zombieMinGroup,
                balanceConfig.encounters.zombieMaxGroup
            );

            for (let i = 0; i < count; i++) {
                enemies.push(new Skeleton(0, 0, balanceConfig.enemies.zombie));
            }

            return enemies;
        }

        const configMap: Record<string, EnemyConfig> = {
            ninja: balanceConfig.enemies.ninja,
            darkKnight: balanceConfig.enemies.darkKnight,
        };

        const config = configMap[encounterType] ?? balanceConfig.enemies.skeleton;
        enemies.push(new Skeleton(0, 0, config));
        return enemies;
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
