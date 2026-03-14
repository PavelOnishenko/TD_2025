import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../../dist/entities/Skeleton.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { withMockedRandom, createMockCanvasContext } from '../helpers/testUtils.js';

test('Skeleton initializes from config and deactivates on death', () => {
  const skeleton = new Skeleton(0, 0, balanceConfig.enemies.zombie);

  assert.equal(skeleton.name, 'Zombie');
  assert.equal(skeleton.hp, balanceConfig.enemies.zombie.hp);

  const died = skeleton.takeDamage(999);
  assert.equal(died, true);
  assert.equal(skeleton.active, false);
});

test('Skeleton behavior checks use configured chances', () => {
  const ninja = new Skeleton(0, 0, balanceConfig.enemies.ninja);
  const knight = new Skeleton(0, 0, balanceConfig.enemies.darkKnight);
  const dragon = new Skeleton(0, 0, balanceConfig.enemies.dragon);

  withMockedRandom([0.1], () => assert.equal(ninja.shouldAvoidHit(), true));
  withMockedRandom([0.9], () => assert.equal(ninja.shouldAvoidHit(), false));

  withMockedRandom([0.2], () => assert.equal(knight.getAttackDamage(), knight.damage * 2));
  withMockedRandom([0.9], () => assert.equal(knight.getAttackDamage(), knight.damage));

  withMockedRandom([0.1], () => assert.equal(dragon.shouldPassEncounter(), true));
});

test('Skeleton draw executes correct branch and health bar drawing', () => {
  const ctx = createMockCanvasContext();
  const skeleton = new Skeleton(48, 48, balanceConfig.enemies.darkKnight);

  skeleton.draw(ctx);

  const fillRectCalls = ctx.calls.filter(c => c[0] === 'fillRect');
  assert.ok(fillRectCalls.length >= 4);
});
