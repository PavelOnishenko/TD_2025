import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMap from '../../dist/systems/world/WorldMap.js';
import { balanceConfig } from '../../dist/config/balanceConfig.js';
import { theme } from '../../dist/config/ThemeConfig.js';
import { createMockCanvasContext, withMockedRandom } from '../helpers/testUtils.js';

function placePlayerAt(worldMap, col, row) {
  const state = worldMap.getState();
  delete state.viewport;
  worldMap.restoreState({
    ...state,
    playerGridPos: { col, row },
    visitedCells: [`${col},${row}`],
  });
}

test('WorldMap starts the player in a random traversable cell and exposes pixel position', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(100, 100, 20);
  const state = worldMap.getState();
  const terrain = worldMap.terrainData.get(`${state.playerGridPos.col},${state.playerGridPos.row}`);
  const [x, y] = worldMap.getPlayerPixelPosition();

  assert.equal(terrain.type === 'water', false);
  assert.equal(terrain.type === 'mountain', false);
  assert.equal(Number.isFinite(x), true);
  assert.equal(Number.isFinite(y), true);
  assert.notDeepEqual(state.playerGridPos, { col: 50, row: 50 });
}));

test('WorldMap generates villages before placing the player into the world', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const state = worldMap.getState();

  assert.equal(state.villages.includes(`${state.playerGridPos.col},${state.playerGridPos.row}`), false);
}));

test('WorldMap uses a different persistent seed for each new world generation', () => withMockedRandom([0.11, 0.25], () => {
  const firstWorld = new WorldMap(24, 18, 20);
  const secondWorld = new WorldMap(24, 18, 20);

  assert.notEqual(firstWorld.getState().worldSeed, secondWorld.getState().worldSeed);
  assert.notDeepEqual(firstWorld.terrainData.get('0,0'), secondWorld.terrainData.get('0,0'));
}));

test('WorldMap restoreState regenerates terrain from the saved world seed', () => withMockedRandom([0.15, 0.82], () => {
  const originalWorld = new WorldMap(24, 18, 20);
  const savedState = originalWorld.getState();

  const restoredWorld = new WorldMap(24, 18, 20);
  restoredWorld.restoreState(savedState);

  assert.deepEqual(restoredWorld.getState().worldSeed, savedState.worldSeed);
  assert.deepEqual(restoredWorld.terrainData.get('1,1'), originalWorld.terrainData.get('1,1'));
  assert.deepEqual(restoredWorld.terrainData.get('8,6'), originalWorld.terrainData.get('8,6'));
}));

test('WorldMap movePlayer handles blocked and valid moves', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

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
  placePlayerAt(worldMap, 6, 4);

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
  assert.deepEqual(worldMap.movePlayer('right'), { moved: true, isPreviouslyDiscovered: false });
});

test('WorldMap movePlayer allows diagonal travel across corner-only connections', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

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
});

test('WorldMap marks revisited cells as previously discovered', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

  worldMap.terrainData.set('6,3', { ...worldMap.terrainData.get('6,3'), type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain' });
  worldMap.terrainData.set('6,4', { ...worldMap.terrainData.get('6,4'), type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain' });
  worldMap.movePlayer('up');
  worldMap.movePlayer('down');

  const result = worldMap.movePlayer('up');
  assert.equal(result.moved, true);
  assert.equal(result.isPreviouslyDiscovered, true);
});

test('WorldMap applies terrain-based line of sight rules', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);
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

    worldMap.restoreState({ ...worldMap.getState(), playerGridPos: { col: 6, row: 4 } });

    assert.equal(worldMap.isCellVisible(7, 4), false);
    assert.equal(worldMap.isCellVisible(8, 4), false);
    assert.equal(worldMap.isCellVisible(6, 3), true);
    assert.equal(worldMap.isCellVisible(6, 2), false);
    assert.equal(worldMap.isCellVisible(5, 4), true);
  } finally {
    balanceConfig.worldMap.visibilityRadius = originalRadius;
  }
});

test('WorldMap supports zooming and scrolling for large maps', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);

  const viewportBefore = worldMap.getState().viewport;
  const [beforeX] = worldMap.getPlayerPixelPosition();

  assert.equal(worldMap.zoomIn(), true);
  assert.equal(worldMap.pan('right'), true);

  const viewportAfter = worldMap.getState().viewport;
  const [afterX] = worldMap.getPlayerPixelPosition();

  assert.ok(viewportAfter.cellSize > viewportBefore.cellSize);
  assert.notEqual(afterX, beforeX);
});

test('WorldMap can center the viewport back on the player after panning', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  worldMap.centerOnPlayer();

  const centeredViewport = worldMap.getState().viewport;
  worldMap.pan('right');
  worldMap.centerOnPlayer();
  const reCenteredViewport = worldMap.getState().viewport;

  assert.deepEqual(reCenteredViewport, centeredViewport);
});

test('WorldMap supports developer map display combinations for full reveal and fog-free exploration', () => {
  const worldMap = new WorldMap(12, 9, 20);
  placePlayerAt(worldMap, 6, 4);
  worldMap.selectedGridPos = { col: 0, row: 0 };

  assert.equal(worldMap.getSelectedCellInfo()?.fogState, 'unknown');

  worldMap.setMapDisplayConfig({ fogOfWar: false });
  assert.equal(worldMap.getSelectedCellInfo()?.fogState, 'hidden');

  worldMap.setMapDisplayConfig({ everythingDiscovered: true });
  assert.equal(worldMap.getSelectedCellInfo()?.fogState, 'discovered');
});

test('WorldMap exposes selected cell info from mouse position after viewport transforms', () => {
  const worldMap = new WorldMap(12, 9, 20);
  placePlayerAt(worldMap, 6, 4);
  worldMap.resizeToCanvas(480, 360);
  worldMap.zoomIn();

  const [x, y] = worldMap.getPlayerPixelPosition();
  worldMap.updateSelectedCellFromPixel(x, y);

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
});

test('WorldMap draw renders visible terrain, fog and grid without throwing on a 100x100 map', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  const ctx = createMockCanvasContext();

  worldMap.draw(ctx, null);

  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fillText'));
  assert.ok(ctx.calls.some(c => c[0] === 'stroke'));
});


test('WorldMap draw switches to low-detail rendering when zoomed out with fog disabled', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.min);
  worldMap.resizeToCanvas(720, 720);
  worldMap.setMapDisplayConfig({ fogOfWar: false });
  const ctx = createMockCanvasContext();
  const detailLevels = new Set();
  let drawGridCalled = false;
  const originalDrawCell = worldMap.renderer.drawCell.bind(worldMap.renderer);
  const originalDrawGrid = worldMap.renderer.drawGrid.bind(worldMap.renderer);

  worldMap.renderer.drawCell = (drawCtx, cell, fogState, terrain, neighbors, options) => {
    detailLevels.add(options?.detailLevel);
    return originalDrawCell(drawCtx, cell, fogState, terrain, neighbors, options);
  };
  worldMap.renderer.drawGrid = (...args) => {
    drawGridCalled = true;
    return originalDrawGrid(...args);
  };

  worldMap.draw(ctx, null);

  assert.deepEqual([...detailLevels], ['low']);
  assert.equal(drawGridCalled, false);
  assert.ok(ctx.calls.some((call) => call[0] === 'fillRect'));
});

test('WorldMap exposes village names and anchors matching quest locations to village tiles', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const state = worldMap.getState();
  const [villageCol, villageRow] = state.villages[0].split(',').map(Number);
  const villageName = worldMap.getAllVillageNames().find((name) => worldMap['findVillagePositionByName'](name)?.col === villageCol && worldMap['findVillagePositionByName'](name)?.row === villageRow);

  assert.ok(villageName);

  worldMap.registerNamedLocation(villageName);
  worldMap.setMapDisplayConfig({ everythingDiscovered: true });
  worldMap.restoreState({ ...state, playerGridPos: { col: villageCol, row: villageRow }, visitedCells: [`${villageCol},${villageRow}`] });

  assert.equal(worldMap.getCurrentNamedLocation(), villageName);
  assert.equal(worldMap.revealNamedLocation(villageName), true);
}));
