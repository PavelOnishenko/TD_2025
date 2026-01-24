/**
 * Item - Represents items that can be discovered and equipped by the player
 */
export interface ItemData {
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable';
    attackRange?: number; // For weapons - how many cells away can you attack
}

export default class Item {
    public name: string;
    public description: string;
    public type: 'weapon' | 'armor' | 'consumable';
    public attackRange: number;

    constructor(data: ItemData) {
        this.name = data.name;
        this.description = data.description;
        this.type = data.type;
        this.attackRange = data.attackRange ?? 1; // Default to 1 cell (melee)
    }
}

// Predefined items
export const BOW_ITEM: ItemData = {
    name: 'Bow',
    description: 'A sturdy bow that allows you to attack from 2 cells away',
    type: 'weapon',
    attackRange: 2
};
