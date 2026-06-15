import test from 'node:test';
import assert from 'node:assert/strict';

import WorldSimulationRuntime from '../../dist/systems/world-sim/WorldSimulationRuntime.js';

test('WorldSimulationRuntime increments worldTick on each tick', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  assert.equal(runtime.getState().worldTick, 0);
  runtime.tick(5);
  assert.equal(runtime.getState().worldTick, 1);
  runtime.tick(12);
  assert.equal(runtime.getState().worldTick, 2);
});

test('WorldSimulationRuntime runs stages in the expected pipeline order', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();
  runtime.tick(10);

  assert.deepEqual(runtime.getState().lastStageOrder, [
    'movement',
    'taskAssign',
    'taskProgress',
    'conflicts',
    'villages',
  ]);
});

test('WorldSimulationRuntime switches control after 24h undefended capture timer', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  const targetCell = runtime.getState().factions.blue.territoryCellIds[0];
  runtime.tick(60);
  assert.ok(runtime.getState().captureTimers[targetCell]);
  runtime.tick(22 * 60);
  assert.ok(runtime.getState().captureTimers[targetCell]);
  runtime.tick(60);

  const state = runtime.getState();
  assert.ok(state.factions.red.territoryCellIds.includes(targetCell));
  assert.ok(!state.factions.blue.territoryCellIds.includes(targetCell));
  assert.equal(state.captureTimers[targetCell], undefined);
});

test('WorldSimulationRuntime keeps capture timer below 24h before control switch', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  const targetCell = runtime.getState().factions.blue.territoryCellIds[0];
  runtime.tick(60);
  runtime.tick(22 * 60);
  const timer = runtime.getState().captureTimers[targetCell];

  assert.ok(timer.progressHours < 24);
  assert.ok(runtime.getState().factions.blue.territoryCellIds.includes(targetCell));
});

test('WorldSimulationRuntime assigns raid to nearest blue territory cell', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize({
    factions: {
      red: { factionId: 'red', territoryCellIds: ['0,0'], activeSquadIds: ['red-1'] },
      blue: { factionId: 'blue', territoryCellIds: ['5,0', '1,0', '8,3'], activeSquadIds: ['blue-1'] },
    },
  });

  runtime.tick(10);
  const raid = runtime.getState().raids[0];
  assert.equal(raid.targetCellId, '1,0');
  assert.equal(raid.fromCellId, '0,0');
});

test('WorldSimulationRuntime creates intercept trace and conflict event when defenders exist', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  runtime.tick(15);
  const state = runtime.getState();

  assert.ok(state.intercepts.length > 0);
  assert.match(state.intercepts[0], /blue-intercept/);
  assert.ok(state.pendingEvents.some((eventLabel) => eventLabel.includes('conflict:intercept:')));
});

test('WorldSimulationRuntime does not start capture timers without defender intercept', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize({
    factions: {
      red: { factionId: 'red', territoryCellIds: ['0,0'], activeSquadIds: ['red-1'] },
      blue: { factionId: 'blue', territoryCellIds: ['2,0'], activeSquadIds: [] },
    },
  });

  runtime.tick(15);
  const state = runtime.getState();

  assert.equal(state.intercepts.length, 0);
  assert.equal(Object.keys(state.captureTimers).length, 0);
});

test('WorldSimulationRuntime caps pending event queue to 64 entries', () => {
  const runtime = new WorldSimulationRuntime();
  runtime.initialize();

  for (let i = 0; i < 30; i += 1) {
    runtime.tick(10);
  }

  const state = runtime.getState();
  assert.equal(state.pendingEvents.length, 64);
});
