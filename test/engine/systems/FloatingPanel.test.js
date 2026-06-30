import test from 'node:test';
import assert from 'node:assert/strict';

import {
  enableFloatingPanel,
  FLOATING_PANEL_CLASS,
  FLOATING_PANEL_DRAG_HANDLE_CLASS,
  FLOATING_PANEL_DRAGGING_CLASS,
} from '../../../engine/systems/FloatingPanel.js';

function createClassList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

function createElement({ left = 0, top = 0, width = 320, height = 220 } = {}) {
  return {
    dataset: {},
    listeners: {},
    classList: createClassList(),
    style: {
      resize: '',
      overflow: '',
      minWidth: '',
      minHeight: '',
      zIndex: '',
      values: new Map(),
      setProperty(name, value) { this.values.set(name, value); },
      transform: '',
    },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    removeEventListener(type) { delete this.listeners[type]; },
    setPointerCapture(pointerId) { this.capturedPointerId = pointerId; },
    getBoundingClientRect() {
      return { left, top, width, height, right: left + width, bottom: top + height };
    },
  };
}

test('enableFloatingPanel applies RGFN-style panel classes and native resize affordance', () => {
  const panel = createElement();
  const header = createElement();

  enableFloatingPanel(panel, { dragHandle: header, minWidth: 260, minHeight: 180 });

  assert.equal(panel.classList.contains(FLOATING_PANEL_CLASS), true);
  assert.equal(header.classList.contains(FLOATING_PANEL_DRAG_HANDLE_CLASS), true);
  assert.equal(panel.style.resize, 'both');
  assert.equal(panel.style.overflow, 'auto');
  assert.equal(panel.style.minWidth, '260px');
  assert.equal(panel.style.minHeight, '180px');
});

test('enableFloatingPanel drags a panel from the header using pointer movement offsets', () => {
  const panel = createElement();
  const header = createElement();
  let prevented = false;

  enableFloatingPanel(panel, { dragHandle: header, nextZIndex: () => 41 });

  header.listeners.pointerdown({
    button: 0,
    pointerId: 7,
    clientX: 100,
    clientY: 80,
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.equal(header.capturedPointerId, 7);
  assert.equal(panel.classList.contains(FLOATING_PANEL_DRAGGING_CLASS), true);
  assert.equal(panel.style.zIndex, '41');

  header.listeners.pointermove({ clientX: 135, clientY: 118 });

  assert.equal(panel.dataset.offsetX, '35');
  assert.equal(panel.dataset.offsetY, '38');
  assert.equal(panel.style.values.get('--panel-offset-x'), '35px');
  assert.equal(panel.style.values.get('--panel-offset-y'), '38px');
  assert.equal(panel.style.transform, 'translate(var(--panel-offset-x, 0px), var(--panel-offset-y, 0px))');

  header.listeners.pointerup();

  assert.equal(panel.classList.contains(FLOATING_PANEL_DRAGGING_CLASS), false);
  assert.equal(header.listeners.pointermove, undefined);
});

test('enableFloatingPanel leaves the bottom-right corner for native resize', () => {
  const panel = createElement({ width: 320, height: 220 });
  const header = createElement();

  enableFloatingPanel(panel, { dragHandle: header, borderDrag: true });

  panel.listeners.pointerdown({
    button: 0,
    pointerId: 8,
    clientX: 318,
    clientY: 218,
    preventDefault() {
      throw new Error('resize corner should not begin panel drag');
    },
  });

  assert.equal(panel.classList.contains(FLOATING_PANEL_DRAGGING_CLASS), false);
  assert.equal(panel.dataset.offsetX, undefined);
  assert.equal(panel.listeners.pointermove, undefined);
});

test('enableFloatingPanel can start rescue dragging from panel borders outside the resize corner', () => {
  const panel = createElement({ width: 320, height: 220 });
  const header = createElement();

  enableFloatingPanel(panel, { dragHandle: header, borderDrag: true });

  panel.listeners.pointerdown({
    button: 0,
    pointerId: 9,
    clientX: 4,
    clientY: 100,
    preventDefault() {},
  });
  panel.listeners.pointermove({ clientX: 24, clientY: 112 });

  assert.equal(panel.dataset.offsetX, '20');
  assert.equal(panel.dataset.offsetY, '12');
});
