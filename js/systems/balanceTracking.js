/**
 * Balance Tracking System
 * Tracks gameplay metrics for balancing purposes
 */

export function initializeBalanceTracking(game) {
    game.balanceData = {
        sessionStart: Date.now(),
        waves: [],
        currentWave: null,
        pendingActions: {
            energySpent: 0,
            towersPlaced: 0,
            towersMerged: 0,
            towersUpgraded: 0,
            towersRemoved: 0,
        },
    };

    // Add console command to print data
    if (typeof window !== 'undefined') {
        window.printBalanceData = () => printBalanceData(game);
        window.exportBalanceCSV = () => exportBalanceCSV(game);
    }
}

export function startWaveTracking(game, waveNumber) {
    if (!game.balanceData) {
        initializeBalanceTracking(game);
    }

    // Apply pending actions from between waves
    const pending = game.balanceData.pendingActions || {
        energySpent: 0,
        towersPlaced: 0,
        towersMerged: 0,
        towersUpgraded: 0,
        towersRemoved: 0,
    };

    game.balanceData.currentWave = {
        wave: waveNumber,
        startTime: Date.now(),
        startEnergy: game.energy || 0,
        startTowers: game.towers ? game.towers.length : 0,
        towersByLevel: getTowerCounts(game),
        swarmKills: 0,
        tankKills: 0,
        energyFromKills: 0,
        energyFromWave: 0,
        energySpent: pending.energySpent,
        towersPlaced: pending.towersPlaced,
        towersMerged: pending.towersMerged,
        towersUpgraded: pending.towersUpgraded,
        towersRemoved: pending.towersRemoved,
        livesLost: 0,
        endEnergy: 0,
        endTowers: 0,
        duration: 0,
    };

    // Reset pending actions
    game.balanceData.pendingActions = {
        energySpent: 0,
        towersPlaced: 0,
        towersMerged: 0,
        towersUpgraded: 0,
        towersRemoved: 0,
    };
}

export function completeWaveTracking(game, waveEnergyGain) {
    if (!game.balanceData || !game.balanceData.currentWave) {
        return;
    }

    const wave = game.balanceData.currentWave;
    wave.duration = Date.now() - wave.startTime;
    wave.endEnergy = game.energy || 0;
    wave.endTowers = game.towers ? game.towers.length : 0;
    wave.energyFromWave = waveEnergyGain || 0;
    wave.towersByLevelEnd = getTowerCounts(game);

    game.balanceData.waves.push(wave);
    game.balanceData.currentWave = null;
}

export function trackEnemyKill(game, enemy, energyGain) {
    if (!game.balanceData || !game.balanceData.currentWave) {
        return;
    }

    const wave = game.balanceData.currentWave;
    const isTank = enemy?.spriteKey === 'tank';

    if (isTank) {
        wave.tankKills++;
    } else {
        wave.swarmKills++;
    }

    wave.energyFromKills += energyGain || 0;
}

export function trackTowerPlaced(game, cost) {
    if (!game.balanceData) {
        return;
    }

    if (game.balanceData.currentWave) {
        // Track on current wave if one is active
        const wave = game.balanceData.currentWave;
        wave.towersPlaced++;
        wave.energySpent += cost || 0;
    } else {
        // Buffer for next wave if between waves
        if (!game.balanceData.pendingActions) {
            game.balanceData.pendingActions = {
                energySpent: 0,
                towersPlaced: 0,
                towersMerged: 0,
                towersUpgraded: 0,
                towersRemoved: 0,
            };
        }
        game.balanceData.pendingActions.towersPlaced++;
        game.balanceData.pendingActions.energySpent += cost || 0;
    }
}

export function trackTowerMerged(game) {
    if (!game.balanceData) {
        return;
    }

    if (game.balanceData.currentWave) {
        // Track on current wave if one is active
        const wave = game.balanceData.currentWave;
        wave.towersMerged++;
    } else {
        // Buffer for next wave if between waves
        if (!game.balanceData.pendingActions) {
            game.balanceData.pendingActions = {
                energySpent: 0,
                towersPlaced: 0,
                towersMerged: 0,
                towersUpgraded: 0,
                towersRemoved: 0,
            };
        }
        game.balanceData.pendingActions.towersMerged++;
    }
}

export function trackTowerUpgraded(game, cost) {
    if (!game.balanceData) {
        return;
    }

    if (game.balanceData.currentWave) {
        // Track on current wave if one is active
        const wave = game.balanceData.currentWave;
        wave.towersUpgraded++;
        wave.energySpent += cost || 0;
    } else {
        // Buffer for next wave if between waves
        if (!game.balanceData.pendingActions) {
            game.balanceData.pendingActions = {
                energySpent: 0,
                towersPlaced: 0,
                towersMerged: 0,
                towersUpgraded: 0,
                towersRemoved: 0,
            };
        }
        game.balanceData.pendingActions.towersUpgraded++;
        game.balanceData.pendingActions.energySpent += cost || 0;
    }
}

export function trackTowerRemoved(game) {
    if (!game.balanceData) {
        return;
    }

    if (game.balanceData.currentWave) {
        // Track on current wave if one is active
        const wave = game.balanceData.currentWave;
        wave.towersRemoved++;
    } else {
        // Buffer for next wave if between waves
        if (!game.balanceData.pendingActions) {
            game.balanceData.pendingActions = {
                energySpent: 0,
                towersPlaced: 0,
                towersMerged: 0,
                towersUpgraded: 0,
                towersRemoved: 0,
            };
        }
        game.balanceData.pendingActions.towersRemoved++;
    }
}

export function trackLifeLost(game) {
    if (!game.balanceData || !game.balanceData.currentWave) {
        return;
    }

    const wave = game.balanceData.currentWave;
    wave.livesLost++;
}

function getTowerCounts(game) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    if (!game.towers || !Array.isArray(game.towers)) {
        return counts;
    }

    game.towers.forEach(tower => {
        const level = tower?.level || 1;
        if (level >= 1 && level <= 6) {
            counts[level]++;
        }
    });

    return counts;
}

function printBalanceData(game) {
    if (!game.balanceData || !game.balanceData.waves.length) {
        console.log('No balance data collected yet.');
        return;
    }

    console.log('\n========================================');
    console.log('BALANCE TRACKING DATA');
    console.log('========================================\n');

    game.balanceData.waves.forEach(wave => {
        console.log(`WAVE ${wave.wave}:`);
        console.log(`  Duration: ${(wave.duration / 1000).toFixed(1)}s`);
        console.log(`  Enemies: ${wave.swarmKills} swarms, ${wave.tankKills} tanks (${wave.swarmKills + wave.tankKills} total)`);
        console.log(`  Energy: Start=${wave.startEnergy}, End=${wave.endEnergy}, Gained=${wave.energyFromKills + wave.energyFromWave}, Spent=${wave.energySpent}`);
        console.log(`    From kills: ${wave.energyFromKills}, From wave clear: ${wave.energyFromWave}`);
        console.log(`  Towers: Start=${wave.startTowers}, End=${wave.endTowers}`);
        console.log(`    Placed: ${wave.towersPlaced}, Merged: ${wave.towersMerged}, Upgraded: ${wave.towersUpgraded}, Removed: ${wave.towersRemoved}`);
        console.log(`  Tower Levels (end): L1=${wave.towersByLevelEnd[1]}, L2=${wave.towersByLevelEnd[2]}, L3=${wave.towersByLevelEnd[3]}, L4=${wave.towersByLevelEnd[4]}, L5=${wave.towersByLevelEnd[5]}, L6=${wave.towersByLevelEnd[6]}`);
        console.log(`  Lives Lost: ${wave.livesLost}`);
        console.log('');
    });

    console.log('========================================\n');
}

function exportBalanceCSV(game) {
    if (!game.balanceData || !game.balanceData.waves.length) {
        console.log('No balance data to export.');
        return;
    }

    const headers = [
        'Wave',
        'Duration(s)',
        'Swarms',
        'Tanks',
        'TotalEnemies',
        'StartEnergy',
        'EndEnergy',
        'EnergyFromKills',
        'EnergyFromWave',
        'EnergySpent',
        'StartTowers',
        'EndTowers',
        'Placed',
        'Merged',
        'Upgraded',
        'Removed',
        'L1',
        'L2',
        'L3',
        'L4',
        'L5',
        'L6',
        'LivesLost',
    ];

    const rows = game.balanceData.waves.map(w => [
        w.wave,
        (w.duration / 1000).toFixed(1),
        w.swarmKills,
        w.tankKills,
        w.swarmKills + w.tankKills,
        w.startEnergy,
        w.endEnergy,
        w.energyFromKills,
        w.energyFromWave,
        w.energySpent,
        w.startTowers,
        w.endTowers,
        w.towersPlaced,
        w.towersMerged,
        w.towersUpgraded,
        w.towersRemoved,
        w.towersByLevelEnd[1],
        w.towersByLevelEnd[2],
        w.towersByLevelEnd[3],
        w.towersByLevelEnd[4],
        w.towersByLevelEnd[5],
        w.towersByLevelEnd[6],
        w.livesLost,
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
    ].join('\n');

    console.log('\n========================================');
    console.log('CSV EXPORT (copy below)');
    console.log('========================================\n');
    console.log(csv);
    console.log('\n========================================\n');

    // Try to copy to clipboard if available
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
        navigator.clipboard.writeText(csv)
            .then(() => console.log('CSV copied to clipboard!'))
            .catch(() => console.log('Could not copy to clipboard. Please copy manually.'));
    }

    return csv;
}
