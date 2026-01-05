/**
 * Timing configuration for RGFN game
 * These values control game speed and responsiveness but don't affect balance
 */
import { TimingConfig } from '../types/game.js';

export const timingConfig: TimingConfig = {
    battle: {
        // Delay after player action before processing next turn (ms)
        playerActionDelay: 100,

        // Delay after enemy turn before processing next turn (ms)
        enemyTurnDelay: 100,

        // Delay before enemy executes their action (ms)
        enemyActionStartDelay: 400,

        // Delay after failed flee attempt (ms)
        fleeFailedDelay: 500,

        // Small delay before accepting player input at turn start (ms)
        turnStartInputDelay: 100,

        // Delay before ending battle after defeat (ms)
        defeatEndDelay: 1500,

        // Delay before transitioning to world map after victory (ms)
        victoryEndDelay: 2000,

        // Delay before transitioning after flee success (ms)
        fleeSuccessDelay: 1000,

        // Delay before game over screen (ms)
        gameOverDelay: 2000,
    },
};

export default timingConfig;
