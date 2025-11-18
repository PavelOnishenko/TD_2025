import gameConfig from '../../config/gameConfig.js';

function cloneWaveConfigs() {
    return gameConfig.waves.schedule.map(cfg => ({ ...cfg }));
}

function extractTankScheduleFromPlan(plan) {
    if (!plan || !Array.isArray(plan.events)) {
        return null;
    }
    const sortedEvents = plan.events.slice().sort((a, b) => a.time - b.time
        || String(a.formationId ?? '').localeCompare(String(b.formationId ?? '')));
    const schedule = [];
    for (let i = 0; i < sortedEvents.length; i += 1) {
        const event = sortedEvents[i];
        if ((event?.type ?? '').toLowerCase() === 'tank') {
            schedule.push(i + 1);
        }
    }
    return schedule;
}

function prepareSchedule(game, cfg, waveNumber, totalEnemies, plan) {
    const planSchedule = extractTankScheduleFromPlan(plan);
    if (plan) {
        game.tankBurstSchedule = Array.isArray(planSchedule) ? planSchedule : [];
        game.tankBurstSet = new Set(game.tankBurstSchedule);
        game.tankScheduleWave = waveNumber;
        return;
    }

    if (!cfg) {
        game.tankBurstSchedule = [];
        game.tankBurstSet = new Set();
        game.tankScheduleWave = waveNumber;
        return;
    }
    game.tankBurstSchedule = [];
    game.tankBurstSet = new Set();
    game.tankScheduleWave = waveNumber;
}

const tankSchedule = {
    getWaveConfigs() {
        return cloneWaveConfigs();
    },

    prepareTankScheduleForWave(cfg, waveNumber, totalEnemies, plan) {
        const planToUse = plan ?? this.activeFormationPlan;
        prepareSchedule(this, cfg, waveNumber, totalEnemies, planToUse);
    },

    generateTankBurstSchedule(totalEnemies, plan) {
        const schedule = extractTankScheduleFromPlan(plan);
        return Array.isArray(schedule)
            ? schedule
            : [];
    },
};

export default tankSchedule;
