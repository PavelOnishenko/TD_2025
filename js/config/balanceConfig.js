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
        difficultyMultiplier: 1,
        schedule: [
           { difficulty: 1, enemyHp: 1.34 },   // Wave 1: 1 enemy
            { difficulty: 2, enemyHp: 1.64 },   // Wave 2: 2 enemies
            { difficulty: 3, enemyHp: 1.94 },   // Wave 3: 3 enemies
            { difficulty: 4, enemyHp: 2.24 },   // Wave 4: 4 enemies
            { difficulty: 5, enemyHp: 2.53 },   // Wave 5: 5 enemies
            { difficulty: 6, enemyHp: 2.97 },   // Wave 6: 6 enemies
            { difficulty: 6, enemyHp: 3.20 },
            { difficulty: 6, enemyHp: 3.42 },
            { difficulty: 6, enemyHp: 3.65 },
            { difficulty: 6, enemyHp: 3.87 },   // Wave 10
            { difficulty: 6, enemyHp: 4.10 },
            { difficulty: 6, enemyHp: 4.5 },
            { difficulty: 6, enemyHp: 4.65 },
            { difficulty: 6, enemyHp: 4.85 },
            { difficulty: 6, enemyHp: 5.00 },   // Wave 15
            { difficulty: 6, enemyHp: 5.22 },
            { difficulty: 6, enemyHp: 5 },
            { difficulty: 6, enemyHp: 5.25 },
            { difficulty: 6, enemyHp: 5.45 },
            { difficulty: 6, enemyHp: 5.65 },   // Wave 20
            { difficulty: 6, enemyHp: 6.16 },
            { difficulty: 6, enemyHp: 6.71 },
            { difficulty: 6, enemyHp: 7.32 },
            { difficulty: 6, enemyHp: 7.98 },
            { difficulty: 6, enemyHp: 8.69 },   // Wave 25
            { difficulty: 6, enemyHp: 9.48 },
            { difficulty: 6, enemyHp: 10.33 },
            { difficulty: 6, enemyHp: 11.26 },
            { difficulty: 6, enemyHp: 12.27 },
            { difficulty: 6, enemyHp: 13 },     // Wave 30
            { difficulty: 6, enemyHp: 13.8 },
            { difficulty: 6, enemyHp: 14.6 },
            { difficulty: 6, enemyHp: 15.4 },
            { difficulty: 6, enemyHp: 16.2 },
            { difficulty: 6, enemyHp: 17 },     // Wave 35
            { difficulty: 6, enemyHp: 17.8 },
            { difficulty: 6, enemyHp: 18.6 },
            { difficulty: 6, enemyHp: 19.4 },
            { difficulty: 6, enemyHp: 20.2 },
            { difficulty: 6, enemyHp: 21 },     // Wave 40
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
                base: 6,
                growth: 0,
                max: 6,
            },
            definitions: `
# Single Enemy | difficulty=1 | probability=1.5 | minWave=1
swarm @0 y=600 color=red
---
# Dual Strike | difficulty=2 | probability=1.2 | minWave=1
swarm @0 y=560 color=blue
swarm @0.6 y=640 color=red
---
# Triple Column | difficulty=3 | probability=1.0 | minWave=2
swarm @0 y=520 color=red
swarm @0.5 y=600 color=blue
swarm @1 y=680 color=red
---
# Quad Formation | difficulty=4 | probability=0.9 | minWave=3
swarm @0 y=540 color=blue
swarm @0.4 y=600 color=red
swarm @0.8 y=660 color=blue
swarm @1.2 y=720 color=red
---
# Five Pack | difficulty=5 | probability=0.8 | minWave=4
swarm @0 y=520 color=red
swarm @0.35 y=580 color=blue
swarm @0.7 y=640 color=red
swarm @1.05 y=700 color=blue
swarm @1.4 y=760 color=red
---
# Max Squad | difficulty=6 | probability=0.7 | minWave=5
swarm @0 y=500 color=blue
swarm @0.3 y=560 color=red
swarm @0.6 y=620 color=blue
swarm @0.9 y=680 color=red
swarm @1.2 y=740 color=blue
swarm @1.5 y=800 color=red
---
# Tank Solo | difficulty=2 | probability=0.4 | minWave=3
tank @0 y=600 color=blue
---
# Tank with Escort | difficulty=3 | probability=0.5 | minWave=4
tank @0 y=600 color=blue
swarm @0.6 y=560 color=red
---
# Tank Duo | difficulty=4 | probability=0.4 | minWave=5
tank @0 y=580 color=red
tank @0.9 y=640 color=blue
---
# Mixed Assault | difficulty=5 | probability=0.5 | minWave=6
tank @0 y=590 color=blue
swarm @0.5 y=540 color=red
swarm @1 y=640 color=blue
swarm @1.5 y=700 color=red
---
# Heavy Strike | difficulty=6 | probability=0.6 | minWave=7
tank @0 y=580 color=red
swarm @0.5 y=540 color=blue
swarm @1 y=620 color=red
tank @1.6 y=660 color=blue
swarm @2.2 y=700 color=red
---
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
