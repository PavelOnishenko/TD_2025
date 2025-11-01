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
        maxWaves: 20,
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
            { interval: 0.673, cycles: 13, tanksCount: 0 },
            { interval: 0.676, cycles: 14, tanksCount: 0 },
            { interval: 0.679, cycles: 14, tanksCount: 0 },
            { interval: 0.682, cycles: 15, tanksCount: 1 }, // 5
            { interval: 0.685, cycles: 15, tanksCount: 1 },
            { interval: 0.688, cycles: 16, tanksCount: 1 },
            { interval: 0.691, cycles: 16, tanksCount: 1 },
            { interval: 0.694, cycles: 17, tanksCount: 2 },
            { interval: 0.697, cycles: 17, tanksCount: 2 }, // 10
            { interval: 0.700, cycles: 18, tanksCount: 2 },
            { interval: 0.703, cycles: 18, tanksCount: 2 },
            { interval: 0.706, cycles: 19, tanksCount: 3 },
            { interval: 0.709, cycles: 19, tanksCount: 3 },
            { interval: 0.712, cycles: 20, tanksCount: 3 }, // 15
            { interval: 0.715, cycles: 20, tanksCount: 3 },
            { interval: 0.718, cycles: 21, tanksCount: 3 },
            { interval: 0.721, cycles: 21, tanksCount: 3 },
            { interval: 0.724, cycles: 22, tanksCount: 4 },
            { interval: 0.727, cycles: 22, tanksCount: 4 }, // 20
        ],
        enemyHpByWave: [ 
            1.34, 1.64, 1.94, 2.24, 2.53, 2.83, 3.13, 3.43, 3.73, 4.03,
            4.32, 4.62, 4.92, 5.02, 5.12, 5.22, 5.35, 5.55, 5.75, 6, 
        ],
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
