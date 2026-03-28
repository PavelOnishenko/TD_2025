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
  };
}

function createController({ onVillage = false, pressed = [], moveResult = { moved: false, isPreviouslyDiscovered: false } } = {}) {
  const calls = {
    enteredVillage: 0,
    fatigueAdded: 0,
    fatigueRecovered: 0,
  };

  const controller = new WorldModeController(
    createInputMock({ pressed }),
    {
      x: 0,
      y: 0,
      mana: 5,
      restoreMana: () => {},
      addTravelFatigue: () => { calls.fatigueAdded += 1; },
      recoverFatigue: () => { calls.fatigueRecovered += 1; return 10; },
      takeDamage: () => {},
    },
    { ...createWorldMapMock({ onVillage }), movePlayer: () => moveResult },
    { onPlayerMove: () => {}, checkEncounter: () => false, generateEncounter: () => ({ type: 'none' }) },
    { showItemDiscovery: () => {} },
    {
      onEnterVillage: () => { calls.enteredVillage += 1; },
      onStartBattle: () => {},
      onAddBattleLog: () => {},
      onUpdateHUD: () => {},
      onRememberTraveler: () => {},
      getQuestBattleEncounter: () => null,
    },
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

test('WorldModeController adds fatigue when player successfully moves on world map', () => {
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    moveResult: { moved: true, isPreviouslyDiscovered: false },
  });

  controller.updateWorldMode();

  assert.equal(calls.fatigueAdded, 1);
});

test('WorldModeController camp sleep recovers fatigue outside villages', () => {
  const { controller, calls } = createController({ onVillage: false });

  controller.handleCampSleep();

  assert.equal(calls.fatigueRecovered, 1);
});
