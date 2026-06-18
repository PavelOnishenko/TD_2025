/**
 * Balance Data Viewer
 * Provides a GUI to view and export balance tracking data
 */

function formatBalanceData(game) {
    if (!game.balanceData || !game.balanceData.waves.length) {
        return 'No balance data collected yet.';
    }

    const lines = [];
    lines.push('========================================');
    lines.push('BALANCE TRACKING DATA');
    lines.push('========================================\n');

    game.balanceData.waves.forEach(wave => {
        lines.push(`WAVE ${wave.wave}:`);
        lines.push(`  Duration: ${(wave.duration / 1000).toFixed(1)}s`);
        lines.push(`  Enemies: ${wave.swarmKills} swarms, ${wave.tankKills} tanks (${wave.swarmKills + wave.tankKills} total)`);
        lines.push(`  Energy: Start=${wave.startEnergy}, End=${wave.endEnergy}, Gained=${wave.energyFromKills + wave.energyFromWave}, Spent=${wave.energySpent}`);
        lines.push(`    From kills: ${wave.energyFromKills}, From wave clear: ${wave.energyFromWave}`);
        lines.push(`  Towers: Start=${wave.startTowers}, End=${wave.endTowers}`);
        lines.push(`    Placed: ${wave.towersPlaced}, Merged: ${wave.towersMerged}, Upgraded: ${wave.towersUpgraded}, Removed: ${wave.towersRemoved}`);
        lines.push(`  Tower Levels (end): L1=${wave.towersByLevelEnd[1]}, L2=${wave.towersByLevelEnd[2]}, L3=${wave.towersByLevelEnd[3]}, L4=${wave.towersByLevelEnd[4]}, L5=${wave.towersByLevelEnd[5]}, L6=${wave.towersByLevelEnd[6]}`);
        lines.push(`  Lives Lost: ${wave.livesLost}`);
        lines.push('');
    });

    lines.push('========================================');

    return lines.join('\n');
}

function generateCSV(game) {
    if (!game.balanceData || !game.balanceData.waves.length) {
        return null;
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

    return csv;
}

function downloadCSV(csv, filename = 'balance_data.csv') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function toggleModal(modalEl, open) {
    if (!modalEl) {
        return;
    }
    modalEl.classList.toggle('dev-modal--hidden', !open);
}

export function initBalanceViewer(game) {
    if (!game) {
        return;
    }

    const openBtn = document.getElementById('openBalanceViewer');
    const modal = document.getElementById('balanceViewer');
    const closeBtn = document.getElementById('closeBalanceViewer');
    const refreshBtn = document.getElementById('refreshBalanceData');
    const exportBtn = document.getElementById('exportBalanceCSV');
    const dataDisplay = document.getElementById('balanceDataDisplay');

    if (!openBtn || !modal) {
        return;
    }

    const refreshDisplay = () => {
        if (dataDisplay) {
            dataDisplay.textContent = formatBalanceData(game);
        }
    };

    const handleExport = () => {
        const csv = generateCSV(game);
        if (!csv) {
            if (dataDisplay) {
                dataDisplay.textContent = 'No balance data to export.';
            }
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `balance_data_${timestamp}.csv`;
        downloadCSV(csv, filename);
    };

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            refreshDisplay();
            toggleModal(modal, true);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => toggleModal(modal, false));
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDisplay);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    modal.addEventListener('click', (event) => {
        const target = event.target;
        const clickedBackdrop = target === modal || (target instanceof HTMLElement && target.classList.contains('dev-modal__backdrop'));
        if (clickedBackdrop) {
            toggleModal(modal, false);
        }
    });

    const handleKeydown = (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('dev-modal--hidden')) {
            toggleModal(modal, false);
        }
    };
    window.addEventListener('keydown', handleKeydown);

    toggleModal(modal, false);
}

export default initBalanceViewer;
