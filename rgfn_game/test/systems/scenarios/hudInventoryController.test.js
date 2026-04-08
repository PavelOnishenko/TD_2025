import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../../dist/entities/player/Player.js';
import Item from '../../../dist/entities/Item.js';
import HudInventoryController from '../../../dist/systems/hud/HudInventoryController.js';

function createClassList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

function createElement() {
  return {
    textContent: '',
    title: '',
    disabled: false,
    draggable: false,
    className: '',
    classList: createClassList(),
    children: [],
    listeners: {},
    setAttribute() {},
    appendChild(child) { this.children.push(child); },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    dispatch(type, payload = {}) {
      const handler = this.listeners[type];
      if (handler) {
        handler(payload);
      }
    },
    set innerHTML(_value) { this.children = []; },
    get innerHTML() { return ''; },
  };
}

test('HudInventoryController keeps the dragged item identity when inventory order changes', () => {
  const originalDocument = global.document;
  global.document = { createElement: () => createElement() };

  try {
    const player = new Player(0, 0);
    const knifePlusOne = new Item({ id: 'knife', name: 'Knife +1', description: 'Light blade', type: 'weapon', handsRequired: 1, damageBonus: 1, requirements: { agility: 0, strength: 0 } });
    const knifePlusFour = new Item({ id: 'knife', name: 'Knife +4', description: 'Light blade', type: 'weapon', handsRequired: 1, damageBonus: 4, requirements: { agility: 0, strength: 0 } });
    player.addItemToInventory(knifePlusOne);
    player.addItemToInventory(knifePlusFour);

    const hudElements = {
      inventoryCount: createElement(),
      inventoryCapacity: createElement(),
      inventoryCapacityHint: createElement(),
      undoLastDropBtn: createElement(),
      inventoryGrid: createElement(),
    };
    let draggedIndex = null;

    const controller = new HudInventoryController(
      player,
      hudElements,
      () => {},
      () => {},
      () => {},
      () => draggedIndex,
      (nextIndex) => { draggedIndex = nextIndex; },
    );

    controller.renderInventoryAndMeta();

    const draggedSlot = hudElements.inventoryGrid.children[1];
    draggedSlot.dispatch('dragstart');

    player.removeInventoryItemAt(0);

    const dragged = controller.getDraggedInventoryItem();
    assert.equal(dragged.item, knifePlusFour);
    assert.equal(dragged.index, 0);
  } finally {
    global.document = originalDocument;
  }
});
