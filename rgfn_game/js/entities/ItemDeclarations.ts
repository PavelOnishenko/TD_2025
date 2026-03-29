export type ItemId = 'bow' | 'healingPotion' | 'manaPotion';

export type EquipmentHands = 1 | 2;

export interface ItemRequirements {
    agility?: number;
    strength?: number;
}

export interface ItemEffects {
    flatArmor?: number;
    damageReductionPercent?: number;
    maxAbsorbHp?: number;
}

export interface ItemData {
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable';
    attackRange?: number;
    handsRequired?: EquipmentHands;
    damageBonus?: number;
    requirements?: ItemRequirements;
    goldValue?: number;
    findWeight?: number;
    isRanged?: boolean;
    spriteClass?: string;
    effects?: ItemEffects;
}
