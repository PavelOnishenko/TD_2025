export const balanceConfig = {
    player: {
        initialLives: 5,
        initialEnergy: 480,
        towerCost: 120,
        switchCost: 0,
        maxWaves: 40,
        energyPerKill: 8,
        tankKillEnergyMultiplier: 2,
        killEnergyScaling: {
            baseWave: 1,
            baseBonus: 0,
            maxBonus: 1,
            breakpoints: [
                { wave: 10, bonus: 0.03 },
                { wave: 20, bonus: 0.1 },
                { wave: 30, bonus: 0.3 },
            ],
        },
        energyPerWave: 40,
    },
    projectiles: {
        speed: 700,
        baseRadius: 18,
        radiusPerLevel: 5,
        colorMismatchMultiplier: 0.3,
        rockets: {
            explosionRadius: {
                min: 18,
                rangeMultiplier: 0.5,
            },
        },
    },
    towers: {
        baseRange: 140,
        rangePerLevel: 0.2,
        rangeBonusMultiplier: 1.3,
        levels: [
            { damage: 8.3, fireInterval: 500, upgradeCost: 300 },
            { damage: 8, fireInterval: 200, upgradeCost: 600 },
            { damage: 4, fireInterval: 60, upgradeCost: 1200 },
            { damage: 9.5, fireInterval: 120, upgradeCost: 2500 },
            { damage: 60, fireInterval: 1050, upgradeCost: 5000 },
            { damage: 86, fireInterval: 1200 },
        ],
        upgradeUnlockWave: 15,
    },
    enemies: {
        defaultSpawn: { x: -600, y: 600 },
        speedMultiplier: 0.9,
        tank: { hpMultiplier: 35.7, speed: { x: 100, y: 0 }, },
        swarm: { groupSize: 3, hpMultiplier: 10, speed: { x: 200, y: 0 }, },
    },
    waves: {
        difficultyMultiplier: 1,    // todo up this to make waves more epic
        schedule: [
           { difficulty: 13, enemyHp: 1.34 },
            { difficulty: 13, enemyHp: 1.64 },
            { difficulty: 14, enemyHp: 1.94 },
            { difficulty: 14, enemyHp: 2.24 },
            { difficulty: 15, enemyHp: 2.53 }, // 5
            { difficulty: 15, enemyHp: 2.97 },
            { difficulty: 16, enemyHp: 3.20 },
            { difficulty: 16, enemyHp: 3.42 },
            { difficulty: 17, enemyHp: 3.65 },
            { difficulty: 17, enemyHp: 3.87 }, // 10
            { difficulty: 18, enemyHp: 4.10 },
            { difficulty: 18, enemyHp: 4.5 },
            { difficulty: 19, enemyHp: 4.65 },
            { difficulty: 19, enemyHp: 4.85 },
            { difficulty: 20, enemyHp: 5.00 }, // 15
            { difficulty: 20, enemyHp: 5.22 },
            { difficulty: 21, enemyHp: 5 },
            { difficulty: 21, enemyHp: 5.25 },
            { difficulty: 22, enemyHp: 5.45 },
            { difficulty: 22, enemyHp: 5.65 }, // 20
            { difficulty: 25, enemyHp: 6.16 },
            { difficulty: 28, enemyHp: 6.71 },
            { difficulty: 31, enemyHp: 7.32 },
            { difficulty: 34, enemyHp: 7.98 },
            { difficulty: 37, enemyHp: 8.69 }, // 25
            { difficulty: 40, enemyHp: 9.48 },
            { difficulty: 43, enemyHp: 10.33 },
            { difficulty: 46, enemyHp: 11.26 },
            { difficulty: 49, enemyHp: 12.27 },
            { difficulty: 52, enemyHp: 13 }, // 30
            { difficulty: 55, enemyHp: 13.8 },
            { difficulty: 58, enemyHp: 14.6 },
            { difficulty: 61, enemyHp: 15.4 },
            { difficulty: 64, enemyHp: 16.2 },
            { difficulty: 67, enemyHp: 17 }, // 35
            { difficulty: 70, enemyHp: 17.8 },
            { difficulty: 73, enemyHp: 18.6 },
            { difficulty: 76, enemyHp: 19.4 },
            { difficulty: 79, enemyHp: 20.2 },
            { difficulty: 82, enemyHp: 21 }, // 40
        ],
        endless: {
            hpGrowth: 1.09, 
            difficultyIncrement: 3,
        },
        formations: {
            defaults: {
                formationGap: 0.85,
                minimumWeight: 0.02,
            },
            endlessDifficulty: {
                startWave: 41,
                base: 72,
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
