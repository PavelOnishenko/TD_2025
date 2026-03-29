/**
 * Balance Configuration
 * Centralized location for all game balance parameters.
 */

import { creatureArchetypes } from './balance/creatureArchetypes.js';
import { worldMapBalance } from './balance/worldMapBalance.js';
import { playerBalance, enemyBalance } from './balance/playerEnemyBalance.js';
import { statsBalance, levelingBalance, combatBalance } from './balance/progressionBalance.js';
import { itemBalance, encounterBalance } from './balance/itemsEncountersBalance.js';

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
