import test from 'node:test';
import assert from 'node:assert/strict';
import { bindUI } from '../js/systems/ui.js';
import { DEFAULT_TUTORIAL_STEPS } from '../js/systems/tutorial.js';

function createButtonStub() {
  return {
    disabled: false,
    addEventListener: () => {},
  };
}

test('bindUI attaches HUD and tutorial tip when available', () => {
  const hiddenClasses = new Set(['hidden']);
  const tutorialClassList = {
    add: cls => hiddenClasses.add(cls),
    remove: cls => hiddenClasses.delete(cls),
  };
  const elements = {
    lives: { textContent: '', addEventListener: () => {} },
    energy: { textContent: '', addEventListener: () => {} },
    wave: { textContent: '' },
    status: { textContent: '' },
    nextWave: createButtonStub(),
    restart: createButtonStub(),
    tutorialTip: { textContent: '', classList: tutorialClassList },
  };
  const doc = {
    getElementById: id => elements[id],
  };
  const game = {
    canvas: {
      addEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    },
    towers: [],
    grid: { resetCells: () => {}, fadeHighlights: () => {} },
    lives: 5,
    energy: 20,
    wave: 1,
    maxWaves: 10,
    towerCost: 10,
    getAllCells: () => [],
    switchTowerColor: () => false,
    startWave: () => {},
  };
  global.document = doc;
  bindUI(game);

  assert.equal(game.livesEl, elements.lives);
  assert.equal(game.energyEl, elements.energy);
  assert.equal(game.tutorialTipEl, elements.tutorialTip);
  assert.ok(game.tutorial);
  assert.equal(elements.tutorialTip.textContent, '');
  assert.ok(hiddenClasses.has('hidden'));

  game.tutorial.start();
  assert.equal(elements.tutorialTip.textContent, DEFAULT_TUTORIAL_STEPS[0].text);
  assert.ok(!hiddenClasses.has('hidden'));

  delete global.document;
});
