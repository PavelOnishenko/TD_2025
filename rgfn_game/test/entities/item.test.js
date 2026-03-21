import test from 'node:test';
import assert from 'node:assert/strict';

import Item, { BOW_ITEM } from '../../dist/entities/Item.js';

test('Item defaults attack range to 1 when omitted', () => {
  const item = new Item({ id: 'test-dagger', name: 'Dagger', description: 'Small blade', type: 'weapon' });

  assert.equal(item.attackRange, 1);
});

test('BOW_ITEM data can build an item with range 2', () => {
  const bow = new Item(BOW_ITEM);

  assert.equal(bow.name, 'Bow');
  assert.equal(bow.attackRange, 2);
  assert.equal(bow.handsRequired, 2);
});
