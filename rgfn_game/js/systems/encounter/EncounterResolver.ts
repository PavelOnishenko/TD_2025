import { randomInt } from '../../../../engine/utils/MathUtils.js';
import Skeleton, { EnemyConfig } from '../../entities/Skeleton.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY, HEALING_POTION_ITEM, MANA_POTION_ITEM } from '../../entities/Item.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import type { EncounterResult, ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import Wanderer from '../../entities/Wanderer.js';
import CombatBehaviorFactory from '../combat/CombatBehaviorFactory.js';

type EncounterEventType = 'monster' | 'item' | 'village' | 'traveler';

type EncounterRolls = {
    rollEncounterEventType: () => EncounterEventType;
    rollEncounterType: () => string;
};

type EncounterGenerationOptions = {
    canDiscoverItems?: boolean;
    canDiscoverVillages?: boolean;
    enabledEventTypes?: RandomEncounterType[];
};

export default class EncounterResolver {
    private forcedEncounters: ForcedEncounterType[];
    private readonly behaviorFactory: CombatBehaviorFactory;

    constructor() {
        this.forcedEncounters = [];
        this.behaviorFactory = new CombatBehaviorFactory();
    }

    public generateEncounter(itemDiscoveryChance: number, rolls: EncounterRolls, options: EncounterGenerationOptions = {}): EncounterResult {
        const {
            canDiscoverItems = true,
            canDiscoverVillages = true,
            enabledEventTypes = ['monster', 'item', 'village', 'traveler'],
        } = options;

        if (enabledEventTypes.length === 0) {
            return { type: 'none' };
        }

        if (canDiscoverItems && enabledEventTypes.includes('item') && Math.random() < itemDiscoveryChance) {
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
            if (canDiscoverVillages) {
                return { type: 'village' };
            }

            return { type: 'battle', enemies: this.createEnemiesForEncounter(rolls.rollEncounterType()) };
        }

        if (eventType === 'item') {
            if (canDiscoverItems) {
                return this.createRandomItemEncounter();
            }

            return { type: 'battle', enemies: this.createEnemiesForEncounter(rolls.rollEncounterType()) };
        }

        if (eventType === 'traveler') {
            return this.createTravelerEncounter();
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
        const discoverableItems: Item[] = [new Item(HEALING_POTION_ITEM), new Item(MANA_POTION_ITEM)];
        const weightedPool = balanceConfig.items.discoveryPool;
        const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

        if (totalWeight <= 0) {
            return { type: 'item', item: new Item(HEALING_POTION_ITEM) };
        }

        let roll = Math.random() * totalWeight;
        for (const candidate of weightedPool) {
            roll -= candidate.weight;
            if (roll <= 0) {
                const itemData = DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === candidate.id);
                if (itemData) {
                    return { type: 'item', item: new Item(itemData) };
                }
            }
        }

        return { type: 'item', item: new Item(HEALING_POTION_ITEM) };
    }

    private createDragonEncounter(): EncounterResult {
        const dragon = new Skeleton(0, 0, balanceConfig.enemies.dragon);
        dragon.setCombatBehaviorProfile(this.behaviorFactory.getProfile(dragon.archetypeId));
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
            return this.createRandomItemEncounter();
        }

        if (type === 'village') {
            return { type: 'village' };
        }

        if (type === 'traveler') {
            return this.createTravelerEncounter();
        }

        if (type === 'dragon') {
            const dragon = new Skeleton(0, 0, balanceConfig.enemies.dragon);
            dragon.setCombatBehaviorProfile(this.behaviorFactory.getProfile(dragon.archetypeId));
            return { type: 'battle', enemies: [dragon] };
        }

        return { type: 'battle', enemies: this.createEnemiesForEncounter(type) };
    }


    private createTravelerEncounter(): EncounterResult {
        const traveler = Wanderer.createRandom();
        traveler.setCombatBehaviorProfile(this.behaviorFactory.getProfile(traveler.archetypeId));
        const isHostile = Math.random() < 0.5;
        return { type: 'traveler', traveler, isHostile };
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
        const enemy = new Skeleton(0, 0, config);
        enemy.setCombatBehaviorProfile(this.behaviorFactory.getProfile(enemy.archetypeId));
        return [enemy];
    }

    private createEnemyGroup(config: EnemyConfig, min: number, max: number): Skeleton[] {
        const count = randomInt(min, max);
        const enemies: Skeleton[] = [];

        for (let i = 0; i < count; i++) {
            const enemy = new Skeleton(0, 0, config);
            enemy.setCombatBehaviorProfile(this.behaviorFactory.getProfile(enemy.archetypeId));
            enemies.push(enemy);
        }

        return enemies;
    }
}
