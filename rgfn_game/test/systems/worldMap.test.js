import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMap from '../../dist/systems/WorldMap.js';
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
