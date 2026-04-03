import test from 'node:test';
import assert from 'node:assert/strict';

import GameTimeRuntime from '../../dist/systems/time/GameTimeRuntime.js';

test('GameTimeRuntime creates deterministic calendar for identical generation seed', () => {
  const first = new GameTimeRuntime(null, 123456789);
  const second = new GameTimeRuntime(null, 123456789);

  assert.deepEqual(first.getState(), second.getState());
  assert.equal(first.getHudClockText(), second.getHudClockText());
  assert.equal(first.getHudDateText(), second.getHudDateText());
});

test('GameTimeRuntime usually differs for different generation seeds', () => {
  const first = new GameTimeRuntime(null, 111);
  const second = new GameTimeRuntime(null, 222);

  assert.notDeepEqual(first.getState(), second.getState());
});
