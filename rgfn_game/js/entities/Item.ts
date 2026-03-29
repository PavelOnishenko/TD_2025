/**
 * Item - Represents items that can be discovered and equipped by the player
 */

import type {
    EquipmentHands,
    ItemData,
    ItemEffects,
    ItemRequirements,
} from './ItemDeclarations.js';

export type { ItemId } from './ItemDeclarations.js';
export type {
    EquipmentHands,
    ItemData,
    ItemEffects,
    ItemRequirements,
} from './ItemDeclarations.js';

export default class Item {
    public id: string;
    public name: string;
    public description: string;
    public type: 'weapon' | 'armor' | 'consumable';
    public attackRange: number;
    public handsRequired: EquipmentHands;
    public damageBonus: number;
    public requirements: ItemRequirements;
    public goldValue: number;
    public findWeight: number;
    public isRanged: boolean;
    public spriteClass: string;
    public effects: ItemEffects;

    constructor(data: ItemData) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.type = data.type;
        this.attackRange = data.attackRange ?? 1;
        this.handsRequired = data.handsRequired ?? 1;
        this.damageBonus = data.damageBonus ?? 0;
        this.requirements = data.requirements ?? {};
        this.goldValue = data.goldValue ?? 0;
        this.findWeight = data.findWeight ?? 0;
        this.isRanged = data.isRanged ?? false;
        this.spriteClass = data.spriteClass ?? 'unknown-item-sprite';
        this.effects = data.effects ?? {};
    }
}

const WEAPON_VARIANTS: Array<{
    key: string;
    baseName: string;
    damageBonuses: number[];
    handsRequired: EquipmentHands;
    requirements: ItemRequirements;
    goldValue: number;
    findWeight: number;
    isRanged?: boolean;
    attackRange?: number;

}> = [
    { key: 'knife', baseName: 'Knife', damageBonuses: [1, 2, 3, 4], handsRequired: 1, requirements: { agility: 2 }, goldValue: 2, findWeight: 10, },
    { 
        key: 'shortSword', baseName: 'Short Sword', damageBonuses: [2, 3, 4, 5], handsRequired: 1, requirements: { agility: 4, strength: 2 }, goldValue: 5, 
        findWeight: 9,
    },
    { key: 'axe', baseName: 'Axe', damageBonuses: [3, 4, 5, 6], handsRequired: 1, requirements: { agility: 4, strength: 6 }, goldValue: 7, findWeight: 7, },
    {
        key: 'twoHandedSword', baseName: 'Two-Handed Sword', damageBonuses: [9, 11, 13, 14], handsRequired: 2, requirements: { agility: 4, strength: 12 },
        goldValue: 18, findWeight: 5,
    },
    {
        key: 'bow', baseName: 'Bow', damageBonuses: [1, 2, 3, 4], handsRequired: 2, requirements: { agility: 8, strength: 2 }, goldValue: 12, findWeight: 3, 
        isRanged: true, attackRange: 2,
    },
    {
        key: 'crossbow', baseName: 'Crossbow', damageBonuses: [3, 4, 5, 6], handsRequired: 2, requirements: { agility: 10, strength: 6 }, goldValue: 20, 
        findWeight: 2, isRanged: true, attackRange: 3,
    },
];

const ARMOR_VARIANTS: Array<{
    id: string;
    name: string;
    description: string;
    effects: ItemEffects;
    findWeight: number;
    goldValue: number;
    spriteClass: string;
}> = [
    { id: 'armor_t1', name: 'Armor +1', description: '+1 armor', effects: { flatArmor: 1 }, findWeight: 1, goldValue: 12, spriteClass: 'armor-t1-sprite' },
    {
        id: 'armor_t2', name: 'Armor +1 Guarded', description: '+1 armor and 20% damage decrease', effects: { flatArmor: 1, damageReductionPercent: 0.2 }, 
        findWeight: 1, goldValue: 16, spriteClass: 'armor-t2-sprite'
    },
    {
        id: 'armor_t3', name: 'Armor +2 Fragile', description: '+2 armor, but can only absorb 20 HP', effects: { flatArmor: 2, maxAbsorbHp: 20 }, findWeight: 1, 
        goldValue: 18, spriteClass: 'armor-t3-sprite'
    },
    {
        id: 'armor_t4', name: 'Armor Bulwark', description: '50% damage decrease, can only absorb 20 HP', effects: { damageReductionPercent: 0.5, maxAbsorbHp: 20 },
        findWeight: 1, goldValue: 20, spriteClass: 'armor-t4-sprite'
    },
];

const generatedWeapons: ItemData[] = WEAPON_VARIANTS.flatMap((variant) => (
    variant.damageBonuses.map((damageBonus, index) => {
        const tier = index + 1;
        return {
            id: `${variant.key}_t${tier}`,
            name: `${variant.baseName} +${damageBonus}`,
            description: `${variant.handsRequired === 2 ? 'Two-handed' : 'One-handed'} weapon (+${damageBonus} damage)`,
            type: 'weapon' as const,
            damageBonus,
            handsRequired: variant.handsRequired,
            requirements: variant.requirements,
            goldValue: variant.goldValue,
            findWeight: variant.findWeight,
            isRanged: variant.isRanged ?? false,
            attackRange: variant.attackRange ?? 1,
            spriteClass: `${variant.key}-t${tier}-sprite`,
        };
    })
));

// todo is this needed? Dead code check. We destroy dead code. If it's needed, can it be processed normally instead like all other weapons? Do it.
export const BOW_ITEM: ItemData = {...generatedWeapons.find((item) => item.id === 'bow_t1')!, id: 'bow', name: 'Bow', };

export const HEALING_POTION_ITEM: ItemData = {
    id: 'healingPotion', name: 'Healing Potion', description: 'A restorative potion that heals 5 HP when used', type: 'consumable', goldValue: 4, 
    spriteClass: 'potion-sprite',
};

export const MANA_POTION_ITEM: ItemData = { id: 'manaPotion', name: 'Mana Potion', description: 'A restorative potion that recovers mana when used', type: 'consumable' };

export const ITEM_LIBRARY: ItemData[] = [
    HEALING_POTION_ITEM,
    MANA_POTION_ITEM,
    BOW_ITEM,
    ...generatedWeapons.filter((item) => item.id !== 'bow_t1'),
    ...ARMOR_VARIANTS.map((armor) => ({
        id: armor.id, name: armor.name, description: armor.description, type: 'armor' as const, effects: armor.effects, goldValue: armor.goldValue,
        findWeight: armor.findWeight, spriteClass: armor.spriteClass,
    })),
];

export const DISCOVERABLE_ITEM_LIBRARY: ItemData[] = ITEM_LIBRARY;

export function createItemById(id: string): Item | null {
    const data = ITEM_LIBRARY.find((item) => item.id === id);
    if (!data) {
        return null;
    }

    return new Item(data);
}
