import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/Player.js';
import Item from '../../dist/entities/Item.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { levelConfig } from '../../dist/config/levelConfig.js';

test('Player initializes with randomized starting allocation and name', () => {
  const player = new Player(0, 0);

  const totalAllocatedStats = player.vitality + player.toughness + player.strength + player.agility + player.connection + player.intelligence;
  assert.equal(totalAllocatedStats, balanceConfig.player.initialRandomAllocatedSkillPoints);
  assert.equal(player.armor >= balanceConfig.player.baseArmor, true);
  assert.equal(player.maxMana >= balanceConfig.player.baseMana, true);
  assert.equal(player.level, 1);
  assert.equal(player.skillPoints, balanceConfig.player.initialSkillPoints);
  assert.equal(typeof player.name, 'string');
  assert.equal(player.name.length > 0, true);
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
  assert.equal(player.skillPoints, balanceConfig.player.initialSkillPoints + levelConfig.skillPointsPerLevel);
  assert.equal(player.xp, 2);
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.mana <= player.maxMana, true);
});

test('Player addStat succeeds only with enough skill points and updates stats', () => {
  const player = new Player(0, 0);

  assert.equal(player.addStat('strength'), false);

  player.skillPoints = 2;
  const success = player.addStat('strength', 2);

  assert.equal(success, true);
  assert.equal(player.strength >= 2, true);
  assert.equal(player.skillPoints, 0);
  assert.equal(player.damage >= balanceConfig.combat.fistDamagePerHand * 2 + 1, true);
});

test('Player keeps full mana state when max mana increases', () => {
  const player = new Player(0, 0);
  player.skillPoints = 1;

  assert.equal(player.mana, player.maxMana);
  const oldMaxMana = player.maxMana;

  player.addStat('connection');

  assert.equal(player.maxMana >= oldMaxMana + 1, true);
  assert.equal(player.mana <= player.maxMana, true);
});

test('Player intelligence grants mana fraction and magic points each 3 points', () => {
  const player = new Player(0, 0);
  player.skillPoints = 3;

  player.addStat('intelligence', 3);

  assert.equal(player.intelligence >= 3, true);
  assert.equal(player.magicPoints >= 1, true);
  assert.equal(player.maxMana >= balanceConfig.player.baseMana + 1, true);
});

test('Player inventory auto-equips discovered weapons and keeps non-weapons unequipped', () => {
  const player = new Player(0, 0);
  const potion = new Item({ id: 'healingPotion', name: 'Potion', description: 'Heal', type: 'consumable' });
  const bow = new Item({ id: 'bow', name: 'Bow', description: 'Ranged', type: 'weapon', attackRange: 3, handsRequired: 2, damageBonus: 2, requirements: { agility: 0, strength: 0 }, isRanged: true });

  player.addItemToInventory(potion);
  assert.equal(player.hasWeapon(), false);
  assert.equal(player.getAttackRange(), 1);

  player.addItemToInventory(bow);
  assert.equal(player.hasWeapon(), true);
  assert.equal(player.getAttackRange(), 3);

  const armor = new Item({ id: 'armor_t1', name: 'Armor +1', description: 'Armor', type: 'armor', effects: { flatArmor: 1 } });
  player.addItemToInventory(armor);
  assert.equal(player.armor, 1);
});
