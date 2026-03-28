import test from 'node:test';
import assert from 'node:assert/strict';

import QuestUiController from '../../dist/systems/quest/QuestUiController.js';

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

test('QuestUiController hides the default boilerplate on the root quest but keeps unique child text', () => {
  const title = createElement();
  const body = createElement();
  const modal = createElement();
  const intro = createElement();
  const closeBtn = createElement();
  const controller = new QuestUiController(title, body, modal, intro, closeBtn, { onLocationClick: () => false });
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
  const controller = new QuestUiController(createElement(), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const modal = controller['introModal'];
  const closeBtn = controller['introCloseBtn'];

  controller.showIntro();
  closeBtn.listeners.click();
  modal.listeners.click({ target: modal });

  assert.deepEqual(modal.classList.removed, ['hidden']);
  assert.deepEqual(modal.classList.added, ['hidden', 'hidden', 'hidden']);
});

test('QuestUiController keeps intro modal hidden by default until explicitly opened', () => {
  const controller = new QuestUiController(createElement(), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
  const modal = controller['introModal'];

  assert.deepEqual(modal.classList.added, ['hidden']);
  assert.deepEqual(modal.classList.removed, []);
});

test('QuestUiController renders completion styling and checkmark for completed quest nodes', () => {
  const controller = new QuestUiController(createElement(), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });
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
    const controller = new QuestUiController(createElement(), createElement(), createElement(), createElement(), createElement(), { onLocationClick: () => false });

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
