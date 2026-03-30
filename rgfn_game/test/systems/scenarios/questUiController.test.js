import test from 'node:test';
import assert from 'node:assert/strict';

import QuestUiController from '../../../dist/systems/quest/QuestUiController.js';

function createElement() {
  return {
    innerHTML: '',
    textContent: '',
    listeners: {},
    classList: {
      removed: [],
      added: [],
      remove(name) { this.removed.push(name); },
      add(name) { this.added.push(name); },
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

function createCheckbox(checked = false) {
  const checkbox = createElement();
  checkbox.checked = checked;
  return checkbox;
}

function createStorageMock(initial = null) {
  const state = { value: initial };
  return {
    getItem(key) {
      if (key !== 'rgfn_quests_known_only_toggle_v1') {
        return null;
      }
      return state.value;
    },
    setItem(key, value) {
      if (key === 'rgfn_quests_known_only_toggle_v1') {
        state.value = value;
      }
    },
    state,
  };
}

test('QuestUiController hides the default boilerplate on the root quest but keeps unique child text', () => {
  const title = createElement();
  const knownOnlyToggle = createCheckbox(false);
  const body = createElement();
  const modal = createElement();
  const intro = createElement();
  const closeBtn = createElement();
  const controller = new QuestUiController(title, knownOnlyToggle, body, modal, intro, closeBtn, { onLocationClick: () => false });
  const quest = {
    id: 'main',
    title: 'Signal Dawn',
    description: 'Complete every branch of this quest tree to prove your character can end the darkness over the region.',
    conditionText: 'All child objectives are completed.',
    objectiveType: 'scout',
    entities: [],
    children: [{
      id: 'main.1',
      title: 'Escort Mira Vale',
      description: 'A composite objective. All listed subtasks must be completed.',
      conditionText: 'Each subtask in this branch is completed.',
      objectiveType: 'scout',
      entities: [],
      children: [{
        id: 'main.1.1',
        title: 'Escort Mira Vale',
        description: 'Guide Mira Vale through danger and reach Fog Chapel.',
        conditionText: 'Arrive at Fog Chapel with Mira Vale alive.',
        objectiveType: 'escort',
        entities: [],
        children: [],
      }],
    }],
  };

  controller.renderQuest(quest);

  assert.equal(title.textContent, 'Main Quest: Signal Dawn');
  assert.equal(body.innerHTML.includes('Complete every branch'), false);
  assert.equal(body.innerHTML.includes('Condition: All child objectives are completed.'), false);
  assert.equal(body.innerHTML.includes('A composite objective. All listed subtasks must be completed.'), false);
  assert.equal(body.innerHTML.includes('Condition: Each subtask in this branch is completed.'), false);
  assert.equal(body.innerHTML.includes('Escort Mira Vale'), true);
  assert.equal(body.innerHTML.includes('Arrive at Fog Chapel with Mira Vale alive.'), true);
});

test('QuestUiController opens and closes the intro modal through bound events', () => {
  const controller = new QuestUiController(createElement(), createCheckbox(false), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const modal = controller['introModal'];
  const closeBtn = controller['introCloseBtn'];

  controller.showIntro();
  closeBtn.listeners.click();
  modal.listeners.click({ target: modal });

  assert.deepEqual(modal.classList.removed, ['hidden']);
  assert.deepEqual(modal.classList.added, ['hidden', 'hidden', 'hidden']);
});

test('QuestUiController keeps intro modal hidden by default until explicitly opened', () => {
  const controller = new QuestUiController(createElement(), createCheckbox(false), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const modal = controller['introModal'];

  assert.deepEqual(modal.classList.added, ['hidden']);
  assert.deepEqual(modal.classList.removed, []);
});

test('QuestUiController renders completion styling and checkmark for completed quest nodes', () => {
  const controller = new QuestUiController(createElement(), createCheckbox(false), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const quest = {
    id: 'main',
    title: 'Signal Dawn',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    isCompleted: true,
    children: [],
  };

  controller.renderQuest(quest);

  const bodyHtml = controller['questBody'].innerHTML;
  assert.equal(bodyHtml.includes('quest-node is-completed'), true);
  assert.equal(bodyHtml.includes('quest-node-check'), true);
});

test('QuestUiController clears quest feedback after configured timeout', () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  let scheduledCallback = null;
  let scheduledDelay = -1;
  const clearedTimeoutIds = [];

  global.setTimeout = (callback, delay) => {
    scheduledCallback = callback;
    scheduledDelay = delay;
    return 77;
  };
  global.clearTimeout = (timeoutId) => {
    clearedTimeoutIds.push(timeoutId);
  };

  try {
    const controller = new QuestUiController(createElement(), createCheckbox(false), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });

    controller['setFeedback']('Oakcross is not discovered yet.', true);
    assert.equal(scheduledDelay, 5000);
    assert.equal(controller['feedbackElements'][0].textContent, 'Oakcross is not discovered yet.');

    scheduledCallback();
    assert.equal(controller['feedbackElements'][0].textContent, '');

    controller['setFeedback']('Showing Oakcross on the world map.', false);
    controller['setFeedback']('Showing Fog Chapel on the world map.', false);
    assert.deepEqual(clearedTimeoutIds, [77]);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('QuestUiController known-only mode hides quests below the first incomplete objective', () => {
  const title = createElement();
  const knownOnlyToggle = createCheckbox(true);
  const body = createElement();
  const controller = new QuestUiController(title, knownOnlyToggle, body, createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const quest = {
    id: 'main',
    title: 'Signal Dawn',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    isCompleted: false,
    children: [
      {
        id: 'main.1',
        title: 'Scout Oakcross',
        description: '',
        conditionText: '',
        objectiveType: 'scout',
        entities: [],
        isCompleted: true,
        children: [],
      },
      {
        id: 'main.2',
        title: 'Deliver Dusk Lantern',
        description: '',
        conditionText: '',
        objectiveType: 'deliver',
        entities: [],
        isCompleted: false,
        children: [],
      },
      {
        id: 'main.3',
        title: 'Defeat Hollow Warden',
        description: '',
        conditionText: '',
        objectiveType: 'eliminate',
        entities: [],
        isCompleted: false,
        children: [],
      },
    ],
  };

  controller.renderQuest(quest);

  assert.equal(body.innerHTML.includes('Scout Oakcross'), true);
  assert.equal(body.innerHTML.includes('Deliver Dusk Lantern'), true);
  assert.equal(body.innerHTML.includes('Defeat Hollow Warden'), false);
});

test('QuestUiController defaults known-only toggle to checked when no saved preference exists', () => {
  const originalWindow = global.window;
  const storage = createStorageMock(null);
  global.window = { localStorage: storage };

  try {
    const knownOnlyToggle = createCheckbox(false);
    new QuestUiController(createElement(), knownOnlyToggle, createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
    assert.equal(knownOnlyToggle.checked, true);
  } finally {
    global.window = originalWindow;
  }
});

test('QuestUiController persists and restores known-only toggle state via localStorage', () => {
  const originalWindow = global.window;
  const storage = createStorageMock('0');
  global.window = { localStorage: storage };

  try {
    const knownOnlyToggle = createCheckbox(true);
    const controller = new QuestUiController(createElement(), knownOnlyToggle, createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
    assert.equal(knownOnlyToggle.checked, false);

    knownOnlyToggle.checked = true;
    knownOnlyToggle.listeners.change();
    assert.equal(storage.state.value, '1');

    knownOnlyToggle.checked = false;
    knownOnlyToggle.listeners.change();
    assert.equal(storage.state.value, '0');

    assert.ok(controller);
  } finally {
    global.window = originalWindow;
  }
});
