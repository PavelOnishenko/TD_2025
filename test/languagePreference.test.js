import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLanguagePreference, saveLanguagePreference } from '../js/systems/dataStore.js';

function createStorageStub() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
    };
}

test('language preference roundtrip persists normalized value', () => {
    const originalStorage = globalThis.localStorage;
    globalThis.localStorage = createStorageStub();
    try {
        assert.equal(loadLanguagePreference(), null);
        assert.equal(saveLanguagePreference('  RU  '), true);
        assert.equal(loadLanguagePreference(), 'ru');
        assert.equal(saveLanguagePreference(''), true);
        assert.equal(loadLanguagePreference(), null);
    } finally {
        if (originalStorage === undefined) {
            delete globalThis.localStorage;
        }
        else {
            globalThis.localStorage = originalStorage;
        }
    }
});

test('language preference gracefully handles missing storage', () => {
    const originalStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
        assert.equal(saveLanguagePreference('en'), false);
        assert.equal(loadLanguagePreference(), null);
    } finally {
        if (originalStorage === undefined) {
            delete globalThis.localStorage;
        }
        else {
            globalThis.localStorage = originalStorage;
        }
    }
});
