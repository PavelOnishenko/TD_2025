import { balanceConfig } from './balanceConfig.js';

const hasAcknowledged = (context, id) => Boolean(context?.acknowledgedSteps?.has?.(id));
const hasMerges = (context) => Number(context?.merges ?? 0) > 0;
const hasRemovals = (context) => Number(context?.removals ?? 0) > 0;
const hasEnergyGain = (context) => Number(context?.energyGained ?? 0) > 0;
const hasEnergyGainFromGame = (game) => Number.isFinite(game?.energy)
    && Number.isFinite(game?.initialEnergy)
    && game.energy > game.initialEnergy;
const hasScoreProgress = (game, context) => {
    const scoreFromContext = Number(context?.scoreTotal ?? 0);
    const gained = Number(context?.scoreGained ?? 0);
    const score = Number.isFinite(game?.score) ? Math.max(0, Math.floor(game.score)) : 0;
    const best = Number.isFinite(game?.bestScore) ? Math.max(0, Math.floor(game.bestScore)) : 0;
    return scoreFromContext > 0 || gained > 0 || score > 0 || best > 0;
};
const hasMergeableTowers = (game) => {
    if (!game?.grid) {
        return false;
    }

    const rows = [game.grid.topCells, game.grid.bottomCells];

    for (const row of rows) {
        if (!Array.isArray(row)) continue;

        for (let i = 0; i < row.length - 1; i++) {
            const cellA = row[i];
            const cellB = row[i + 1];

            if (!cellA?.occupied || !cellB?.occupied) continue;

            const towerA = game.getTowerAt?.(cellA);
            const towerB = game.getTowerAt?.(cellB);

            if (game.canMergeTowers?.(towerA, towerB)) {
                return true;
            }
        }
    }

    return false;
};

const nonBalanceConfig = {
    world: {
        logicalSize: { width: 540, height: 960 },
        base: { x: 1100, width: 160, height: 160, bottomOffset: 470 },
        screenShake: {
            frequency: 42,
            rocket: { intensity: 6, duration: 0.5, frequency: 46 },
            railgun: { intensity: 5, duration: 0.28, frequency: 52 },
        },
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
        portal: {
            offset: { x: 0, y: 0 },
            radius: { x: 130, y: 270 },
            rotation: -0.18,
            pulseDuration: 1.05,
            maxPulseScale: 1.55,
            tailLength: 380,
            tailWidth: 220,
            spawnParticleCount: 22,
            idleWispCount: 7,
            particleLife: 0.95,
            particleSpeedRange: { min: 280, max: 560 },
            maxParticles: 150,
        },
    },
    towers: {
        width: 70,
        height: 105,
        flashDuration: 0.12,
        placementFlashDuration: 1.35,
        mergePulseWaveDuration: 5,
        errorPulseDuration: 0.45,
        glowSpeeds: [1.8, 2.1, 2.4],
        removalHoldDuration: 2,
        removalIndicatorDecay: 3.2,
        upgradeCostText: {
            fontSize: 22,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            colorAffordable: '#00ff00',
            colorUnaffordable: '#ff6666',
            backgroundAlpha: 0.6,
            padding: 4,
            offsetY: -20,
        },
        levelIndicator: {
            fontSize: 16,
            offsetX: 0,
            offsetY: 4,
            padding: 4,
            backgroundAlpha: 0.85,
            styles: {
                1: {
                    textColor: 'rgba(200, 200, 200, 0.9)',
                    textGlow: 'rgba(150, 150, 150, 0.3)',
                    textGlowSize: 2,
                    borderColor: 'rgba(120, 120, 120, 0.6)',
                    glowColor: 'rgba(150, 150, 150, 0.2)',
                    glowIntensity: 0.1,
                },
                2: {
                    textColor: 'rgba(180, 220, 255, 0.95)',
                    textGlow: 'rgba(120, 180, 255, 0.5)',
                    textGlowSize: 4,
                    borderColor: 'rgba(120, 180, 255, 0.7)',
                    glowColor: 'rgba(120, 180, 255, 0.4)',
                    glowIntensity: 0.3,
                },
                3: {
                    textColor: 'rgba(160, 230, 255, 1)',
                    textGlow: 'rgba(100, 200, 255, 0.7)',
                    textGlowSize: 6,
                    borderColor: 'rgba(100, 200, 255, 0.8)',
                    glowColor: 'rgba(100, 200, 255, 0.5)',
                    glowIntensity: 0.5,
                },
                4: {
                    textColor: 'rgba(86, 100, 255, 1)',
                    textGlow: 'rgba(191, 180, 255, 0.8)',
                    textGlowSize: 8,
                    borderColor: 'rgba(13, 0, 112, 0.9)',
                    glowColor: 'rgba(53, 60, 255, 0.6)',
                    glowIntensity: 0.7,
                },
                5: {
                    textColor: 'rgba(91, 246, 138, 1)',
                    textGlow: 'rgba(177, 255, 179, 0.9)',
                    textGlowSize: 10,
                    borderColor: 'rgba(0, 56, 12, 1)',
                    glowColor: 'rgba(0, 225, 45, 0.7)',
                    glowIntensity: 0.85,
                },
                6: {
                    textColor: 'rgba(246, 114, 255, 1)',
                    textGlow: 'rgba(255, 169, 248, 1)',
                    textGlowSize: 12,
                    borderColor: 'rgba(42, 0, 40, 1)',
                    glowColor: 'rgba(127, 0, 104, 0.8)',
                    glowIntensity: 1,
                },
            },
        },
    },
    projectiles: {
        minLifetimeLevel3: 0.03,
        rocket: {
            shockwaveEnabled: false,
        },
    },
    enemies: {
        dimensions: { width: 80, height: 80 },
    },
    tutorial: {
        steps: [
            {
                id: 'story-intro',
                name: 'Neon Empire Briefing',
                nameKey: 'tutorial.storyIntro.title',
                wave: 1,
                highlightTargets: [],
                text: 'A portal ripped open beside the gateway to the Neon Empire capital world. Deploy living crystal defences and stop the alien scouts before they pour through.',
                textKey: 'tutorial.storyIntro.text',
                picture: 'assets/swarm_B.png',
                sound: 'assets/portal_spawn.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'story-intro');
                },
            },
            {
                id: 'build-tower',
                name: 'Deploy Your First Tower',
                nameKey: 'tutorial.buildTower.title',
                wave: 1,
                highlightTargets: [],
                text: 'Click on a glowing platform to build your first tower. Each tower costs 120 energy harvested from our living crystals.',
                textKey: 'tutorial.buildTower.text',
                picture: 'assets/tower_1B.png',
                sound: 'assets/placement.mp3',
                checkComplete(game) {
                    return Array.isArray(game?.towers) && game.towers.length > 0;
                },
            },
            {
                id: 'build-four-towers',
                name: 'Build Four Defenders',
                nameKey: 'tutorial.buildFourTowers.title',
                wave: 1,
                highlightTargets: [],
                text: 'Build 4 towers to create a solid defensive line before the first wave arrives. Position them strategically to cover both lanes.',
                textKey: 'tutorial.buildFourTowers.text',
                picture: 'assets/tower_1B.png',
                sound: 'assets/placement.mp3',
                checkComplete(game) {
                    return Array.isArray(game?.towers) && game.towers.length >= 4;
                },
            },
            {
                id: 'switch-color',
                name: 'Match Enemy Colors',
                nameKey: 'tutorial.switchColor.title',
                wave: 1,
                highlightTargets: [],
                text: 'Select a tower to toggle its color. Matching enemies take full damage while mismatched shots only hit with 30% power.',
                textKey: 'tutorial.switchColor.text',
                picture: 'assets/tower_1R.png',
                sound: 'assets/color_switch.mp3',
                checkComplete(game, context) {
                    if ((context?.colorSwitches ?? 0) > 0) {
                        return true;
                    }
                    const towers = Array.isArray(game?.towers) ? game.towers : [];
                    if (towers.length > 0) {
                        const uniqueColors = new Set(towers.map(tower => tower?.color ?? ''));
                        if (uniqueColors.size > 1) {
                            return true;
                        }
                    }
                    return Boolean(game?.waveInProgress)
                        || (typeof game?.wave === 'number' && game.wave > 1)
                        || ((game?.spawned ?? 0) > 0);
                },
            },
            {
                id: 'start-wave',
                name: 'Begin the Assault',
                nameKey: 'tutorial.startWave.title',
                wave: 1,
                highlightTargets: ['nextWaveButton'],
                text: 'Press "Next Wave" when you are ready. Destroy all ships to protect the base!',
                textKey: 'tutorial.startWave.text',
                picture: 'assets/swarm_R.png',
                sound: 'assets/merge.mp3',
                checkComplete(game, context) {
                    if ((context?.wavesStarted ?? 0) > 0) {
                        return true;
                    }
                    return Boolean(game?.waveInProgress) || ((game?.spawned ?? 0) > 0);
                },
            },
            {
                id: 'energy-economy',
                name: 'Harvest More Energy',
                nameKey: 'tutorial.energyEconomy.title',
                wave: 2,
                highlightTargets: ['energyPanel'],
                text: 'Every destroyed ship and completed wave feeds more energy into your reserves. Watch the meter to afford new towers and color switches.',
                textKey: 'tutorial.energyEconomy.text',
                picture: 'assets/energy_sign.png',
                sound: 'assets/placement.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'energy-economy');
                },
            },
            {
                id: 'prepare-merge',
                name: 'Prepare for Merge',
                nameKey: 'tutorial.prepareMerge.title',
                wave: 2,
                highlightTargets: [],
                text: 'Build two adjacent towers of the same color and level. When they\'re ready, you\'ll be able to merge them!',
                textKey: 'tutorial.prepareMerge.text',
                picture: 'assets/tower_1B.png',
                sound: 'assets/tower_place.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'prepare-merge') || hasMergeableTowers(game);
                },
            },
            {
                id: 'merge-towers',
                name: 'Combine Towers',
                nameKey: 'tutorial.mergeTowers.title',
                wave: 2,
                highlightTargets: ['mergeButton'],
                text: 'Great! Now press the Merge Towers button to fuse them into a stronger tower with a different weapon!',
                textKey: 'tutorial.mergeTowers.text',
                picture: 'assets/tower_2B.png',
                sound: 'assets/merge.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'merge-towers') || game.mergeModeActive;
                },
            },
            {
                id: 'select-merge-towers',
                name: 'Select Towers to Merge',
                nameKey: 'tutorial.selectMergeTowers.title',
                wave: 2,
                highlightTargets: [],
                text: 'Now select two adjacent towers of the same color and level to merge them into a powerful upgraded tower!',
                textKey: 'tutorial.selectMergeTowers.text',
                picture: 'assets/tower_2B.png',
                sound: 'assets/merge.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'select-merge-towers') || hasMerges(context);
                },
            },
            {
                id: 'remove-tower',
                name: 'Dismantle with a Long Press',
                nameKey: 'tutorial.removeTower.title',
                wave: 2,
                highlightTargets: [],
                text: 'Press and hold on a tower to scrap it. Long presses free the platform whenever you need room or the wrong color.',
                textKey: 'tutorial.removeTower.text',
                picture: 'assets/tower_1R.png',
                sound: 'assets/tower_remove_charge.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'remove-tower') || hasRemovals(context);
                },
            },
            {
                id: 'score-system',
                name: 'Chase High Scores',
                nameKey: 'tutorial.scoreSystem.title',
                wave: 2,
                highlightTargets: ['scorePanel', 'pauseButton'],
                text: 'You earn score for every kill and for clearing waves. The HUD tracks your local best, and the Pause menu links to the global top 20 leaderboard.',
                textKey: 'tutorial.scoreSystem.text',
                picture: 'assets/swarm_R.png',
                sound: 'assets/color_switch.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'score-system');
                },
            },
            {
                id: 'story-wave10',
                name: 'Ancient Arsenal Unlocked',
                nameKey: 'tutorial.storyWave10.title',
                wave: 10,
                highlightTargets: [],
                text: 'By wave 10 scientists re-arm old war relics—machineguns, railguns, and rockets—to bolster the line. Hold the portal at all costs!',
                textKey: 'tutorial.storyWave10.text',
                picture: 'assets/tank_R.png',
                sound: 'assets/portal_spawn.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'story-wave10');
                },
            },
            {
                id: 'upgrade-tower',
                name: 'Upgrade your Towers',
                nameKey: 'tutorial.upgradeTower.title',
                wave: 15,
                highlightTargets: [],
                text: 'Now there is a way to upgrade your towers without merging! Use the Upgrade button. Keep in mind hat upgrading towers this way is very expensive and should be used when merging cannot help.',
                textKey: 'tutorial.upgradeTower.text',
                picture: 'assets/tower_6B.png',
                sound: 'assets/placement.mp3',
                checkComplete(game, context) {
                    return hasAcknowledged(context, 'upgrade-tower');
                },
            },
        ],
    },
    ads: {
        waveCadence: 500,
    },
    effects: {
        flyingEnergy: {
            fontSize: 32,
            duration: 1.5,
        },
    },
};

export const gameConfig = {
    ...nonBalanceConfig,
    ...balanceConfig,
    towers: {
        ...nonBalanceConfig.towers,
        ...balanceConfig.towers,
    },
    projectiles: {
        ...nonBalanceConfig.projectiles,
        ...balanceConfig.projectiles,
    },
    enemies: {
        ...nonBalanceConfig.enemies,
        ...balanceConfig.enemies,
    },
};

export default gameConfig;
