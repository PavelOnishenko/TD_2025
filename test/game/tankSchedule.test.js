import test from 'node:test';
import assert from 'node:assert/strict';
import tankSchedule from '../../js/core/game/tankSchedule.js';

test('tank schedule follows tanks present in active formation plan', () => {
    const plan = {
        events: [
            { time: 0.4, type: 'swarm', formationId: 's1' },
            { time: 0.2, type: 'tank', formationId: 't1' },
            { time: 0.1, type: 'tank', formationId: 't2' },
            { time: 0.3, type: 'swarm', formationId: 's2' },
        ],
    };
    const game = { ...tankSchedule };

    tankSchedule.prepareTankScheduleForWave.call(game, { interval: 1, difficulty: 5 }, 3, 4, plan);

    assert.deepEqual(game.tankBurstSchedule, [1, 2]);
    assert.ok(game.tankBurstSet instanceof Set);
    assert.ok(game.tankBurstSet.has(1));
    assert.equal(game.tankScheduleWave, 3);
});

