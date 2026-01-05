/**
 * Level System Configuration
 * Defines XP requirements, stat formulas, and progression
 */

export const levelConfig = {
  // Maximum level
  maxLevel: 20,

  // XP required for each level (index 0 = XP for level 2, etc.)
  // Progression: 5, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78, 83, 88, 93, 98
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

  // Skill points granted per level
  skillPointsPerLevel: 4,

  // Base stats
  baseStats: {
    hp: 5,
    damage: 2
  },

  // Stat conversion rates
  statConversion: {
    // Each Vitality point increases max HP by 1
    vitalityToHp: 1,

    // 3 Toughness points = 1 armor (armor reduces damage by 1)
    toughnessToArmor: 3,

    // 2 Strength points = +1 damage
    strengthToDamage: 2
  }
};

/**
 * Calculate XP required for a given level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1 || level > levelConfig.maxLevel) {
    return 0;
  }
  return levelConfig.xpRequirements[level - 2] || 0;
}

/**
 * Calculate total XP required to reach a level
 */
export function getTotalXpForLevel(level: number): number {
  let totalXp = 0;
  for (let i = 1; i < level && i < levelConfig.maxLevel; i++) {
    totalXp += getXpForLevel(i + 1);
  }
  return totalXp;
}

/**
 * Calculate armor from toughness stat
 */
export function calculateArmor(toughness: number): number {
  return Math.floor(toughness / levelConfig.statConversion.toughnessToArmor);
}

/**
 * Calculate damage bonus from strength stat
 */
export function calculateDamageBonus(strength: number): number {
  return Math.floor(strength / levelConfig.statConversion.strengthToDamage);
}

/**
 * Calculate max HP from vitality stat
 */
export function calculateMaxHp(vitality: number): number {
  return levelConfig.baseStats.hp + (vitality * levelConfig.statConversion.vitalityToHp);
}

/**
 * Calculate total damage from strength stat
 */
export function calculateTotalDamage(strength: number): number {
  return levelConfig.baseStats.damage + calculateDamageBonus(strength);
}
