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
