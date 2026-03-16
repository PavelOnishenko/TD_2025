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
        baseMana: 3,

        // Initial allocated stats at game start
        initialVitality: 0,
        initialToughness: 0,
        initialStrength: 0,
        initialAgility: 0,
        initialConnection: 0,
        initialIntelligence: 0,
        initialSkillPoints: 0,
        initialRandomAllocatedSkillPoints: 5,

        // Visual properties
        width: 32,
        height: 32,

        // Inventory slots available to hold discovered items
        inventorySize: 6,
    },

    // ============ ENEMY STATS ============
    enemies: {
        hpMultiplier: 2,
        skeleton: {
            hp: 3,
            damage: 1,
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
        ninja: {
            hp: 5,
            damage: 3,
            xpValue: 7,
            name: 'Ninja',
            width: 30,
            height: 30,
            behavior: {
                avoidHitChance: 0.5,
            },
        },
        darkKnight: {
            hp: 15,
            damage: 5,
            xpValue: 12,
            name: 'Dark Knight',
            width: 32,
            height: 32,
            behavior: {
                doubleDamageChance: 0.5,
            },
        },
        dragon: {
            hp: 50,
            damage: 10,
            xpValue: 25,
            name: 'Dragon',
            width: 40,
            height: 40,
            behavior: {
                passEncounterChance: 0.5,
            },
        },
    },

    // ============ STAT CONVERSION RATES ============
    stats: {
        // Each Vitality point increases max HP by 1
        vitalityToHp: 1,

        // 3 Toughness points = 1 armor (armor reduces damage by 1)
        toughnessToArmor: 3,

        // 2 Strength points = +1 melee damage
        strengthToMeleeDamage: 2,

        // Strength still helps bows, but less efficiently
        strengthToBowDamage: 4,

        // Agility helps melee a bit
        agilityToMeleeDamage: 4,

        // Agility is the primary bow damage stat
        agilityToBowDamage: 2,

        // Agility-driven evade chance formula tuning
        avoidChanceScale: 0.045,
        avoidChanceCap: 0.45,

        // Magic-related progression
        connectionToMana: 1,
        intelligenceToManaDivisor: 3,
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
        manaPotionRestore: 4,
        // Armor can never fully negate a positive hit
        minDamageAfterArmor: 1,

        // Flee success chance
        fleeChance: 0.3,

        // Unarmed combat defaults
        fistDamagePerHand: 1,

        // Spell targeting ranges (in battle map tiles)
        spellRanges: {
            slow: 4,
        },
    },


    // ============ ITEM BALANCE ============
    items: {
        // IDs map to Item entries in entities/Item.ts
        discoveryPool: [
            { id: 'healingPotion', weight: 4 },
            { id: 'knife_t1', weight: 10 },
            { id: 'knife_t2', weight: 10 },
            { id: 'knife_t3', weight: 10 },
            { id: 'knife_t4', weight: 10 },
            { id: 'shortSword_t1', weight: 9 },
            { id: 'shortSword_t2', weight: 9 },
            { id: 'shortSword_t3', weight: 9 },
            { id: 'shortSword_t4', weight: 9 },
            { id: 'axe_t1', weight: 7 },
            { id: 'axe_t2', weight: 7 },
            { id: 'axe_t3', weight: 7 },
            { id: 'axe_t4', weight: 7 },
            { id: 'twoHandedSword_t1', weight: 5 },
            { id: 'twoHandedSword_t2', weight: 5 },
            { id: 'twoHandedSword_t3', weight: 5 },
            { id: 'twoHandedSword_t4', weight: 5 },
            { id: 'bow', weight: 3 },
            { id: 'bow_t2', weight: 3 },
            { id: 'bow_t3', weight: 3 },
            { id: 'bow_t4', weight: 3 },
            { id: 'crossbow_t1', weight: 2 },
            { id: 'crossbow_t2', weight: 2 },
            { id: 'crossbow_t3', weight: 2 },
            { id: 'crossbow_t4', weight: 2 },
            { id: 'armor_t1', weight: 1 },
            { id: 'armor_t2', weight: 1 },
            { id: 'armor_t3', weight: 1 },
            { id: 'armor_t4', weight: 1 },
        ],
    },

    // ============ ENCOUNTER SETTINGS ============
    encounters: {
        // Encounter chance per step
        encounterRate: 0.4,

        // Encounter chance per step on already discovered (hidden) tiles
        discoveredEncounterRate: 0.2,

        // Enemy count range per encounter
        minEnemies: 1,
        maxEnemies: 3,

        enemyWeights: {
            skeleton: 4,
            zombie: 2,
            ninja: 1,
            darkKnight: 1,
            dragon: 1,
        },

        eventTypeWeights: [
            { type: 'monster', weight: 8 },
            { type: 'item', weight: 2 },
            { type: 'village', weight: 1 },
        ],

        zombieMinGroup: 1,
        zombieMaxGroup: 2,
    },
};
