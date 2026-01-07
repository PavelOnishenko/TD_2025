/**
 * Balance Configuration
 * Centralized location for all game balance parameters
 */

export const balanceConfig = {
    // ============ PLAYER STATS ============
    player: {
        // Base stats (without any stat points allocated)
        baseHp: 5,
        baseDamage: 2,
        baseArmor: 0,

        // Visual properties
        width: 32,
        height: 32,
    },

    // ============ ENEMY STATS ============
    enemies: {
        skeleton: {
            hp: 3,
            damage: 2,
            xpValue: 3,
            name: 'Skeleton',
            width: 30,
            height: 30,
        },
        zombie: {
            hp: 7,
            damage: 1,
            xpValue: 5,
            name: 'Zombie',
            width: 30,
            height: 30,
        },
    },

    // ============ STAT CONVERSION RATES ============
    stats: {
        // Each Vitality point increases max HP by 1
        vitalityToHp: 1,

        // 3 Toughness points = 1 armor (armor reduces damage by 1)
        toughnessToArmor: 3,

        // 2 Strength points = +1 damage
        strengthToDamage: 2,
    },

    // ============ LEVEL SYSTEM ============
    leveling: {
        maxLevel: 20,
        skillPointsPerLevel: 4,

        // XP required for each level (index 0 = XP for level 2, etc.)
        xpRequirements: [
            5,   // Level 1 -> 2
            8,   // Level 2 -> 3
            13,  // Level 3 -> 4
            18,  // Level 4 -> 5
            23,  // Level 5 -> 6
            28,  // Level 6 -> 7
            33,  // Level 7 -> 8
            38,  // Level 8 -> 9
            43,  // Level 9 -> 10
            48,  // Level 10 -> 11
            53,  // Level 11 -> 12
            58,  // Level 12 -> 13
            63,  // Level 13 -> 14
            68,  // Level 14 -> 15
            73,  // Level 15 -> 16
            78,  // Level 16 -> 17
            83,  // Level 17 -> 18
            88,  // Level 18 -> 19
            93,  // Level 19 -> 20
            98   // Level 20 (max)
        ],
    },

    // ============ COMBAT SETTINGS ============
    combat: {
        // Flee success chance
        fleeChance: 0.5,
    },

    // ============ ENCOUNTER SETTINGS ============
    encounters: {
        // Encounter chance per step
        encounterRate: 0.08,

        // Minimum steps before encounter
        minStepsBeforeEncounter: 10,

        // Enemy count range per encounter
        minEnemies: 1,
        maxEnemies: 3,
    },
};
