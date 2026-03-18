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
  const controller = new QuestUiController(title, body, modal, intro, closeBtn);
  const quest = {
    id: 'main',
    title: 'Signal Dawn',
    description: 'Complete every branch of this quest tree to prove your character can end the darkness over the region.',
    conditionText: 'All child objectives are completed.',
    objectiveType: 'scout',
    children: [{
      id: 'main.1',
      title: 'Escort Mira Vale',
      description: 'Guide Mira Vale through danger and reach Fog Chapel.',
      conditionText: 'Arrive at Fog Chapel with Mira Vale alive.',
      objectiveType: 'escort',
      children: [],
    }],
  };

  controller.renderQuest(quest);

  assert.equal(title.textContent, 'Main Quest: Signal Dawn');
  assert.equal(body.innerHTML.includes('Complete every branch'), false);
  assert.equal(body.innerHTML.includes('Condition: All child objectives are completed.'), false);
  assert.equal(body.innerHTML.includes('Escort Mira Vale'), true);
  assert.equal(body.innerHTML.includes('Arrive at Fog Chapel with Mira Vale alive.'), true);
});

test('QuestUiController opens and closes the intro modal through bound events', () => {
  const controller = new QuestUiController(createElement(), createElement(), createElement(), createElement(), createElement());
  const modal = controller['introModal'];
  const closeBtn = controller['introCloseBtn'];

  controller.showIntro();
  closeBtn.listeners.click();
  modal.listeners.click({ target: modal });

  assert.deepEqual(modal.classList.removed, ['hidden']);
  assert.deepEqual(modal.classList.added, ['hidden', 'hidden']);
});
