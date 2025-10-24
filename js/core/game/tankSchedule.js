import gameConfig from '../../config/gameConfig.js';

function cloneWaveConfigs() {
    return gameConfig.waves.schedule.map(cfg => ({ ...cfg }));
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

function prepareSchedule(game, cfg, waveNumber) {
    if (!cfg) {
        game.tankBurstSchedule = [];
        game.tankBurstSet = new Set();
        game.tankScheduleWave = waveNumber;
        return;
    }
    const schedule = game.generateTankBurstSchedule(cfg.cycles, cfg.tanksCount);
    game.tankBurstSchedule = schedule;
    game.tankBurstSet = new Set(schedule);
    game.tankScheduleWave = waveNumber;
}

const tankSchedule = {
    getWaveConfigs() {
        return cloneWaveConfigs();
    },

    prepareTankScheduleForWave(cfg, waveNumber) {
        prepareSchedule(this, cfg, waveNumber);
    },

    generateTankBurstSchedule(totalCycles, tanksCount) {
        return selectBurstPositions(totalCycles, tanksCount);
    },
};

export default tankSchedule;
