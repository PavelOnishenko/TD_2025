import gameConfig from '../../config/gameConfig.js';

function getWaveDifficultyMultiplier() {
    const multiplier = Number(gameConfig?.waves?.difficultyMultiplier);
    return Number.isFinite(multiplier) ? multiplier : 1;
}

function cloneWaveConfigs() {
    const multiplier = getWaveDifficultyMultiplier();
    return gameConfig.waves.schedule.map(cfg => {
        const difficulty = Number.isFinite(cfg?.difficulty)
            ? cfg.difficulty * multiplier
            : cfg.difficulty;
        return { ...cfg, difficulty };
    });
}

function shufflePositions(count) {
    const positions = Array.from({ length: count }, (_, index) => index + 1);
    for (let i = positions.length - 1; i > 0; i -= 1) {
        const swapIndex = Math.floor(Math.random() * (i + 1));
        const temp = positions[i];
        positions[i] = positions[swapIndex];
        positions[swapIndex] = temp;
    }
    return positions;
}

function selectBurstPositions(totalCycles, tanksCount) {
    const total = Math.max(0, Math.floor(totalCycles ?? 0));
    const requested = Math.max(0, Math.floor(tanksCount ?? 0));
    if (total === 0 || requested === 0) {
        return [];
    }
    const shuffled = shufflePositions(total);
    const trimmed = shuffled.slice(0, Math.min(requested, total));
    trimmed.sort((a, b) => a - b);
    return trimmed;
}

function prepareSchedule(game, cfg, waveNumber, totalEnemies) {
    if (!cfg) {
        game.tankBurstSchedule = [];
        game.tankBurstSet = new Set();
        game.tankScheduleWave = waveNumber;
        return;
    }
    const total = Number.isFinite(totalEnemies)
        ? Math.max(0, Math.floor(totalEnemies))
        : Number.isFinite(cfg?.difficulty)
            ? Math.max(0, Math.floor(cfg.difficulty))
            : 0;
    const schedule = game.generateTankBurstSchedule(total, cfg.tanksCount);
    game.tankBurstSchedule = schedule;
    game.tankBurstSet = new Set(schedule);
    game.tankScheduleWave = waveNumber;
}

const tankSchedule = {
    getWaveConfigs() {
        return cloneWaveConfigs();
    },

    prepareTankScheduleForWave(cfg, waveNumber, totalEnemies) {
        prepareSchedule(this, cfg, waveNumber, totalEnemies);
    },

    generateTankBurstSchedule(totalEnemies, tanksCount) {
        return selectBurstPositions(totalEnemies, tanksCount);
    },
};

export default tankSchedule;
