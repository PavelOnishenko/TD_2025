/**
 * Item - Represents items that can be discovered and equipped by the player
 */
export type ItemId = 'bow' | 'healingPotion' | 'manaPotion';

export interface ItemData {
    id: ItemId;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable';
    attackRange?: number; // For weapons - how many cells away can you attack
}

export default class Item {
    public id: ItemId;
    public name: string;
    public description: string;
    public type: 'weapon' | 'armor' | 'consumable';
    public attackRange: number;

    constructor(data: ItemData) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.type = data.type;
        this.attackRange = data.attackRange ?? 1; // Default to 1 cell (melee)
    }
}

// Predefined items
export const BOW_ITEM: ItemData = {
    id: 'bow',
    name: 'Bow',
    description: 'A sturdy bow that allows you to attack from 2 cells away',
    type: 'weapon',
    attackRange: 2
};

export const HEALING_POTION_ITEM: ItemData = {
    id: 'healingPotion',
    name: 'Healing Potion',
    description: 'A restorative potion that heals 5 HP when used',
    type: 'consumable'
};

export const MANA_POTION_ITEM: ItemData = {
    id: 'manaPotion',
    name: 'Mana Potion',
    description: 'A restorative potion that recovers mana when used',
    type: 'consumable'
};
