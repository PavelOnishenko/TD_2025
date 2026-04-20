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
