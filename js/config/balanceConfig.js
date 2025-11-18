export const balanceConfig = {
    player: {
        initialLives: 5,
        initialEnergy: 480,
        towerCost: 120,
        switchCost: 0,
        maxWaves: 20,
        energyPerKill: 3,
        tankKillEnergyMultiplier: 2,
        killEnergyScaling: {
            baseWave: 1,
            baseBonus: 0,
            maxBonus: 1,
            breakpoints: [
                { wave: 10, bonus: 0.3 },
                { wave: 20, bonus: 0.6 },
                { wave: 30, bonus: 1 },
            ],
        },
        energyPerWave: 20,
        colorProbability: {
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
        baseRange: 140,
        rangePerLevel: 0.2,
        rangeBonusMultiplier: 1.3,
        baseDamage: 1,
        damagePerLevel: 0.8,
        fireIntervalPerLevel: [500, 200, 60, 120, 1050, 1000],
        damageByLevel: [
            8.333333333333334,
            6,
            2.6,
            6.8,
            30,
            84,
        ],
    },
    enemies: {
        defaultSpawn: { x: -600, y: 600 },
        speedMultiplier: 0.9,
        tank: { hpMultiplier: 35.7, speed: { x: 100, y: 0 }, },
        swarm: { groupSize: 3, spacing: 40, hpMultiplier: 10, speed: { x: 200, y: 0 }, },
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
        formations: {
            defaults: {
                formationGap: 0.85,
                minimumWeight: 0.02,
            },
            waveDifficulty: [
                13, 13, 14, 14, 15,
                15, 16, 16, 17, 17,
                18, 18, 19, 19, 20,
                20, 21, 21, 22, 22,
            ],
            endlessDifficulty: {
                startWave: 21,
                base: 24,
                growth: 2.4,
                max: 160,
            },
            definitions: `
# Solo Scout | difficulty=1 | probability=Math.max(0.6, 1.4 - 0.05 * wave) | minWave=1
swarm @0 y=600 color=red
swarm @0.35 y=650 color=blue
---
# Twin Harass | difficulty=2 | probability=Math.max(0.4, 0.7 + 0.06 * (wave - 1)) | minWave=1
swarm @0 y=560 color=blue
swarm @0.6 y=640 color=red
swarm @1 y=600 color=blue
---
# Triple Column | difficulty=3 | probability=0.9 + 0.05 * (wave - 1) | minWave=2
swarm @0 y=520 color=red
swarm @0.5 y=600 color=blue
swarm @1 y=680 color=red
swarm @1.4 y=560 color=blue
---
# Tank Spearhead | difficulty=3 | probability=Math.max(0.15, 0.15 + 0.05 * Math.max(0, wave - 3)) | minWave=3
tank @0 y=590 color=blue
swarm @0.5 y=540 color=red
swarm @1 y=640 color=blue
swarm @1.4 y=600 color=red
---
# Escort Column | difficulty=4 | probability=Math.max(0.1, 0.1 + 0.05 * Math.max(0, wave - 5)) | minWave=4
swarm @0 y=620 color=red
tank @0.7 y=580 color=blue
swarm @1.4 y=560 color=red
swarm @2.1 y=600 color=blue
swarm @2.7 y=640 color=red
---
# Heavy Vanguard | difficulty=4 | probability=Math.max(0.05, 0.045 * Math.max(0, wave - 7)) | minWave=5
tank @0 y=600 color=red
tank @0.9 y=580 color=blue
swarm @1.6 y=640 color=red
swarm @2.3 y=560 color=blue
swarm @3 y=600 color=red
---
# Swarm Wave | difficulty=5 | probability=0.4 + 0.05 * Math.max(0, wave - 1) | minWave=2
swarm @0 y=500 color=blue
swarm @0.4 y=550 color=red
swarm @0.8 y=600 color=blue
swarm @1.2 y=650 color=red
swarm @1.6 y=700 color=blue
swarm @2 y=580 color=red
---
# Mixed Barrage | difficulty=6 | probability=Math.max(0.02, 0.04 + 0.05 * Math.max(0, wave - 9)) | minWave=6
swarm @0 y=540 color=red
tank @0.6 y=590 color=blue
swarm @1.2 y=640 color=red
tank @1.8 y=610 color=blue
swarm @2.4 y=560 color=red
swarm @3 y=520 color=blue
tank @3.6 y=600 color=red
---
# Offset Sweep | difficulty=4 | probability=Math.max(0.25, 0.35 + 0.03 * Math.max(0, wave - 2)) | minWave=3
swarm @0 y=520 color=red
swarm @0.35 y=600 color=blue
swarm @0.7 y=680 color=red
swarm @1.05 y=740 color=blue
---
# Staggered Flood | difficulty=5 | probability=Math.max(0.18, 0.28 + 0.04 * Math.max(0, wave - 4)) | minWave=4
swarm @0 y=520 color=blue
swarm @0.2 y=560 color=red
swarm @0.4 y=600 color=blue
swarm @0.6 y=640 color=red
swarm @0.8 y=680 color=blue
swarm @1 y=720 color=red
---
# Tank Phalanx | difficulty=6 | probability=Math.max(0.08, 0.02 * Math.max(0, wave - 5)) | minWave=6
tank @0 y=600 color=red
swarm @0.5 y=560 color=blue
tank @1 y=620 color=blue
swarm @1.5 y=580 color=red
tank @2 y=640 color=red
---
# Spiral Crush | difficulty=7 | probability=Math.max(0.05, 0.02 * Math.max(0, wave - 7)) | minWave=7
swarm @0 y=520 color=red
swarm @0.3 y=560 color=blue
swarm @0.6 y=600 color=red
swarm @0.9 y=640 color=blue
swarm @1.2 y=680 color=red
swarm @1.5 y=720 color=blue
swarm @1.8 y=760 color=red
---
# Warfront Saturation | difficulty=9 | probability=Math.max(0.04, 0.01 * Math.max(0, wave - 9)) | minWave=9
swarm @0 y=520 color=red
swarm @0.15 y=560 color=blue
tank @0.3 y=600 color=red
swarm @0.45 y=640 color=blue
swarm @0.6 y=680 color=red
tank @0.75 y=620 color=blue
swarm @0.9 y=660 color=red
swarm @1.05 y=700 color=blue
swarm @1.2 y=740 color=red
tank @1.35 y=760 color=red
`,
        },
    },
    scoring: {
        perKill: 10,
        waveClear: 150,
        baseHitPenalty: 25,
    },
};

export default balanceConfig;
