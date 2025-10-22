const STORAGE_KEY = 'towerDefenseGameState';
const BEST_SCORE_KEY = 'towerDefenseBestScore';

function getDataClient() {
    const root = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const dataClient = root?.CrazyGames?.SDK?.data;
    if (!dataClient) {
        return null;
    }
    return dataClient;
}

function getLocalStorage() {
    const root = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const storage = root?.localStorage ?? null;
    if (!storage) {
        return null;
    }
    const hasMethods = typeof storage.getItem === 'function'
        && typeof storage.setItem === 'function'
        && typeof storage.removeItem === 'function';
    return hasMethods ? storage : null;
}

function getScoreStorage() {
    return getDataClient() ?? getLocalStorage();
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

function toScoreValue(score) {
    const numeric = Number(score);
    if (!Number.isFinite(numeric)) {
        throw new Error('Invalid score value');
    }
    return Math.max(0, Math.floor(numeric));
}

export function loadBestScore() {
    const storage = getScoreStorage();
    if (!storage) {
        return 0;
    }
    try {
        const raw = storage.getItem(BEST_SCORE_KEY);
        if (raw === null || raw === undefined || raw === '') {
            return 0;
        }
        return toScoreValue(raw);
    } catch (error) {
        console.error('Failed to load best score:', error);
        return 0;
    }
}

export function saveBestScore(score) {
    const storage = getScoreStorage();
    if (!storage) {
        return false;
    }
    try {
        const value = toScoreValue(score);
        storage.setItem(BEST_SCORE_KEY, String(value));
        return true;
    } catch (error) {
        console.error('Failed to save best score:', error);
        return false;
    }
}
