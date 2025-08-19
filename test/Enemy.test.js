import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../src/Enemy.js';

test('isOutOfBounds detects when enemy exceeds canvas width', () => {
  const enemy = new Enemy();
  enemy.x = 280; // enemy width 30 -> 310 > 300
  assert.equal(enemy.isOutOfBounds(300), true);

  enemy.x = 100; // 100 + 30 = 130 < 300
  assert.equal(enemy.isOutOfBounds(300), false);
});
