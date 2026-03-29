/**
 * Level System Configuration
 * Defines XP requirements, stat formulas, and progression
 */

import { balanceConfig } from './balance/balanceConfig.js';

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
 * Calculate melee damage bonus from strength and agility stats
 */
export function calculateMeleeDamageBonus(strength: number, agility: number): number {
    const strengthBonus = Math.floor(strength / balanceConfig.stats.strengthToMeleeDamage);
    const agilityBonus = Math.floor(agility / balanceConfig.stats.agilityToMeleeDamage);
    return strengthBonus + agilityBonus;
}

/**
 * Calculate bow damage bonus from strength and agility stats
 */
export function calculateBowDamageBonus(strength: number, agility: number): number {
    const strengthBonus = Math.floor(strength / balanceConfig.stats.strengthToBowDamage);
    const agilityBonus = Math.floor(agility / balanceConfig.stats.agilityToBowDamage);
    return strengthBonus + agilityBonus;
}

/**
 * Calculate agility-based avoid chance with diminishing returns
 */
export function calculateAvoidChance(agility: number): number {
    const scaledAgility = agility * balanceConfig.stats.avoidChanceScale;
    const avoidChance = 1 - (1 / (1 + scaledAgility));
    return Math.min(balanceConfig.stats.avoidChanceCap, avoidChance);
}

/**
 * Calculate max HP from vitality stat
 */
export function calculateMaxHp(vitality: number): number {
    return balanceConfig.player.baseHp + (vitality * balanceConfig.stats.vitalityToHp);
}

/**
 * Calculate max mana from connection and intelligence stats.
 * Connection gives 1 mana each.
 * Intelligence gives 1/3 mana each.
 */
export function calculateMana(connection: number, intelligence: number): number {
    const connectionMana = connection * balanceConfig.stats.connectionToMana;
    const intelligenceMana = intelligence / balanceConfig.stats.intelligenceToManaDivisor;
    return balanceConfig.player.baseMana + Math.floor(connectionMana + intelligenceMana);
}

/**
 * Calculate total melee damage from strength/agility stats
 */
export function calculateTotalMeleeDamage(strength: number, agility: number): number {
    return balanceConfig.player.baseDamage + calculateMeleeDamageBonus(strength, agility);
}

/**
 * Calculate total bow damage from strength/agility stats
 */
export function calculateTotalBowDamage(strength: number, agility: number): number {
    return balanceConfig.player.baseDamage + calculateBowDamageBonus(strength, agility);
}
