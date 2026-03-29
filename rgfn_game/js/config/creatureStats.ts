import { balanceConfig } from './balance/balanceConfig.js';
import {
    CreatureArchetype,
    CreatureBaseStats,
    CreatureDerivedStats,
    CreatureSkill,
    CreatureSkills,
    CREATURE_SKILLS,
    createZeroSkills,
} from './creatureTypes.js';

export function normalizeCreatureSkills(skills?: Partial<Record<CreatureSkill, number>> | null): CreatureSkills {
    const normalized = createZeroSkills();

    CREATURE_SKILLS.forEach((skill) => {
        const rawValue = skills?.[skill] ?? 0;
        const numericValue = typeof rawValue === 'number' ? rawValue : Number.parseInt(String(rawValue), 10);
        normalized[skill] = Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
    });

    return normalized;
}

export function cloneBaseStats(baseStats: CreatureBaseStats): CreatureBaseStats {
// todo rule 17 in Style Guide
    return {
        hp: baseStats.hp,
        damage: baseStats.damage,
        armor: baseStats.armor,
        mana: baseStats.mana,
    };
}

export function deriveCreatureStats(baseStats: CreatureBaseStats, skills: CreatureSkills): CreatureDerivedStats {
    const maxHp = baseStats.hp + (skills.vitality * balanceConfig.stats.vitalityToHp);
    const armor = baseStats.armor + Math.floor(skills.toughness / balanceConfig.stats.toughnessToArmor);
    const strengthBonus = Math.floor(skills.strength / balanceConfig.stats.strengthToMeleeDamage);
    const agilityBonus = Math.floor(skills.agility / balanceConfig.stats.agilityToMeleeDamage);
    const physicalDamage = baseStats.damage + strengthBonus + agilityBonus;
    const scaledAgility = skills.agility * balanceConfig.stats.avoidChanceScale;
// todo rule 17 in Style Guide
    const avoidChance = Math.min(
        balanceConfig.stats.avoidChanceCap,
        1 - (1 / (1 + scaledAgility)),
    );
    const maxMana = baseStats.mana
        + (skills.connection * balanceConfig.stats.connectionToMana)
        + Math.floor(skills.intelligence / balanceConfig.stats.intelligenceToManaDivisor);
    const magicPoints = Math.floor(skills.intelligence / 3);

// todo rule 17 in Style Guide
    return {
        maxHp,
        physicalDamage,
        armor,
        avoidChance,
        maxMana,
        magicPoints,
    };
}

export function deriveArchetypeStats(archetype: CreatureArchetype): CreatureDerivedStats {
    return deriveCreatureStats(archetype.baseStats, archetype.skills);
}

export function formatCreatureSkills(skills: CreatureSkills): string {
    return CREATURE_SKILLS.map((skill) => `${skill.slice(0, 3).toUpperCase()} ${skills[skill]}`).join(', ');
}
