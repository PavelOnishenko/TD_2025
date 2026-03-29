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
    getVillageNameAtPlayerPosition: () => 'Oakcross',
    getCurrentTerrain: () => ({ type: 'plains' }),
    getCurrentNamedLocation: () => null,
    getCurrentTerrain: () => ({ type: 'grass' }),
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
    requestedVillagePrompt: 0,
    closedVillagePrompt: 0,
    startedBattle: 0,
    questEncounterChecks: 0,
    fatigueAdded: 0,
    fatigueRecovered: 0,
  };

  const encounterSystem = {
    onPlayerMove: () => {},
    checkEncounter: () => false,
    generateEncounter: () => ({ type: 'none' }),
    generateMonsterBattleEncounter: () => ({ type: 'battle', enemies: [] }),
    isEncounterTypeEnabled: () => true,
    ...encounterSystemOverrides,
  };

  const callbacks = {
    onEnterVillage: () => { calls.enteredVillage += 1; },
    onRequestVillageEntryPrompt: () => { calls.requestedVillagePrompt += 1; },
    onCloseVillageEntryPrompt: () => { calls.closedVillagePrompt += 1; },
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
      addTravelFatigue: () => { calls.fatigueAdded += 1; },
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

test('WorldModeController opens village entry popup when player is on a village tile', () => {
  const { controller, calls } = createController({ onVillage: true });

  const entered = controller.tryEnterVillageAtCurrentPosition();

  assert.equal(entered, true);
  assert.equal(calls.requestedVillagePrompt, 1);
  assert.equal(calls.enteredVillage, 0);
});

test('WorldModeController ignores re-entry when player is not on a village tile', () => {
  const { controller, calls } = createController({ onVillage: false });

  const entered = controller.tryEnterVillageAtCurrentPosition();

  assert.equal(entered, false);
  assert.equal(calls.enteredVillage, 0);
});

test('WorldModeController Space action opens village prompt from world mode', () => {
  const { controller, calls } = createController({ onVillage: true, pressed: ['enterVillage'] });

  controller.updateWorldMode();

  assert.equal(calls.requestedVillagePrompt, 1);
  assert.equal(calls.enteredVillage, 0);
});

test('WorldModeController opens village prompt immediately when stepping onto village tile', () => {
  const villageState = { onVillage: false };
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    worldMapOverrides: {
      movePlayer: () => {
        villageState.onVillage = true;
        return { moved: true, isPreviouslyDiscovered: false };
      },
      isPlayerOnVillage: () => villageState.onVillage,
    },
  });

  controller.updateWorldMode();

  assert.equal(calls.requestedVillagePrompt, 1);
  assert.equal(calls.questEncounterChecks, 0);
  assert.equal(calls.startedBattle, 0);
});

test('WorldModeController confirms village entry from popup only while still on village tile', () => {
  const { controller, calls } = createController({ onVillage: true });

  controller.tryEnterVillageAtCurrentPosition();
  const entered = controller.confirmVillageEntryFromPrompt();

  assert.equal(entered, true);
  assert.equal(calls.closedVillagePrompt, 1);
  assert.equal(calls.enteredVillage, 1);
});

test('WorldModeController closes village popup immediately when player leaves village cell', () => {
  const villageState = { onVillage: true };
  const { controller, calls } = createController({
    pressed: ['moveUp'],
    worldMapOverrides: {
      movePlayer: () => {
        villageState.onVillage = false;
        return { moved: true, isPreviouslyDiscovered: true };
      },
      isPlayerOnVillage: () => villageState.onVillage,
      getVillageNameAtPlayerPosition: () => 'Oakcross',
      getPlayerPixelPosition: () => [12, 34],
    },
  });

  controller.tryEnterVillageAtCurrentPosition();
  controller.updateWorldMode();

  assert.equal(calls.requestedVillagePrompt >= 1, true);
  assert.equal(calls.closedVillagePrompt, 1);
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

test('WorldModeController wild camp ambush starts a quest battle when quest encounter is available', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  const originalWindow = globalThis.window;
  globalThis.window = { alert: () => {} };

  const { controller, calls } = createController({
    onVillage: false,
    callbacksOverrides: {
      getQuestBattleEncounter: () => {
        calls.questEncounterChecks += 1;
        return { enemies: [] };
      },
    },
  });

  try {
    controller.handleCampSleep();
  } finally {
    Math.random = originalRandom;
    globalThis.window = originalWindow;
  }

  assert.equal(calls.questEncounterChecks, 1);
  assert.equal(calls.startedBattle, 1);
});

test('WorldModeController wild camp ambush starts a regular monster battle when no quest encounter exists', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  const originalWindow = globalThis.window;
  globalThis.window = { alert: () => {} };
  let generatedBattleCount = 0;

  const { controller, calls } = createController({
    onVillage: false,
    encounterSystemOverrides: {
      generateMonsterBattleEncounter: () => {
        generatedBattleCount += 1;
        return { type: 'battle', enemies: [] };
      },
    },
  });

  try {
    controller.handleCampSleep();
  } finally {
    Math.random = originalRandom;
    globalThis.window = originalWindow;
  }

  assert.equal(generatedBattleCount, 1);
  assert.equal(calls.startedBattle, 1);
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
