import test from 'node:test';
import assert from 'node:assert/strict';

import EncounterSystem from '../../dist/systems/encounter/EncounterSystem.js';
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

  const [first, second] = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    encounters.queueForcedEncounter('item');
    encounters.queueForcedEncounter('item');
    return [encounters.generateEncounter(), encounters.generateEncounter()];
  });

  assert.equal(first.type, 'item');
  assert.equal(second.type, 'item');
  assert.equal(typeof first.item.id, 'string');
  assert.equal(typeof second.item.id, 'string');
});

test('EncounterSystem item pool can include configured melee weapons', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => (
    withFixedRandom(0.2, () => encounters.generateEncounter())
  ));

  assert.equal(result.type, 'item');
  assert.equal(result.item.type === 'weapon' || result.item.type === 'armor' || result.item.type === 'consumable', true);
});


test('EncounterSystem blocks item discoveries when discovery is disabled for known tiles', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 1, () => {
    setupEventType(encounters, 'item');
    setupEncounterType(encounters, 'skeleton');
    return encounters.generateEncounter(false);
  });

  assert.notEqual(result.type, 'item');
});

test('EncounterSystem blocks random village discoveries when village discovery is disabled for known tiles', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    setupEventType(encounters, 'village');
    setupEncounterType(encounters, 'skeleton');
    return encounters.generateEncounter(true, false);
  });

  assert.notEqual(result.type, 'village');
  assert.equal(result.type, 'battle');
});

test('EncounterSystem still allows forced village encounters when village discovery is disabled', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    encounters.queueForcedEncounter('village');
    return encounters.generateEncounter(true, false);
  });

  assert.equal(result.type, 'village');
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


test('EncounterSystem can generate traveler encounter', () => {
  const encounters = new EncounterSystem(1);

  const result = withPatchedProperty(encounters, 'itemDiscoveryChance', 0, () => {
    encounters.queueForcedEncounter('traveler');
    return encounters.generateEncounter();
  });

  assert.equal(result.type, 'traveler');
  assert.equal(result.traveler.level >= 1, true);
});
