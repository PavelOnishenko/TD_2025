import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMapRenderer from '../../dist/systems/world/WorldMapRenderer.js';
import { createMockCanvasContext } from '../helpers/testUtils.js';

test('WorldMapRenderer draws named location landmarks and labels for discovered quest locations', () => {
  const originalPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    roundRect() {}
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    closePath() {}
    arc() {}
    ellipse() {}
    rect() {}
  };

  const renderer = new WorldMapRenderer();
  const ctx = createMockCanvasContext();
  ctx.save = () => ctx.calls.push(['save']);
  ctx.restore = () => ctx.calls.push(['restore']);
  ctx.setLineDash = (...args) => ctx.calls.push(['setLineDash', ...args]);
  const cell = { x: 16, y: 24, width: 40, height: 40 };

  try {
    renderer.drawNamedLocation(ctx, cell, 'Cleaver', 'grass', { emphasized: true, showLabel: true });
  } finally {
    globalThis.Path2D = originalPath2D;
  }

  assert.ok(ctx.calls.some(call => call[0] === 'fillText' && call[1] === 'Cleaver'));
  assert.ok(ctx.calls.some(call => call[0] === 'stroke'));
  assert.ok(ctx.calls.some(call => call[0] === 'fill'));
});
