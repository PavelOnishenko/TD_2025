import test from 'node:test';
import assert from 'node:assert/strict';

import DeveloperEventController from '../../dist/systems/encounter/DeveloperEventController.js';
import EncounterSystem from '../../dist/systems/encounter/EncounterSystem.js';

function createClassList(initial = []) {
  const values = new Set(initial);

  return {
    contains: (value) => values.has(value),
    toggle: (value, force) => {
      if (typeof force === 'boolean') {
        if (force) {
          values.add(value);
        } else {
          values.delete(value);
        }
        return values.has(value);
      }
      if (values.has(value)) {
        values.delete(value);
        return false;
      }
      values.add(value);
      return true;
    },
  };
}

function createDeveloperUi() {
  const createInput = () => ({ value: '0', checked: true });

  return {
    modal: { classList: createClassList(['hidden']) },
    eventType: { value: 'item' },
    queueList: { innerHTML: '', appendChild: () => {} },
    encounterTypeSummary: { textContent: '' },
    encounterTypeToggles: {
      monster: createInput(),
      item: createInput(),
      village: createInput(),
      traveler: createInput(),
    },
    nextRollSummary: { textContent: '' },
    nextRollModal: { classList: createClassList(['hidden']) },
    nextRollTotal: { textContent: '' },
    nextRollStatus: { textContent: '', classList: createClassList() },
    nextRollInputs: {
      vitality: createInput(),
      toughness: createInput(),
      strength: createInput(),
      agility: createInput(),
      connection: createInput(),
      intelligence: createInput(),
    },
    everythingDiscoveredToggle: { checked: false },
    fogOfWarToggle: { checked: true },
  };
}

function createController(logs, encounterSystem, developerUI) {
  const mapDisplayConfig = {
    everythingDiscovered: false,
    fogOfWar: true,
  };

  return new DeveloperEventController(developerUI, encounterSystem, {
    addVillageLog: (message) => logs.push(message),
    getEventLabel: (type) => type,
    getMapDisplayConfig: () => ({ ...mapDisplayConfig }),
    setMapDisplayConfig: (config) => Object.assign(mapDisplayConfig, config),
  });
}

test('DeveloperEventController updates encounter toggle summary when a type is disabled', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleEncounterTypeToggle('item', false);

  assert.equal(encounterSystem.isEncounterTypeEnabled('item'), false);
  assert.equal(developerUI.encounterTypeToggles.item.checked, false);
  assert.equal(developerUI.encounterTypeSummary.textContent, 'Enabled random encounters: Monster, Village, Traveler.');
  assert.equal(logs[0], '[DEV] Item encounters disabled.');
});

test('DeveloperEventController can disable all random encounter types from the dev console', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleEncounterTypesToggleAll(false);

  assert.deepEqual(encounterSystem.getEncounterTypeStates(), {
    monster: false,
    item: false,
    village: false,
    traveler: false,
  });
  assert.equal(developerUI.encounterTypeSummary.textContent, 'Random encounters disabled. Forced queue still works.');
  assert.equal(logs[0], '[DEV] Disabled all random encounter types.');
});

test('DeveloperEventController syncs and updates map display toggles from the dev console', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleMapDisplayToggle('everythingDiscovered', true);
  controller.handleMapDisplayToggle('fogOfWar', false);

  assert.equal(developerUI.everythingDiscoveredToggle.checked, true);
  assert.equal(developerUI.fogOfWarToggle.checked, false);
  assert.deepEqual(logs.slice(-2), [
    '[DEV] Everything discovered enabled.',
    '[DEV] Fog of war disabled.',
  ]);
});
