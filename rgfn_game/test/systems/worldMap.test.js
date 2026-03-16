import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMap from '../../dist/systems/world/WorldMap.js';
import { theme } from '../../dist/config/ThemeConfig.js';
import { createMockCanvasContext } from '../helpers/testUtils.js';

test('WorldMap starts player in center cell and exposes pixel position', () => {
  const worldMap = new WorldMap(5, 5, 20);

  const [x, y] = worldMap.getPlayerPixelPosition();
  assert.deepEqual([x, y], [50, 50]);
});

test('WorldMap movePlayer handles blocked and valid moves', () => {
  const worldMap = new WorldMap(3, 3, 10);

  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: false, isPreviouslyDiscovered: false });
});

test('WorldMap marks revisited cells as previously discovered', () => {
  const worldMap = new WorldMap(5, 5, 10);

  worldMap.movePlayer('up');
  worldMap.movePlayer('down');

  const result = worldMap.movePlayer('up');
  assert.equal(result.moved, true);
  assert.equal(result.isPreviouslyDiscovered, true);
});

test('WorldMap draw renders terrain, fog and grid without throwing', () => {
  const worldMap = new WorldMap(4, 4, 16);
  const ctx = createMockCanvasContext();

  worldMap.draw(ctx, null);

  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fillText'));
  assert.ok(ctx.calls.some(c => c[0] === 'stroke'));
});


test('WorldMap drawGrid aligns to grid offsets after canvas resize and theme offsets', () => {
  const worldMap = new WorldMap(4, 4, 16);
  const ctx = createMockCanvasContext();

  const originalX = theme.worldMap.gridOffset.x;
  const originalY = theme.worldMap.gridOffset.y;
  theme.worldMap.gridOffset.x = 2;
  theme.worldMap.gridOffset.y = 3;

  try {
    worldMap.resizeToCanvas(102, 102);
    worldMap.draw(ctx, null);
  } finally {
    theme.worldMap.gridOffset.x = originalX;
    theme.worldMap.gridOffset.y = originalY;
  }

  const moveToCalls = ctx.calls.filter(c => c[0] === 'moveTo');
  assert.ok(moveToCalls.some(c => c[1] === 3 && c[2] === 4));
});
