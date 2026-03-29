/**
 * Balance Configuration
 * Centralized location for all game balance parameters.
 */

import { creatureArchetypes } from './creatureArchetypes.js';
import { worldMapBalance } from './worldMapBalance.js';
import { playerBalance, enemyBalance } from './playerEnemyBalance.js';
import { statsBalance, levelingBalance, combatBalance } from './progressionBalance.js';
import { itemBalance, encounterBalance } from './itemsEncountersBalance.js';

export const balanceConfig = {
    worldMap: worldMapBalance,
    survival: {
        awakeHoursPerDay: 16,
        requiredSleepHours: 8,
        maxFatigue: 100,
        cautionFatigueThreshold: 60,
        highFatigueThreshold: 80,
        villageSleepFatigueRecovery: 90,
        wildSleepFatigueRecovery: 65,
        wildSleepAmbushChance: 0.35,
        wildSleepAmbushHpLoss: 2,
        wildSleepAmbushManaLoss: 2,
        innRoomCostGold: 6,
    },
    player: playerBalance,
    enemies: enemyBalance,
    stats: statsBalance,
    leveling: levelingBalance,
    combat: combatBalance,
    items: itemBalance,
    creatureArchetypes,
    encounters: encounterBalance,
};
