import test from 'node:test';
import assert from 'node:assert/strict';

import EncounterSystem from '../../dist/systems/EncounterSystem.js';
import { withMockedRandom } from '../helpers/testUtils.js';

test('EncounterSystem checkEncounter uses discovered tile rate override', () => {
  const encounters = new EncounterSystem(0.1);

  const none = withMockedRandom([0.2], () => encounters.checkEncounter(false));
  const discovered = withMockedRandom([0.4], () => encounters.checkEncounter(true));

  assert.equal(none, false);
  assert.equal(discovered, true);
});

test('EncounterSystem can generate one-time item discovery', () => {
  const encounters = new EncounterSystem(1);

  const first = withMockedRandom([0.1], () => encounters.generateEncounter());
  const second = withMockedRandom([0.1, 0.0], () => encounters.generateEncounter());

  assert.equal(first.type, 'item');
  assert.equal(second.type, 'battle');
});

test('EncounterSystem handles dragon pass encounter branch', () => {
  const encounters = new EncounterSystem(1);

  const result = withMockedRandom([
    0.9, // no item
    0.95, // roll dragon from weighted table
    0.1, // dragon passes
  ], () => encounters.generateEncounter());

  assert.equal(result.type, 'none');
});

test('EncounterSystem can generate grouped enemies', () => {
  const encounters = new EncounterSystem(1);

  const skeletonBattle = withMockedRandom([
    0.9, // no item
    0.1, // skeleton type
    0.6, // randomInt => 2 enemies (range 1..3)
  ], () => encounters.generateEncounter());

  assert.equal(skeletonBattle.type, 'battle');
  assert.equal(skeletonBattle.enemies.length >= 1, true);
});
