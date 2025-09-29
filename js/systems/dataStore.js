const STORAGE_KEY = 'towerDefenseGameState';

function getDataClient() {
    const root = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const dataClient = root?.CrazyGames?.SDK?.data;
    if (!dataClient) {
        return null;
    }
    return dataClient;
}

export function loadGameState() {
    const client = getDataClient();
    if (!client) {
        return null;
    }
    try {
        const raw = client.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to load CrazyGames save data:', error);
        return null;
    }
}

export function saveGameState(state) {
    const client = getDataClient();
    if (!client) {
        return false;
    }
    try {
        const payload = JSON.stringify(state);
        client.setItem(STORAGE_KEY, payload);
        return true;
    } catch (error) {
        console.error('Failed to save CrazyGames data:', error);
        return false;
    }
}

export function clearGameState() {
    const client = getDataClient();
    if (!client) {
        return false;
    }
    try {
        client.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Failed to clear CrazyGames data:', error);
        return false;
    }
}
