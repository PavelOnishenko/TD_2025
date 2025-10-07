import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { loadGameState, saveGameState, clearGameState } from '../js/systems/dataStore.js';

function createDataClient(overrides = {}) {
    const store = new Map();
    return {
        store,
        getItem: overrides.getItem ?? ((key) => store.get(key) ?? null),
        setItem: overrides.setItem ?? ((key, value) => {
            store.set(key, value);
        }),
        removeItem: overrides.removeItem ?? ((key) => {
            store.delete(key);
        }),
    };
}

beforeEach(() => {
    delete globalThis.CrazyGames;
});

test('loadGameState returns null when CrazyGames data client is missing', () => {
    assert.equal(loadGameState(), null);
});

test('loadGameState parses stored JSON payload', () => {
    const client = createDataClient();
    client.setItem('towerDefenseGameState', JSON.stringify({ wave: 3 }));
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.deepEqual(loadGameState(), { wave: 3 });
});

test('loadGameState swallows JSON errors and returns null', () => {
    const client = createDataClient({ getItem: () => 'not-json' });
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.equal(loadGameState(), null);
});

test('saveGameState writes JSON string payload when client is available', () => {
    const client = createDataClient();
    globalThis.CrazyGames = { SDK: { data: client } };
    const result = saveGameState({ wave: 5, lives: 2 });
    assert.equal(result, true);
    assert.deepEqual(JSON.parse(client.store.get('towerDefenseGameState')), { wave: 5, lives: 2 });
});

test('saveGameState returns false when serialization fails', () => {
    const client = createDataClient({ setItem: () => { throw new Error('boom'); } });
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.equal(saveGameState({ foo: 'bar' }), false);
});

test('clearGameState removes persisted value and reports outcome', () => {
    const client = createDataClient();
    client.setItem('towerDefenseGameState', JSON.stringify({ wave: 9 }));
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.equal(clearGameState(), true);
    assert.equal(client.store.has('towerDefenseGameState'), false);
});

test('clearGameState returns false when client throws', () => {
    const client = createDataClient({ removeItem: () => { throw new Error('nope'); } });
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.equal(clearGameState(), false);
});
