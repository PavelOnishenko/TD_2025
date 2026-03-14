import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton, { EnemyConfig } from '../entities/Skeleton.js';
import Item, { BOW_ITEM, HEALING_POTION_ITEM } from '../entities/Item.js';
import { balanceConfig } from '../config/balanceConfig.js';
import type { EncounterResult, ForcedEncounterType } from './EncounterSystem.js';

type EncounterEventType = 'monster' | 'item' | 'village';

type EncounterRolls = {
    rollEncounterEventType: () => EncounterEventType;
    rollEncounterType: () => string;
};

export default class EncounterResolver {
    private bowFound: boolean;
    private forcedEncounters: ForcedEncounterType[];

    constructor() {
        this.bowFound = false;
        this.forcedEncounters = [];
    }

    public generateEncounter(itemDiscoveryChance: number, rolls: EncounterRolls): EncounterResult {
        if (Math.random() < itemDiscoveryChance) {
            return this.createRandomItemEncounter();
        }

        if (this.forcedEncounters.length > 0) {
            const forcedType = this.forcedEncounters.shift();
            if (forcedType) {
                return this.createForcedEncounter(forcedType);
            }
        }

        const eventType = rolls.rollEncounterEventType();
        if (eventType === 'village') {
            return { type: 'village' };
        }

        if (eventType === 'item' && !this.bowFound) {
            this.bowFound = true;
            return { type: 'item', item: new Item(BOW_ITEM) };
        }

        const encounterType = rolls.rollEncounterType();
        if (encounterType === 'dragon') {
            return this.createDragonEncounter();
        }

        return { type: 'battle', enemies: this.createEnemiesForEncounter(encounterType) };
    }

    public queueForcedEncounter(type: ForcedEncounterType): void {
        this.forcedEncounters.push(type);
    }

    public clearForcedEncounters(): void {
        this.forcedEncounters = [];
    }

    public getForcedEncounterQueue(): ForcedEncounterType[] {
        return [...this.forcedEncounters];
    }

    private createRandomItemEncounter(): EncounterResult {
        const discoverableItems: Item[] = [new Item(HEALING_POTION_ITEM)];

        if (!this.bowFound) {
            discoverableItems.push(new Item(BOW_ITEM));
        }

        const discoveredItem = discoverableItems[randomInt(0, discoverableItems.length - 1)];
        if (discoveredItem.id === 'bow') {
            this.bowFound = true;
        }

        return { type: 'item', item: discoveredItem };
    }

    private createDragonEncounter(): EncounterResult {
        const dragon = new Skeleton(0, 0, balanceConfig.enemies.dragon);
        if (dragon.shouldPassEncounter()) {
            return { type: 'none' };
        }

        return { type: 'battle', enemies: [dragon] };
    }

    private createForcedEncounter(type: ForcedEncounterType): EncounterResult {
        if (type === 'none') {
            return { type: 'none' };
        }

        if (type === 'item') {
            this.bowFound = true;
            return { type: 'item', item: new Item(BOW_ITEM) };
        }

        if (type === 'village') {
            return { type: 'village' };
        }

        if (type === 'dragon') {
            return { type: 'battle', enemies: [new Skeleton(0, 0, balanceConfig.enemies.dragon)] };
        }

        return { type: 'battle', enemies: this.createEnemiesForEncounter(type) };
    }

    private createEnemiesForEncounter(encounterType: string): Skeleton[] {
        if (encounterType === 'skeleton') {
            return this.createEnemyGroup(
                balanceConfig.enemies.skeleton,
                balanceConfig.encounters.minEnemies,
                balanceConfig.encounters.maxEnemies
            );
        }

        if (encounterType === 'zombie') {
            return this.createEnemyGroup(
                balanceConfig.enemies.zombie,
                balanceConfig.encounters.zombieMinGroup,
                balanceConfig.encounters.zombieMaxGroup
            );
        }

        const configMap: Record<string, EnemyConfig> = {
            ninja: balanceConfig.enemies.ninja,
            darkKnight: balanceConfig.enemies.darkKnight,
        };

        const config = configMap[encounterType] ?? balanceConfig.enemies.skeleton;
        return [new Skeleton(0, 0, config)];
    }

    private createEnemyGroup(config: EnemyConfig, min: number, max: number): Skeleton[] {
        const count = randomInt(min, max);
        const enemies: Skeleton[] = [];

        for (let i = 0; i < count; i++) {
            enemies.push(new Skeleton(0, 0, config));
        }

        return enemies;
    }
}
