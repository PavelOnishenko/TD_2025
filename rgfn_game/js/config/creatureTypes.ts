export type CreatureSkill = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export type CreatureSkills = Record<CreatureSkill, number>;

// todo rule 17 in Style Guide
export type CreatureBaseStats = {
    hp: number;
    damage: number;
    armor: number;
    mana: number;
};

export type CreatureCategory = 'character' | 'monster' | 'mutant';

// todo rule 17 in Style Guide
export type CreatureArchetype = {
    id: string;
    name: string;
    category: CreatureCategory;
    description: string;
    baseStats: CreatureBaseStats;
    skills: CreatureSkills;
    loreTags?: string[];
    notes?: string[];
};

// todo rule 17 in Style Guide
export type CreatureDerivedStats = {
    maxHp: number;
    physicalDamage: number;
    armor: number;
    avoidChance: number;
    maxMana: number;
    magicPoints: number;
};

export const CREATURE_SKILLS: CreatureSkill[] = ['vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence'];

// todo arrow function?
export function createZeroSkills(): CreatureSkills {
// todo rule 17 in Style Guide
    return {
        vitality: 0,
        toughness: 0,
        strength: 0,
        agility: 0,
        connection: 0,
        intelligence: 0,
    };
}