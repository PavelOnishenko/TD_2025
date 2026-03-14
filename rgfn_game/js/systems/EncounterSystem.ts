import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton, { EnemyConfig } from '../entities/Skeleton.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item, { BOW_ITEM, HEALING_POTION_ITEM } from '../entities/Item.js';

export type EncounterResult =
    | { type: 'battle', enemies: Skeleton[] }
    | { type: 'none' }
    | { type: 'item', item: Item }
    | { type: 'village' };

export type ForcedEncounterType = 'skeleton' | 'zombie' | 'ninja' | 'darkKnight' | 'dragon' | 'item' | 'none' | 'village';

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private bowFound: boolean;
    private itemDiscoveryChance: number;
    private forcedEncounters: ForcedEncounterType[];

    constructor(encounterRate?: number) {
        this.encounterRate = encounterRate ?? balanceConfig.encounters.encounterRate;
        this.stepsSinceEncounter = 0;
        this.bowFound = false;
        this.itemDiscoveryChance = 0.15; // 15% chance to find item instead of enemies
        this.forcedEncounters = [];
    }

    public onPlayerMove(): void {
        this.stepsSinceEncounter++;
    }

    public checkEncounter(isPreviouslyDiscovered: boolean = false): boolean {
        if (this.forcedEncounters.length > 0) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        const encounterRate = isPreviouslyDiscovered
            ? balanceConfig.encounters.discoveredEncounterRate
            : this.encounterRate;

        const roll = Math.random();
        if (roll < encounterRate) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        return false;
    }

    public generateEncounter(): EncounterResult {
        // Check if we should discover an item.
        // Bow is unique, while healing potions can be found repeatedly.
        if (Math.random() < this.itemDiscoveryChance) {
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
        
        if (this.forcedEncounters.length > 0) {
            const forcedType = this.forcedEncounters.shift();
            if (forcedType) {
                return this.createForcedEncounter(forcedType);
            }
        }

        const eventType = this.rollEncounterEventType();

        if (eventType === 'village') {
            return { type: 'village' };
        }

        if (eventType === 'item' && !this.bowFound) {
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


    public queueForcedEncounter(type: ForcedEncounterType): void {
        this.forcedEncounters.push(type);
    }

    public clearForcedEncounters(): void {
        this.forcedEncounters = [];
    }

    public getForcedEncounterQueue(): ForcedEncounterType[] {
        return [...this.forcedEncounters];
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
