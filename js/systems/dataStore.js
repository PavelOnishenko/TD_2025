const STORAGE_KEY = 'towerDefenseGameState';
const AUDIO_SETTINGS_KEY = 'towerDefenseAudioSettings';
const BEST_SCORE_KEY = 'towerDefenseBestScore';
const LANGUAGE_PREFERENCE_KEY = 'towerDefenseLanguagePreference';

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
    return readJsonValue(client, STORAGE_KEY, 'Failed to load CrazyGames save data:');
}

export function saveGameState(state) {
    const client = getDataClient();
    return writeJsonValue(client, STORAGE_KEY, state, 'Failed to save CrazyGames data:');
}

export function clearGameState() {
    const client = getDataClient();
    return clearStoredValue(client, STORAGE_KEY, 'Failed to clear CrazyGames data:');
}

export function loadAudioSettings() {
    const client = getDataClient();
    return readJsonValue(client, AUDIO_SETTINGS_KEY, 'Failed to load CrazyGames audio settings:');
}

export function saveAudioSettings(settings) {
    const client = getDataClient();
    return writeJsonValue(client, AUDIO_SETTINGS_KEY, settings, 'Failed to save CrazyGames audio settings:');
}

export function clearAudioSettings() {
    const client = getDataClient();
    return clearStoredValue(client, AUDIO_SETTINGS_KEY, 'Failed to clear CrazyGames audio settings:');
}

export function loadLanguagePreference() {
    const storage = getLocalStorage();
    if (!storage) {
        return null;
    }
    try {
        const value = storage.getItem(LANGUAGE_PREFERENCE_KEY);
        if (typeof value !== 'string') {
            return null;
        }
        const normalized = value.trim().toLowerCase();
        return normalized || null;
    } catch (error) {
        console.error('Failed to load language preference:', error);
        return null;
    }
}

export function saveLanguagePreference(language) {
    const storage = getLocalStorage();
    if (!storage) {
        return false;
    }
    try {
        const normalized = typeof language === 'string'
            ? language.trim().toLowerCase()
            : '';
        if (normalized) {
            storage.setItem(LANGUAGE_PREFERENCE_KEY, normalized);
        }
        else {
            storage.removeItem(LANGUAGE_PREFERENCE_KEY);
        }
        return true;
    } catch (error) {
        console.error('Failed to save language preference:', error);
        return false;
    }
}

function readJsonValue(client, key, errorLabel) {
    if (!client) {
        return null;
    }
    try {
        const raw = client.getItem(key);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error(errorLabel, error);
        return null;
    }
}

function writeJsonValue(client, key, value, errorLabel) {
    if (!client) {
        return false;
    }
    try {
        const payload = JSON.stringify(value);
        client.setItem(key, payload);
        return true;
    } catch (error) {
        console.error(errorLabel, error);
        return false;
    }
}

function clearStoredValue(client, key, errorLabel) {
    if (!client) {
        return false;
    }
    try {
        client.removeItem(key);
        return true;
    } catch (error) {
        console.error(errorLabel, error);
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
