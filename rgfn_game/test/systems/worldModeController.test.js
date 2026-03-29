import test from 'node:test';
import assert from 'node:assert/strict';

import WorldModeController from '../../dist/systems/WorldModeController.js';

function createInputMock({ pressed = [], active = [] } = {}) {
  const pressedSet = new Set(pressed);
  const activeSet = new Set(active);
  return {
    wasActionPressed: (action) => pressedSet.has(action),
    isActionActive: (action) => activeSet.has(action),
  };
}

function createWorldMapMock({ onVillage = false } = {}) {
  return {
    zoomIn: () => false,
    zoomOut: () => false,
    pan: () => false,
    movePlayer: () => ({ moved: false, isPreviouslyDiscovered: false }),
    getPlayerPixelPosition: () => [12, 34],
    isPlayerOnVillage: () => onVillage,
    getCurrentNamedLocation: () => null,
    getCurrentTerrain: () => ({ type: 'grass' }),
    isPlayerOnRoad: () => false,
  };
}

function createController({
  onVillage = false,
  pressed = [],
  moveResult = { moved: false, isPreviouslyDiscovered: false },
  encounterSystemOverrides = {},
  callbacksOverrides = {},
  worldMapOverrides = {},
} = {}) {
  const calls = {
    enteredVillage: 0,
    startedBattle: 0,
    questEncounterChecks: 0,
    fatigueAdded: 0,
    lastFatigueAmount: 0,
    fatigueRecovered: 0,
  };

  const encounterSystem = {
    onPlayerMove: () => {},
    checkEncounter: () => false,
    generateEncounter: () => ({ type: 'none' }),
    isEncounterTypeEnabled: () => true,
    ...encounterSystemOverrides,
  };

  const callbacks = {
    onEnterVillage: () => { calls.enteredVillage += 1; },
    onStartBattle: () => { calls.startedBattle += 1; },
    onAddBattleLog: () => {},
    onUpdateHUD: () => {},
    onRememberTraveler: () => {},
    getQuestBattleEncounter: () => {
      calls.questEncounterChecks += 1;
      return null;
    },
    ...callbacksOverrides,
  };

  const controller = new WorldModeController(
    createInputMock({ pressed }),
    {
      x: 0,
      y: 0,
      mana: 5,
      restoreMana: () => {},
      addTravelFatigue: (amount = 1) => { calls.fatigueAdded += 1; calls.lastFatigueAmount = amount; },
      recoverFatigue: () => {
        calls.fatigueRecovered += 1;
        return 10;
      },
      takeDamage: () => {},
    },
    {
      ...createWorldMapMock({ onVillage }),
      movePlayer: () => moveResult,
      ...worldMapOverrides,
    },
    encounterSystem,
    { showItemDiscovery: () => {} },
    callbacks,
  );

  return { controller, calls };
}

test('WorldModeController re-enters village when player is on a village tile', () => {
  const { controller, calls } = createController({ onVillage: true });

  const entered = controller.tryEnterVillageAtCurrentPosition();

  assert.equal(entered, true);
  assert.equal(calls.enteredVillage, 1);
});

test('WorldModeController ignores re-entry when player is not on a village tile', () => {
  const { controller, calls } = createController({ onVillage: false });

  const entered = controller.tryEnterVillageAtCurrentPosition();

  assert.equal(entered, false);
  assert.equal(calls.enteredVillage, 0);
});

test('WorldModeController Space action enters village from world mode', () => {
  const { controller, calls } = createController({ onVillage: true, pressed: ['enterVillage'] });

  controller.updateWorldMode();

  assert.equal(calls.enteredVillage, 1);
});

test('WorldModeController uses standard travel time on roads', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    moveResult: { moved: true, isPreviouslyDiscovered: false },
    worldMapOverrides: {
      isPlayerOnRoad: () => true,
      getCurrentTerrain: () => ({ type: 'forest' }),
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.fatigueAdded, 1);
  assert.equal(calls.lastFatigueAmount, 1);
});

test('WorldModeController makes off-road grassland travel 2x slower', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    moveResult: { moved: true, isPreviouslyDiscovered: false },
    worldMapOverrides: {
      isPlayerOnRoad: () => false,
      getCurrentTerrain: () => ({ type: 'grass' }),
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.fatigueAdded, 1);
  assert.equal(calls.lastFatigueAmount, 2);
});

test('WorldModeController makes off-road forest travel 4x slower', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    moveResult: { moved: true, isPreviouslyDiscovered: false },
    worldMapOverrides: {
      isPlayerOnRoad: () => false,
      getCurrentTerrain: () => ({ type: 'forest' }),
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.fatigueAdded, 1);
  assert.equal(calls.lastFatigueAmount, 4);
});

test('WorldModeController camp sleep recovers fatigue outside villages', () => {
  const { controller, calls } = createController({ onVillage: false });

  controller.handleCampSleep();

  assert.equal(calls.fatigueRecovered, 1);
});

test('WorldModeController allows quest monster encounters when monster random encounters are enabled', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    worldMapOverrides: {
      movePlayer: () => ({ moved: true, isPreviouslyDiscovered: false }),
      isPlayerOnVillage: () => false,
    },
    callbacksOverrides: {
      getQuestBattleEncounter: () => {
        calls.questEncounterChecks += 1;
        return { enemies: [] };
      },
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.questEncounterChecks, 1);
  assert.equal(calls.startedBattle, 1);
});

test('WorldModeController blocks quest monster encounters when monster random encounters are disabled', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    worldMapOverrides: {
      movePlayer: () => ({ moved: true, isPreviouslyDiscovered: false }),
      isPlayerOnVillage: () => false,
    },
    encounterSystemOverrides: {
      isEncounterTypeEnabled: () => false,
    },
    callbacksOverrides: {
      getQuestBattleEncounter: () => {
        calls.questEncounterChecks += 1;
        return { enemies: [] };
      },
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.questEncounterChecks, 0);
  assert.equal(calls.startedBattle, 0);
});
