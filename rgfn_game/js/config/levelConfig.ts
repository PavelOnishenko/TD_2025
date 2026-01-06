/**
 * Level System Configuration
 * Defines XP requirements, stat formulas, and progression
 */

import { balanceConfig } from './balanceConfig.js';

// Re-export for convenience
export const levelConfig = balanceConfig.leveling;

/**
 * Calculate XP required for a given level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1 || level > balanceConfig.leveling.maxLevel) {
    return 0;
  }
  return balanceConfig.leveling.xpRequirements[level - 2] || 0;
}

/**
 * Calculate total XP required to reach a level
 */
export function getTotalXpForLevel(level: number): number {
  let totalXp = 0;
  for (let i = 1; i < level && i < balanceConfig.leveling.maxLevel; i++) {
    totalXp += getXpForLevel(i + 1);
  }
  return totalXp;
}

/**
 * Calculate armor from toughness stat
 */
export function calculateArmor(toughness: number): number {
  return Math.floor(toughness / balanceConfig.stats.toughnessToArmor);
}

/**
 * Calculate damage bonus from strength stat
 */
export function calculateDamageBonus(strength: number): number {
  return Math.floor(strength / balanceConfig.stats.strengthToDamage);
}

/**
 * Calculate max HP from vitality stat
 */
export function calculateMaxHp(vitality: number): number {
  return balanceConfig.player.baseHp + (vitality * balanceConfig.stats.vitalityToHp);
}

/**
 * Calculate total damage from strength stat
 */
export function calculateTotalDamage(strength: number): number {
  return balanceConfig.player.baseDamage + calculateDamageBonus(strength);
}
