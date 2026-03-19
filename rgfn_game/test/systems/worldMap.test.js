import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMap from '../../dist/systems/world/WorldMap.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { theme } from '../../dist/config/ThemeConfig.js';
import { createMockCanvasContext, withMockedRandom } from '../helpers/testUtils.js';

test('WorldMap starts player in center cell and exposes pixel position', () => {
  const worldMap = new WorldMap(12, 9, 20);

  const [x, y] = worldMap.getPlayerPixelPosition();
  assert.deepEqual([x, y], [130, 90]);
});

test('WorldMap uses a different persistent seed for each new world generation', () => withMockedRandom([0.11, 0.25], () => {
  const firstWorld = new WorldMap(12, 9, 20);
  const secondWorld = new WorldMap(12, 9, 20);

  assert.notEqual(firstWorld.getState().worldSeed, secondWorld.getState().worldSeed);
  assert.notDeepEqual(firstWorld.terrainData.get('0,0'), secondWorld.terrainData.get('0,0'));
}));

test('WorldMap restoreState regenerates terrain from the saved world seed', () => withMockedRandom([0.15, 0.82], () => {
  const originalWorld = new WorldMap(12, 9, 20);
  const savedState = originalWorld.getState();

  const restoredWorld = new WorldMap(12, 9, 20);
  restoredWorld.restoreState(savedState);

  assert.deepEqual(restoredWorld.getState().worldSeed, savedState.worldSeed);
  assert.deepEqual(restoredWorld.terrainData.get('1,1'), originalWorld.terrainData.get('1,1'));
  assert.deepEqual(restoredWorld.terrainData.get('8,6'), originalWorld.terrainData.get('8,6'));
}));

test('WorldMap movePlayer handles blocked and valid moves', () => {
  const worldMap = new WorldMap(12, 9, 10);

  ['6,3', '6,2', '6,1', '6,0'].forEach((key) => {
    const terrain = worldMap.terrainData.get(key);
    worldMap.terrainData.set(key, {
      ...terrain,
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
  });

  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: false, isPreviouslyDiscovered: false });
});

test('WorldMap movePlayer blocks walking onto water tiles', () => {
  const worldMap = new WorldMap(12, 9, 10);

  worldMap.terrainData.set('6,3', {
    ...worldMap.terrainData.get('6,3'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('7,4', {
    ...worldMap.terrainData.get('7,4'),
    type: 'grass',
    color: theme.worldMap.terrain.grass,
    pattern: 'plain',
  });

  assert.deepEqual(worldMap.movePlayer('up'), { moved: false, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.getPlayerPixelPosition(), [65, 45]);
  assert.deepEqual(worldMap.movePlayer('right'), { moved: true, isPreviouslyDiscovered: false });
});

test('WorldMap movePlayer allows diagonal travel across corner-only connections', () => {
  const worldMap = new WorldMap(12, 9, 10);

  worldMap.terrainData.set('6,3', {
    ...worldMap.terrainData.get('6,3'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('5,4', {
    ...worldMap.terrainData.get('5,4'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('5,3', {
    ...worldMap.terrainData.get('5,3'),
    type: 'grass',
    color: theme.worldMap.terrain.grass,
    pattern: 'plain',
  });

  assert.deepEqual(worldMap.movePlayer('upLeft'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.getPlayerPixelPosition(), [55, 35]);
});


test('WorldMap marks revisited cells as previously discovered', () => {
  const worldMap = new WorldMap(12, 9, 10);

  worldMap.movePlayer('up');
  worldMap.movePlayer('down');

  const result = worldMap.movePlayer('up');
  assert.equal(result.moved, true);
  assert.equal(result.isPreviouslyDiscovered, true);
});

test('WorldMap applies terrain-based line of sight rules', () => {
  const worldMap = new WorldMap(12, 9, 10);
  const originalRadius = balanceConfig.worldMap.visibilityRadius;
  balanceConfig.worldMap.visibilityRadius = 2;

  try {
    worldMap.terrainData.set('7,4', {
      ...worldMap.terrainData.get('7,4'),
      type: 'forest',
      color: theme.worldMap.terrain.forest,
      pattern: 'groves',
    });
    worldMap.terrainData.set('8,4', {
      ...worldMap.terrainData.get('8,4'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
    worldMap.terrainData.set('6,3', {
      ...worldMap.terrainData.get('6,3'),
      type: 'mountain',
      color: theme.worldMap.terrain.mountain,
      pattern: 'ridges',
    });
    worldMap.terrainData.set('6,2', {
      ...worldMap.terrainData.get('6,2'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });

    worldMap.restoreState(worldMap.getState());

    assert.equal(worldMap.isCellVisible(7, 4), false);
    assert.equal(worldMap.isCellVisible(8, 4), false);
    assert.equal(worldMap.isCellVisible(6, 3), true);
    assert.equal(worldMap.isCellVisible(6, 2), false);
    assert.equal(worldMap.isCellVisible(5, 4), true);
  } finally {
    balanceConfig.worldMap.visibilityRadius = originalRadius;
  }
});

test('WorldMap exposes selected cell info from mouse position', () => {
  const worldMap = new WorldMap(12, 9, 20);

  worldMap.updateSelectedCellFromPixel(130, 90);

  assert.deepEqual(worldMap.getSelectedCellInfo(), {
    col: 6,
    row: 4,
    terrainType: worldMap.getCurrentTerrain().type,
    fogState: 'discovered',
    isVisible: true,
    isVillage: false,
    villageName: null,
    villageStatus: null,
    isTraversable: worldMap.getCurrentTerrain().type !== 'water',
  });

  worldMap.clearSelectedCell();
  assert.equal(worldMap.getSelectedCellInfo(), null);
});



test('WorldMap exposes hovered village name and status in selected cell info', () => {
  const worldMap = new WorldMap(12, 9, 20);
  const currentPosition = worldMap.getState().playerGridPos;
  const villageKey = `${currentPosition.col},${currentPosition.row}`;

  worldMap.villages.add(villageKey);
  worldMap.updateSelectedCellFromPixel(130, 90);

  assert.deepEqual(worldMap.getSelectedCellInfo(), {
    col: currentPosition.col,
    row: currentPosition.row,
    terrainType: worldMap.getCurrentTerrain().type,
    fogState: 'discovered',
    isVisible: true,
    isVillage: true,
    villageName: worldMap.getVillageNameAtPlayerPosition(),
    villageStatus: 'current',
    isTraversable: worldMap.getCurrentTerrain().type !== 'water',
  });
});

test('WorldMap draw renders terrain, fog and grid without throwing', () => {
  const worldMap = new WorldMap(12, 9, 16);
  const ctx = createMockCanvasContext();

  worldMap.draw(ctx, null);

  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fillText'));
  assert.ok(ctx.calls.some(c => c[0] === 'stroke'));
});


test('WorldMap drawGrid aligns to grid offsets after canvas resize and theme offsets', () => {
  const worldMap = new WorldMap(12, 9, 16);
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
  assert.ok(moveToCalls.some(c => c[1] === 5 && c[2] === 18));
});

test('WorldMap draw adds diagonal terrain ribbons for corner-only neighbors', () => {
  const OriginalPath2D = globalThis.Path2D;
  let addPathCalls = 0;

  globalThis.Path2D = class Path2D {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    closePath() {}
    rect() {}
    addPath() {
      addPathCalls += 1;
    }
  };

  try {
    const worldMap = new WorldMap(12, 9, 16);
    const ctx = createMockCanvasContext();

    worldMap.terrainData.set('6,4', {
      ...worldMap.terrainData.get('6,4'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
    worldMap.terrainData.set('7,5', {
      ...worldMap.terrainData.get('7,5'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
    worldMap.terrainData.set('7,4', {
      ...worldMap.terrainData.get('7,4'),
      type: 'water',
      color: theme.worldMap.terrain.water,
      pattern: 'waves',
    });
    worldMap.terrainData.set('6,5', {
      ...worldMap.terrainData.get('6,5'),
      type: 'water',
      color: theme.worldMap.terrain.water,
      pattern: 'waves',
    });

    worldMap.restoreState(worldMap.getState());
    worldMap.draw(ctx, null);

    assert.ok(addPathCalls > 0);
  } finally {
    globalThis.Path2D = OriginalPath2D;
  }
});
