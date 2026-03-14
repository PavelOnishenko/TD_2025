import test from 'node:test';
import assert from 'node:assert/strict';

import EncounterSystem from '../../dist/systems/EncounterSystem.js';
import Skeleton from '../../dist/entities/Skeleton.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { withPatchedProperty, withPatchedMethod, withFixedRandom } from '../helpers/testUtils.js';

function setupEventType(encounters, eventType) {
  encounters.rollEncounterEventType = () => eventType;
}

function setupEncounterType(encounters, encounterType) {
  encounters.rollEncounterType = () => encounterType;
}

function setupDragonPassingCheck(doesPass) {
  return withPatchedMethod(Skeleton.prototype, 'shouldPassEncounter', () => doesPass);
}

test('EncounterSystem checkEncounter uses discovered tile rate override', () => {
  const encounters = new EncounterSystem(0);

  const none = encounters.checkEncounter(false);
  const discovered = withPatchedProperty(
    balanceConfig.encounters,
    'discoveredEncounterRate',
    1,
    () => encounters.checkEncounter(true)
  );

  assert.equal(none, false);
  assert.equal(discovered, true);
});

test('EncounterSystem can generate item discovery encounters repeatedly', () => {
  const encounters = new EncounterSystem(1);

  encounters.queueForcedEncounter('item');
  encounters.queueForcedEncounter('item');

  const first = encounters.generateEncounter();
  const second = encounters.generateEncounter();

  assert.equal(first.type, 'item');
  assert.equal(first.item.id, 'bow');
  assert.equal(second.type, 'item');
  assert.equal(second.item.id, 'bow');
});

test('EncounterSystem marks bow as unique once discovered', () => {
  const encounters = new EncounterSystem(1);

  encounters.queueForcedEncounter('item');
  const first = encounters.generateEncounter();

  withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => {
    const second = withFixedRandom(0, () => encounters.generateEncounter());

    assert.equal(second.type, 'item');
    assert.equal(second.item.id, 'healingPotion');
  });

  assert.equal(first.type, 'item');
  assert.equal(first.item.id, 'bow');
});

test('EncounterSystem handles dragon pass encounter branch', () => {
  const encounters = new EncounterSystem(1);

  withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    setupEventType(encounters, 'monster');
    setupEncounterType(encounters, 'dragon');

    setupDragonPassingCheck(true)(() => {
      const result = encounters.generateEncounter();
      assert.equal(result.type, 'none');
    });
  });
});

test('EncounterSystem can generate grouped enemies', () => {
  const encounters = new EncounterSystem(1);

  withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    setupEventType(encounters, 'monster');
    setupEncounterType(encounters, 'skeleton');

    const skeletonBattle = encounters.generateEncounter();

    assert.equal(skeletonBattle.type, 'battle');
    assert.equal(
      skeletonBattle.enemies.length >= balanceConfig.encounters.minEnemies &&
      skeletonBattle.enemies.length <= balanceConfig.encounters.maxEnemies,
      true
    );
  });
});
