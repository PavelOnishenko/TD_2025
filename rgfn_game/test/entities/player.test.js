import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/Player.js';
import Item from '../../dist/entities/Item.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { levelConfig } from '../../dist/config/levelConfig.js';

test('Player initializes with base combat stats', () => {
  const player = new Player(0, 0);

  assert.equal(player.maxHp, balanceConfig.player.baseHp);
  assert.equal(player.damage, balanceConfig.player.baseDamage);
  assert.equal(player.armor, balanceConfig.player.baseArmor);
  assert.equal(player.level, 1);
});

test('Player takeDamage applies armor and minimum damage rule', () => {
  const player = new Player(0, 0);
  player.toughness = 6;
  player.updateStats(); // armor = 2

  player.takeDamage(1);
  assert.equal(player.hp, player.maxHp - 1);

  player.takeDamage(5);
  assert.equal(player.hp, player.maxHp - 4);
});

test('Player addXp levels up, grants skill points and carries overflow XP', () => {
  const player = new Player(0, 0);
  player.hp = 1;

  const leveled = player.addXp(player.xpToNextLevel + 2);

  assert.equal(leveled, true);
  assert.equal(player.level, 2);
  assert.equal(player.skillPoints, levelConfig.skillPointsPerLevel);
  assert.equal(player.xp, 2);
  assert.equal(player.hp, player.maxHp);
});

test('Player addStat succeeds only with enough skill points and updates stats', () => {
  const player = new Player(0, 0);

  assert.equal(player.addStat('strength'), false);

  player.skillPoints = 2;
  const success = player.addStat('strength', 2);

  assert.equal(success, true);
  assert.equal(player.strength, 2);
  assert.equal(player.skillPoints, 0);
  assert.equal(player.damage, balanceConfig.player.baseDamage + 1);
});

test('Player inventory auto-equips discovered weapons and keeps non-weapons unequipped', () => {
  const player = new Player(0, 0);
  const armor = new Item({ id: 'healingPotion', name: 'Potion', description: 'Heal', type: 'consumable' });
  const bow = new Item({ id: 'bow', name: 'Bow', description: 'Ranged', type: 'weapon', attackRange: 3 });

  player.addItemToInventory(armor);
  assert.equal(player.hasWeapon(), false);
  assert.equal(player.getAttackRange(), 1);

  player.addItemToInventory(bow);
  assert.equal(player.hasWeapon(), true);
  assert.equal(player.getAttackRange(), 3);
});
