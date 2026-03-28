/**
 * Balance Configuration
 * Centralized location for all game balance parameters
 */

import { CreatureArchetype } from './creatureTypes.js';

const creatureArchetypes: Record<string, CreatureArchetype> = {
    human: {
        id: 'human',
        name: 'Human',
        category: 'character',
        description: 'Baseline humans begin with balanced bodies and grow entirely through learned skills.',
        baseStats: { hp: 5, damage: 2, armor: 0, mana: 3 },
        skills: { vitality: 0, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 },
        loreTags: ['villagers', 'travelers', 'heroes'],
        notes: ['Humans use the same six-skill system as the player character.'],
    },
    skeleton: {
        id: 'skeleton',
        name: 'Skeleton',
        category: 'monster',
        description: 'Animated bones with no magic reserves and only a hint of martial training.',
        baseStats: { hp: 3, damage: 1, armor: 0, mana: 0 },
        skills: { vitality: 0, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 },
        notes: ['No skill investment means the skeleton fights with its natural base profile only.'],
    },
    zombie: {
        id: 'zombie',
        name: 'Zombie',
        category: 'monster',
        description: 'Rotting corpses with extra staying power from raw vitality.',
        baseStats: { hp: 5, damage: 1, armor: 0, mana: 0 },
        skills: { vitality: 2, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 },
    },
    ninja: {
        id: 'ninja',
        name: 'Ninja',
        category: 'mutant',
        description: 'Fast mutant assassins that convert agility and strength into higher burst damage.',
        baseStats: { hp: 4, damage: 2, armor: 0, mana: 0 },
        skills: { vitality: 1, toughness: 0, strength: 2, agility: 2, connection: 0, intelligence: 0 },
        notes: ['Their encounter behavior still grants an additional separate dodge-like avoid-hit chance.'],
    },
    darkKnight: {
        id: 'darkKnight',
        name: 'Dark Knight',
        category: 'mutant',
        description: 'Heavily trained mutant champions with layered toughness and strength.',
        baseStats: { hp: 10, damage: 3, armor: 0, mana: 0 },
        skills: { vitality: 5, toughness: 6, strength: 4, agility: 0, connection: 0, intelligence: 0 },
        notes: ['Their encounter behavior still allows occasional double-damage strikes.'],
    },
    dragon: {
        id: 'dragon',
        name: 'Dragon',
        category: 'mutant',
        description: 'Ancient mutant beasts with immense vitality, dense scales, and crushing strength.',
        baseStats: { hp: 30, damage: 8, armor: 0, mana: 0 },
        skills: { vitality: 20, toughness: 9, strength: 4, agility: 2, connection: 0, intelligence: 0 },
        notes: ['Dragons sometimes ignore an encounter entirely before combat begins.'],
    },
};

export const balanceConfig = {
    // Global multiplier that scales all automatic village creation systems.
    // 1 = baseline density, 0.333... = roughly 3x fewer initially generated villages.
    villageCreationRateMultiplier: 1 / 3,
    questUi: {
        // Time a quest feedback message stays visible (milliseconds)
        feedbackMessageDurationMs: 5000,
    },
    questNameGeneration: {
        // Maximum number of words allowed per generated name for each quest text domain.
        maxWordsByDomain: {
            location: 4,
            artifact: 4,
            character: 4,
            monster: 4,
            mainQuest: 4,
        },
        // Weighted probability distribution for name lengths.
        // Goal: 1-2 words dominate, 3 words uncommon, 4 words extremely rare.
        wordLengthWeightsByDomain: {
            location: {
                1: 52,
                2: 40,
                3: 7,
                4: 1,
            },
            artifact: {
                1: 50,
                2: 42,
                3: 7,
                4: 1,
            },
            character: {
                1: 58,
                2: 36,
                3: 5,
                4: 1,
            },
            monster: {
                1: 54,
                2: 38,
                3: 7,
                4: 1,
            },
            mainQuest: {
                1: 48,
                2: 42,
                3: 9,
                4: 1,
            },
        },
    },

    worldMap: {
        dimensions: {
            columns: 100,
            rows: 100,
        },
        villages: {
            minCount: 6,
            densityPerCell: 0.012,
        },
        visibilityRadius: 3,
        terrainWeights: {
            grass: 0.32,
            forest: 0.48,
            mountain: 0.1,
            water: 0.07,
            desert: 0.03,
        },
        forestCoverage: {
            min: 0.3,
            max: 0.6,
        },
        mountainThreshold: 0.86,
        inlandWaterThreshold: 0.79,
        desertHeatThreshold: 0.68,
        desertDrynessThreshold: 0.58,
        lakes: {
            count: 7,
            minRadius: 2,
            maxRadius: 5,
            jitter: 0.38,
        },
        rivers: {
            count: 5,
            maxLengthFactor: 0.72,
            turnRate: 0.34,
            width: 1,
        },
    },
    survival: {
        // Approximate awake period used to estimate "comfortable" daily travel.
        awakeHoursPerDay: 16,
        // Approximate sleep needed after a heavy travel day.
        requiredSleepHours: 8,
        // Global fatigue resource for travel/sleep loops.
        maxFatigue: 100,
        // Fatigue state thresholds shown in HUD and used by systems.
        cautionFatigueThreshold: 60,
        highFatigueThreshold: 80,
        // Recovery while sleeping in a safe village room.
        villageSleepFatigueRecovery: 90,
        // Recovery while sleeping in the wilderness.
        wildSleepFatigueRecovery: 65,
        // Wilderness sleep risk profile.
        wildSleepAmbushChance: 0.35,
        wildSleepAmbushHpLoss: 2,
        wildSleepAmbushManaLoss: 2,
        // Typical inn room cost.
        innRoomCostGold: 6,
    },

    // ============ PLAYER STATS ============
    player: {
        // Base stats (without any stat points allocated)
        baseHp: creatureArchetypes.human.baseStats.hp,
        baseDamage: creatureArchetypes.human.baseStats.damage,
        baseArmor: creatureArchetypes.human.baseStats.armor,
        baseMana: creatureArchetypes.human.baseStats.mana,

        // Initial allocated stats at game start
        initialVitality: 0,
        initialToughness: 0,
        initialStrength: 0,
        initialAgility: 0,
        initialConnection: 0,
        initialIntelligence: 0,
        initialSkillPoints: 500,
        initialRandomAllocatedSkillPoints: 5,

        // Visual properties
        width: 32,
        height: 32,

        // Inventory slots: base + 1 additional slot per configured strength interval
        baseInventorySlots: 4,
        strengthPerInventorySlot: 4,
    },

    // ============ ENEMY STATS ============
    enemies: {
        hpMultiplier: 2,
        skeleton: {
            archetypeId: 'skeleton',
            hp: 3,
            damage: 1,
            xpValue: 3,
            name: 'Skeleton',
            width: 30,
            height: 30,
        },
        zombie: {
            archetypeId: 'zombie',
            hp: 7,
            damage: 1,
            xpValue: 5,
            name: 'Zombie',
            width: 30,
            height: 30,
        },
        ninja: {
            archetypeId: 'ninja',
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
            archetypeId: 'darkKnight',
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
            archetypeId: 'dragon',
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

        // Directional melee combat
        adjacentAttackDamagePenalty: 0.6,
        blockDamageReduction: 0.5,
        successfulDodgeDamageMultiplier: 1.5,
        enemyDirectionalActionWeights: {
            AttackLeft: 2,
            AttackCenter: 3,
            AttackRight: 2,
            Block: 2,
            DodgeLeft: 1,
            DodgeRight: 1,
        },

        // Spell targeting ranges (in battle map tiles)
        spellRanges: {
            slow: 4,
        },
    },


    // ============ ITEM BALANCE ============
    items: {
        // Chance for non-human enemies to drop one random discoverable item on death
        monsterDropChance: 0.35,

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

    creatureArchetypes,

    // ============ ENCOUNTER SETTINGS ============
    encounters: {
        // Encounter chance per step
        encounterRate: 0.1,

        // Encounter chance per step on already discovered (hidden) tiles
        discoveredEncounterRate: 0.05,

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
            { type: 'monster', weight: 40 },
            { type: 'item', weight: 10 },
            { type: 'traveler', weight: 10 },
        ],

        zombieMinGroup: 1,
        zombieMaxGroup: 2,
    },
};
