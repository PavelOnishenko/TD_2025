const STORAGE_KEY = 'towerDefenseTutorialComplete';

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

interface CrazyGamesDataClient {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}

function getDataClient(): CrazyGamesDataClient | null {
    const root = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & {
        CrazyGames?: { SDK?: { data?: CrazyGamesDataClient } };
    }) : undefined;

    return root?.CrazyGames?.SDK?.data ?? null;
}

const memoryStore: StorageLike = (() => {
    let store: Record<string, string> = Object.create(null) as Record<string, string>;
    return {
        getItem(key: string): string | null {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key: string, value: string): void {
            store[key] = String(value);
        },
        removeItem(key: string): void {
            delete store[key];
        },
    };
})();

function getStorage(): StorageLike {
    const client = getDataClient();
    if (client && typeof client.getItem === 'function' && typeof client.setItem === 'function') {
        return {
            getItem: (key: string) => client.getItem(key),
            setItem: (key: string, value: string) => client.setItem(key, value),
            removeItem: (key: string) => client.removeItem?.(key),
        };
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

export function isTutorialMarkedComplete(): boolean {
    try {
        const storage = getStorage();
        return storage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
        console.warn('Failed to read tutorial progress.', error);
        return false;
    }
}

export function markTutorialComplete(): boolean {
    try {
        const storage = getStorage();
        storage.setItem(STORAGE_KEY, '1');
        return true;
    } catch (error) {
        console.warn('Failed to persist tutorial progress.', error);
        return false;
    }
}

export function clearTutorialProgress(): boolean {
    try {
        const storage = getStorage();
        storage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.warn('Failed to clear tutorial progress.', error);
        return false;
    }
}
