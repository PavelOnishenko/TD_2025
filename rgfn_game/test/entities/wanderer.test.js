import test from 'node:test';
import assert from 'node:assert/strict';

import Wanderer from '../../dist/entities/Wanderer.js';
import Item from '../../dist/entities/Item.js';

function createArmor(flatArmor) {
  return new Item({ id: `armor_${flatArmor}`, name: 'Armor', description: '', type: 'armor', effects: { flatArmor } });
}

function createWeapon(id, damageBonus, handsRequired = 2) {
  return new Item({ id, name: id, description: '', type: 'weapon', damageBonus, handsRequired, requirements: {} });
}

test('Wanderer awards XP as 3 * level', () => {
  const wanderer = new Wanderer(7, []);
  assert.equal(wanderer.xpValue, 21);
});

test('Wanderer equips best available weapon and armor', () => {
  const inventory = [createWeapon('weak', 2), createWeapon('strong', 5), createArmor(1), createArmor(3)];
  const wanderer = new Wanderer(6, inventory);

  const loot = wanderer.getLootItems();
  assert.equal(loot.length, 4);
  assert.equal(wanderer.getAttackRange(), 1);
  assert.equal(wanderer.damage >= 5, true);
});

test('Wanderer magic points follow intelligence rule', () => {
  const wanderer = new Wanderer(9, []);
  assert.equal(wanderer.magicPoints, Math.floor(wanderer.intelligence / 3));
});

test('Wanderer random levels are mostly below 10', () => {
  const sampleSize = 2000;
  let lowLevels = 0;

  for (let i = 0; i < sampleSize; i++) {
    const level = Wanderer.createRandom().level;
    if (level < 10) {
      lowLevels += 1;
    }
  }

  const ratio = lowLevels / sampleSize;
  assert.equal(ratio > 0.86 && ratio < 0.94, true);
});
