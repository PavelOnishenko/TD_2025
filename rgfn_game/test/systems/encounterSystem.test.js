import test from 'node:test';
import assert from 'node:assert/strict';

import EncounterSystem from '../../dist/systems/EncounterSystem.js';
import { withMockedRandom } from '../helpers/testUtils.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';

test('EncounterSystem checkEncounter uses discovered tile rate override', () => {
  const encounters = new EncounterSystem(0.1);

  const none = withMockedRandom([0.2], () => encounters.checkEncounter(false));
  const discovered = withMockedRandom([0.1], () => encounters.checkEncounter(true));

  assert.equal(none, false);
  assert.equal(discovered, true);
});

test('EncounterSystem can generate item discovery encounters repeatedly', () => {
  const encounters = new EncounterSystem(1);

  const first = withMockedRandom([0.1], () => encounters.generateEncounter());
  const second = withMockedRandom([0.1], () => encounters.generateEncounter());

  assert.equal(first.type, 'item');
  assert.equal(second.type, 'item');
});

test('EncounterSystem marks bow as unique once discovered', () => {
  const encounters = new EncounterSystem(1);

  const first = withMockedRandom([
    0.1, // item encounter
    0.9, // choose bow from discoverable items [potion, bow]
  ], () => encounters.generateEncounter());

  const second = withMockedRandom([
    0.1, // item encounter
    0.0, // only potion remains after bow discovery
  ], () => encounters.generateEncounter());

  assert.equal(first.type, 'item');
  assert.equal(first.item.id, 'bow');
  assert.equal(second.type, 'item');
  assert.equal(second.item.id, 'healingPotion');
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
  assert.equal(
    skeletonBattle.enemies.length >= balanceConfig.encounters.minEnemies &&
    skeletonBattle.enemies.length <= balanceConfig.encounters.maxEnemies,
    true
  );
});
