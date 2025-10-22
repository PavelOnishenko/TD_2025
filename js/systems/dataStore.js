const STORAGE_KEY = 'towerDefenseGameState';
const AUDIO_SETTINGS_KEY = 'towerDefenseAudioSettings';

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
