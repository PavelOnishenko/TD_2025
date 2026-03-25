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
  };
}

function createController({ onVillage = false, pressed = [] } = {}) {
  const calls = {
    enteredVillage: 0,
  };

  const controller = new WorldModeController(
    createInputMock({ pressed }),
    { x: 0, y: 0, restoreMana: () => {} },
    createWorldMapMock({ onVillage }),
    { onPlayerMove: () => {}, checkEncounter: () => false, generateEncounter: () => ({ type: 'none' }) },
    { showItemDiscovery: () => {} },
    {
      onEnterVillage: () => { calls.enteredVillage += 1; },
      onStartBattle: () => {},
      onAddBattleLog: () => {},
      onUpdateHUD: () => {},
      onRememberTraveler: () => {},
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
