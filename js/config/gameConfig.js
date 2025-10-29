export const gameConfig = {
    world: {
        logicalSize: { width: 540, height: 960 },
        base: { x: 1100, width: 160, height: 160, bottomOffset: 470 },
        screenShake: { frequency: 42 },
        bounds: { minMargin: 40, projectileRadiusFactor: 2 },
        grid: {
            cellSize: { w: 120, h: 160 },
            topOrigin: { x: -300, y: 400 },
            bottomOrigin: { x: -210, y: 680 },
            topOffsets: [
                { x: 0, y: 0 },
                { x: 210, y: 30 },
                { x: 420, y: 50 },
                { x: 600, y: 52 },
                { x: 750, y: 40 },
                { x: 910, y: 18 },
            ],
            bottomOffsets: [
                { x: 0, y: 0 },
                { x: 190, y: -35 },
                { x: 380, y: -45 },
                { x: 600, y: -45 },
                { x: 750, y: -25 },
                { x: 910, y: 0 },
            ],
        },
        platforms: [
            { xFactor: 0.4, yFactor: 0.55, scale: 1.2 },
            { xFactor: 0.6, yFactor: 0.85, scale: 1.2 },
        ],
    },
    player: {
        initialLives: 5,
        initialEnergy: 50,
        towerCost: 12,
        switchCost: 4,
        maxWaves: 50,
        energyPerKill: 1,
        energyPerWave: 3,
        colorProbability: {
            // todo remove start and end, they are re-initialized with random numbers 
            // at the beginning of each wave
            start: 0.5,
            end: 0.5,
            minDifference: 0.35,
        },
    },
    projectiles: {
        speed: 700,
        baseRadius: 18,
        spawnInterval: 60,
        radiusPerLevel: 5,
        colorMismatchMultiplier: 0.3,
    },
    towers: {
        width: 70,
        height: 105,
        baseRange: 140,
        rangePerLevel: 0.2,
        rangeBonusMultiplier: 1.3,
        baseDamage: 1,
        damagePerLevel: 0.8,
        flashDuration: 0.12,
        placementFlashDuration: 1.35,
        mergePulseDuration: 0.45, // todo what does this influence?
        mergePulseWaveDuration: 0.6, // todo what does this influence?
        errorPulseDuration: 0.45, // todo what does this influence?
        glowSpeeds: [1.8, 2.1, 2.4],
        removalHoldDuration: 2,
        removalIndicatorDecay: 3.2,
    },
    enemies: {
        defaultSpawn: { x: -600, y: 600 },
        dimensions: { width: 80, height: 80 },
        tank: { hpMultiplier: 50, speed: { x: 100, y: 0 }, },
        // todo hpFactor and hpMultiplier should be the same thing
        swarm: { groupSize: 3, spacing: 40, hpFactor: 5, speed: { x: 200, y: 0 }, },
    },
    waves: {
        schedule: [
             { interval: 0.67, cycles: 13, tanksCount: 0 },
            { interval: 0.677, cycles: 14, tanksCount: 0 },
            { interval: 0.684, cycles: 15, tanksCount: 1 },
            { interval: 0.691, cycles: 16, tanksCount: 1 },
            { interval: 0.698, cycles: 17, tanksCount: 2 }, // 5
            { interval: 0.706, cycles: 17, tanksCount: 2 },
            { interval: 0.713, cycles: 18, tanksCount: 3 },
            { interval: 0.721, cycles: 19, tanksCount: 3 },
            { interval: 0.729, cycles: 20, tanksCount: 3 },
            { interval: 0.737, cycles: 21, tanksCount: 3 }, // 10
            { interval: 0.745, cycles: 22, tanksCount: 4 },
            { interval: 0.754, cycles: 22, tanksCount: 4 },
            { interval: 0.763, cycles: 23, tanksCount: 4 },
            { interval: 0.772, cycles: 24, tanksCount: 4 },
            { interval: 0.781, cycles: 25, tanksCount: 5 }, // 15
            { interval: 0.790, cycles: 26, tanksCount: 5 },
            { interval: 0.800, cycles: 26, tanksCount: 5 },
            { interval: 0.809, cycles: 27, tanksCount: 5 },
            { interval: 0.819, cycles: 28, tanksCount: 6 },
            { interval: 0.830, cycles: 29, tanksCount: 6 }, // 20
            { interval: 0.840, cycles: 30, tanksCount: 6 },
            { interval: 0.851, cycles: 30, tanksCount: 6 },
            { interval: 0.862, cycles: 31, tanksCount: 7 },
            { interval: 0.873, cycles: 32, tanksCount: 7 },
            { interval: 0.885, cycles: 33, tanksCount: 7 }, // 25
            { interval: 0.897, cycles: 34, tanksCount: 8 },
            { interval: 0.909, cycles: 35, tanksCount: 8 },
            { interval: 0.922, cycles: 35, tanksCount: 8 },
            { interval: 0.935, cycles: 36, tanksCount: 8 },
            { interval: 0.949, cycles: 37, tanksCount: 9 }, // 30
            { interval: 0.962, cycles: 38, tanksCount: 9 },
            { interval: 0.977, cycles: 39, tanksCount: 9 },
            { interval: 0.991, cycles: 39, tanksCount: 9 },
            { interval: 1.006, cycles: 40, tanksCount: 10 },
            { interval: 1.022, cycles: 41, tanksCount: 10 }, // 35
            { interval: 1.038, cycles: 42, tanksCount: 10 },
            { interval: 1.054, cycles: 43, tanksCount: 10 },
            { interval: 1.072, cycles: 43, tanksCount: 11 },
            { interval: 1.089, cycles: 44, tanksCount: 11 },
            { interval: 1.107, cycles: 45, tanksCount: 11 }, // 40
            { interval: 1.126, cycles: 46, tanksCount: 12 },
            { interval: 1.146, cycles: 47, tanksCount: 12 },
            { interval: 1.166, cycles: 48, tanksCount: 12 },
            { interval: 1.187, cycles: 48, tanksCount: 13 },
            { interval: 1.209, cycles: 49, tanksCount: 13 }, // 45
            { interval: 1.231, cycles: 50, tanksCount: 23 },
            { interval: 1.254, cycles: 51, tanksCount: 24 },
            { interval: 1.279, cycles: 52, tanksCount: 24 },
            { interval: 1.304, cycles: 52, tanksCount: 24 },
            { interval: 1.33,  cycles: 53, tanksCount: 24 } // 50
        ],
        enemyHpByWave: [ 1.34, 1.64, 1.94, 2.24, 2.53, 2.83, 3.13, 3.43, 3.73, 4.03,
            4.32, 4.62, 4.92, 5.22, 5.52, 5.82, 6.11, 6.41, 6.71, 7.01,
            7.31, 7.61, 7.90, 8.20, 8.50, 8.80, 9.10, 9.40, 9.69, 9.99,
            10.29, 10.59, 10.89, 11.19, 11.48, 11.78, 12.08, 12.38, 12.68, 12.98,
            13.27, 13.57, 13.87, 14.17, 14.47, 14.77, 15.06, 15.36, 15.66, 15.96],
        endless: {
            hpGrowth: 1.2,
            intervalFactor: 0.94,
            minInterval: 0.45,
            cyclesIncrement: 4,
            tanksIncrement: 2,
        },
    },
    scoring: {
        perKill: 10,
        waveClear: 150,
        baseHitPenalty: 25,
    },
    ads: {
        waveCadence: 5,
    },
};

export default gameConfig;
