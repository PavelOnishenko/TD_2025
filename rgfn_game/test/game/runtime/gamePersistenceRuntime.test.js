import test from 'node:test';
import assert from 'node:assert/strict';

import GamePersistenceRuntime from '../../../dist/game/runtime/GamePersistenceRuntime.js';

function createLocalStorage(seed = {}) {
  const storage = new Map(Object.entries(seed));
  return {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)); },
    removeItem: (key) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  };
}

test('GamePersistenceRuntime roundtrip keeps world simulation snapshot without losses', () => {
  global.window = { localStorage: createLocalStorage() };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);

  const worldMapState = { fog: { discovered: ['A1', 'B2'] }, playerCell: { x: 12, y: 9 } };
  const playerState = { name: 'Test Wanderer', hp: 15 };
  const spellLevels = { fireball: 2, shield: 1 };
  const worldSimulation = {
    npcs: [{ id: 'npc.1', village: 'Stonefield' }],
    monsters: [{ id: 'monster.3', biome: 'swamp' }],
    conflicts: [{ id: 'conflict.2', type: 'raid' }],
    factionControl: { Stonefield: 'guild_of_dawn' },
    debugCounter: 42,
  };

  const worldMap = {
    getState: () => worldMapState,
    restoreState: (state) => { worldMap.restored = state; },
    getPlayerPixelPosition: () => [320, 224],
    restored: null,
  };
  const player = {
    getState: () => playerState,
    restoreState: (state) => { player.restored = state; },
    x: 0,
    y: 0,
    restored: null,
  };
  const magicSystem = {
    getSpellLevels: () => spellLevels,
    restoreSpellLevels: (state) => { magicSystem.restored = state; },
    restored: null,
  };

  runtime.saveGameIfChanged(worldMap, player, magicSystem, null, [], { day: 4 }, worldSimulation);
  runtime.loadGame(worldMap, player, magicSystem);

  const parsed = runtime.getParsedSaveState();
  assert.equal(parsed?.version, 2);
  assert.deepEqual(parsed?.worldSimulation, worldSimulation);
  assert.deepEqual(worldMap.restored, worldMapState);
  assert.deepEqual(player.restored, playerState);
  assert.deepEqual(magicSystem.restored, spellLevels);
  assert.equal(player.x, 320);
  assert.equal(player.y, 224);

  const overview = runtime.getOverview();
  assert.equal(overview.version, 2);
  assert.equal(typeof overview.snapshotHash, 'string');
  assert.equal(typeof overview.lastSavedAt, 'string');
  assert.equal(typeof overview.lastLoadedAt, 'string');
});

test('GamePersistenceRuntime migrates legacy v1 saves and preserves npc/monster/conflict/faction-control payloads', () => {
  const legacyRaw = JSON.stringify({
    version: 1,
    worldMap: { seed: 777 },
    player: { name: 'Legacy Hero' },
    spellLevels: { fireball: 3 },
    quest: null,
    npcs: [{ id: 'npc.legacy.1' }],
    monsters: [{ id: 'monster.legacy.1' }],
    conflicts: [{ id: 'conflict.legacy.1' }],
    factionControl: { Ironhold: 'wardens' },
  });
  global.window = { localStorage: createLocalStorage({ rgfn_game_save_v1: legacyRaw }) };

  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);
  const migrated = runtime.getParsedSaveState();

  assert.equal(migrated?.version, 2);
  assert.deepEqual(migrated?.worldSimulation, {
    npcs: [{ id: 'npc.legacy.1' }],
    monsters: [{ id: 'monster.legacy.1' }],
    conflicts: [{ id: 'conflict.legacy.1' }],
    factionControl: { Ironhold: 'wardens' },
  });

  const rewritten = JSON.parse(global.window.localStorage.getItem('rgfn_game_save_v2'));
  assert.equal(rewritten.version, 2);
  assert.deepEqual(rewritten.worldSimulation, migrated.worldSimulation);
  assert.equal(runtime.getOverview().loadedVersion, 1);
});
