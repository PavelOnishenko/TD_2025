const STORAGE_KEY = 'towerDefenseTutorialComplete';

function getDataClient() {
    const root = typeof globalThis !== 'undefined' ? globalThis : undefined;
    return root?.CrazyGames?.SDK?.data ?? null;
}

const memoryStore = (() => {
    let store = Object.create(null);
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        removeItem(key) {
            delete store[key];
        },
    };
})();

function getStorage() {
    const client = getDataClient();
    if (client && typeof client.getItem === 'function' && typeof client.setItem === 'function') {
        return client;
    }
    const root = typeof globalThis !== 'undefined' ? globalThis : undefined;
    try {
        const storage = root?.localStorage;
        if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
            return storage;
        }
    } catch (error) {
        console.warn('Tutorial progress storage unavailable, falling back to memory store.', error);
    }
    return memoryStore;
}

export function isTutorialMarkedComplete() {
    try {
        const storage = getStorage();
        return storage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
        console.warn('Failed to read tutorial progress.', error);
        return false;
    }
}

export function markTutorialComplete() {
    try {
        const storage = getStorage();
        storage.setItem(STORAGE_KEY, '1');
        return true;
    } catch (error) {
        console.warn('Failed to persist tutorial progress.', error);
        return false;
    }
}

export function clearTutorialProgress() {
    try {
        const storage = getStorage();
        storage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.warn('Failed to clear tutorial progress.', error);
        return false;
    }
}
