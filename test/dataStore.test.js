import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { loadGameState, saveGameState, clearGameState, loadBestScore, saveBestScore } from '../js/systems/dataStore.js';

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

function trackConsoleErrors() {
    const calls = [];
    console.error = (...args) => {
        calls.push(args);
    };
    return calls;
}

const originalConsoleError = console.error;

beforeEach(() => {
    delete globalThis.CrazyGames;
    delete globalThis.localStorage;
});

afterEach(() => {
    console.error = originalConsoleError;
    delete globalThis.localStorage;
});

function createLocalStorage() {
    const store = new Map();
    return {
        store,
        getItem: key => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
            store.set(key, value);
        },
        removeItem: key => {
            store.delete(key);
        },
    };
}

test('loadGameState returns null when CrazyGames data client is missing', () => {
    assert.equal(loadGameState(), null);
});

test('loadGameState returns null when stored value is empty', () => {
    const client = createDataClient();
    globalThis.CrazyGames = { SDK: { data: client } };
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
    const calls = trackConsoleErrors();
    const result = loadGameState();
    assert.equal(result, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'Failed to load CrazyGames save data:');
    assert.ok(calls[0][1] instanceof Error);
});

test('saveGameState writes JSON string payload when client is available', () => {
    const client = createDataClient();
    globalThis.CrazyGames = { SDK: { data: client } };
    const result = saveGameState({ wave: 5, lives: 2 });
    assert.equal(result, true);
    assert.deepEqual(JSON.parse(client.store.get('towerDefenseGameState')), { wave: 5, lives: 2 });
});

test('saveGameState returns false when CrazyGames data client is missing', () => {
    assert.equal(saveGameState({ wave: 1 }), false);
});

test('saveGameState returns false when serialization fails', () => {
    const client = createDataClient({ setItem: () => { throw new Error('boom'); } });
    globalThis.CrazyGames = { SDK: { data: client } };
    const calls = trackConsoleErrors();
    const result = saveGameState({ foo: 'bar' });
    assert.equal(result, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'Failed to save CrazyGames data:');
    assert.ok(calls[0][1] instanceof Error);
});

test('clearGameState removes persisted value and reports outcome', () => {
    const client = createDataClient();
    client.setItem('towerDefenseGameState', JSON.stringify({ wave: 9 }));
    globalThis.CrazyGames = { SDK: { data: client } };
    assert.equal(clearGameState(), true);
    assert.equal(client.store.has('towerDefenseGameState'), false);
});

test('clearGameState returns false when CrazyGames data client is missing', () => {
    assert.equal(clearGameState(), false);
});

test('clearGameState returns false when client throws', () => {
    const client = createDataClient({ removeItem: () => { throw new Error('nope'); } });
    globalThis.CrazyGames = { SDK: { data: client } };
    const calls = trackConsoleErrors();
    const result = clearGameState();
    assert.equal(result, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'Failed to clear CrazyGames data:');
    assert.ok(calls[0][1] instanceof Error);
});

test('loadBestScore returns 0 when no storage is available', () => {
    assert.equal(loadBestScore(), 0);
});

test('saveBestScore writes to CrazyGames storage when available', () => {
    const client = createDataClient();
    globalThis.CrazyGames = { SDK: { data: client } };
    const result = saveBestScore(327);
    assert.equal(result, true);
    assert.equal(client.store.get('towerDefenseBestScore'), '327');
    assert.equal(loadBestScore(), 327);
});

test('best score falls back to localStorage when CrazyGames is missing', () => {
    const localStorage = createLocalStorage();
    globalThis.localStorage = localStorage;
    assert.equal(saveBestScore(1285), true);
    assert.equal(localStorage.store.get('towerDefenseBestScore'), '1285');
    assert.equal(loadBestScore(), 1285);
});

test('loadBestScore handles invalid stored values gracefully', () => {
    const localStorage = createLocalStorage();
    localStorage.setItem('towerDefenseBestScore', 'not-a-number');
    globalThis.localStorage = localStorage;
    const calls = trackConsoleErrors();
    assert.equal(loadBestScore(), 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'Failed to load best score:');
    assert.ok(calls[0][1] instanceof Error);
});
