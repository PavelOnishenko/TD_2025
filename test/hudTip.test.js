import test from 'node:test';
import assert from 'node:assert/strict';
import { bindUI } from '../js/systems/ui.js';

test('bindUI attaches core HUD elements without tip text', () => {
  const elements = {};
  const ids = ['lives','energy','wave','status','nextWave','restart'];
  for (const id of ids) {
    elements[id] = { textContent: '', addEventListener: () => {} };
  }
  const doc = {
    getElementById: id => elements[id]
  };
  const game = {
    canvas: { addEventListener: () => {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    towers: [],
    grid: [],
    lives: 5,
    energy: 20,
    wave: 1,
    maxWaves: 10,
    towerCost: 10
  };
  global.document = doc;
  bindUI(game);
  assert.equal(game.livesEl, elements['lives']);
  assert.equal(game.energyEl, elements['energy']);
  assert.ok(!('tipEl' in game));
  delete global.document;
});
