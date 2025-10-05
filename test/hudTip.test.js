import test from 'node:test';
import assert from 'node:assert/strict';
import { bindUI } from '../js/systems/ui.js';

test('bindUI attaches tip element with text', () => {
  const elements = {};
  const ids = ['lives','energy','wave','cooldown','status','nextWave','restart','tip'];
  for (const id of ids) {
    elements[id] = { textContent: '', addEventListener: () => {} };
  }
  elements['tip'].textContent = 'Tap slot to build. Tap tower to switch (1 energy).';
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
    switchCooldown: 0,
    towerCost: 10
  };
  global.document = doc;
  bindUI(game);
  assert.equal(game.tipEl.textContent, 'Tap slot to build. Tap tower to switch (1 energy).');
  delete global.document;
});
