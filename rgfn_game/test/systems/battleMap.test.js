import test from 'node:test';
import assert from 'node:assert/strict';

import BattleMap from '../../dist/systems/BattleMap.js';
import { createCombatEntity, createMockCanvasContext } from '../helpers/testUtils.js';

test('BattleMap setup positions player and enemies on grid', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const enemies = [createCombatEntity('Skeleton', 0, 0, false), createCombatEntity('Zombie', 0, 0, false)];

  map.setup(player, enemies);

  assert.equal(player.gridRow, 6);
  assert.equal(enemies[0].gridRow, 1);
  assert.equal(enemies[1].gridCol - enemies[0].gridCol, 2);
});

test('BattleMap range checks use Manhattan distance', () => {
  const map = new BattleMap();
  const a = createCombatEntity('Player', 2, 2, false);
  const b = createCombatEntity('Skeleton', 2, 3, false);

  assert.equal(map.isInMeleeRange(a, b), true);
  assert.equal(map.isInAttackRange(a, b, 1), true);
  assert.equal(map.isInAttackRange(a, createCombatEntity('Skeleton', 2, 5, false), 2), false);
});

test('BattleMap movement fails when blocked and succeeds when free', () => {
  const map = new BattleMap();
  const player = createCombatEntity('Player', 0, 0, false);
  const blocker = createCombatEntity('Skeleton', 0, 0, false);
  map.setup(player, [blocker]);

  player.gridCol = 4;
  player.gridRow = 4;
  blocker.gridCol = 5;
  blocker.gridRow = 4;

  assert.equal(map.moveEntity(player, 'right'), false);
  assert.equal(map.moveEntity(player, 'left'), true);
});

test('BattleMap moveEntityToward prefers primary axis and falls back to alternate', () => {
  const map = new BattleMap();
  const mover = createCombatEntity('Skeleton', 4, 4, false);
  const target = createCombatEntity('Player', 7, 5, false);
  const blockPrimary = createCombatEntity('Zombie', 5, 4, false);

  map.setup(target, [mover, blockPrimary]);
  mover.gridCol = 4;
  mover.gridRow = 4;
  target.gridCol = 7;
  target.gridRow = 5;
  blockPrimary.gridCol = 5;
  blockPrimary.gridRow = 4;

  assert.equal(map.moveEntityToward(mover, target), true);
  assert.deepEqual([mover.gridCol, mover.gridRow], [4, 5]);
});

test('BattleMap draw paints grid and highlights selected enemy', () => {
  const map = new BattleMap();
  const ctx = createMockCanvasContext();
  const player = createCombatEntity('Player', 5, 6, false);
  const enemy = createCombatEntity('Skeleton', 5, 1, false);

  map.setup(player, [enemy]);
  map.draw(ctx, null, player, enemy);

  assert.ok(ctx.calls.some(c => c[0] === 'strokeRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
});
