export const statsBalance = {
    vitalityToHp: 1,
    toughnessToArmor: 3,
    strengthToMeleeDamage: 2,
    strengthToBowDamage: 4,
    agilityToMeleeDamage: 4,
    agilityToBowDamage: 2,
    avoidChanceScale: 0.045,
    avoidChanceCap: 0.45,
    connectionToMana: 1,
    intelligenceToManaDivisor: 3,
};

export const levelingBalance = {
    maxLevel: 20,
    skillPointsPerLevel: 4,
    xpRequirements: [5, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78, 83, 88, 93, 98],
};

export const combatBalance = {
    manaPotionRestore: 4,
    minDamageAfterArmor: 1,
    fleeChance: 0.3,
    fistDamagePerHand: 1,
    adjacentAttackDamagePenalty: 0.6,
    blockDamageReduction: 0.5,
    successfulDodgeDamageMultiplier: 1.5,
    enemyDirectionalActionWeights: { AttackLeft: 2, AttackCenter: 3, AttackRight: 2, Block: 2, DodgeLeft: 1, DodgeRight: 1 },
    spellRanges: { slow: 4 },
};
