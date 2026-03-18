import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../../dist/entities/Skeleton.js';
import Wanderer from '../../dist/entities/Wanderer.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';

test('Enemy archetypes derive resulting stats from base stats plus shared skills', () => {
  const zombie = new Skeleton(0, 0, balanceConfig.enemies.zombie);
  const ninja = new Skeleton(0, 0, balanceConfig.enemies.ninja);

  assert.equal(zombie.baseStats.hp, balanceConfig.creatureArchetypes.zombie.baseStats.hp);
  assert.equal(zombie.skills.vitality, balanceConfig.creatureArchetypes.zombie.skills.vitality);
  assert.equal(zombie.maxHp, 7);
  assert.equal(zombie.damage, 1);

  assert.equal(ninja.maxHp, 5);
  assert.equal(ninja.damage, 3);
  assert.equal(ninja.avoidChance > 0, true);
});

test('Wanderers use the human base profile and gain derived stats from their skill rolls', () => {
  const wanderer = new Wanderer(2, []);
  const totalSkills = Object.values(wanderer.skills).reduce((sum, value) => sum + value, 0);

  assert.deepEqual(wanderer.baseStats, balanceConfig.creatureArchetypes.human.baseStats);
  assert.equal(totalSkills, 10);
  assert.equal(wanderer.maxHp >= wanderer.baseStats.hp, true);
  assert.equal(wanderer.maxMana >= wanderer.baseStats.mana, true);
});
