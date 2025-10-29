import { updateHUD } from './ui.js';

const DEFAULT_STORAGE_KEY = 'td_simple_save_v1';
const CONTROLS_HIDDEN_CLASS = 'save-controls--hidden';
const STATUS_COLORS = {
    success: '#a7f3d0',
    info: '#fef3c7',
    warning: '#facc15',
    error: '#fda4af',
};

function resolveOption(options, key, fallback) {
    if (!options || typeof options !== 'object') {
        return fallback;
    }
    if (options[key] === undefined) {
        return fallback;
    }
    return options[key];
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

function readSavedGame(storage, key) {
    if (!storage) {
        return null;
    }
    try {
        const raw = storage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to read saved game', error);
        return null;
    }
}

function writeSavedGame(storage, key, value) {
    if (!storage) {
        return false;
    }
    try {
        const payload = JSON.stringify(value);
        storage.setItem(key, payload);
        return true;
    } catch (error) {
        console.warn('Failed to save game snapshot', error);
        return false;
    }
}

function clearSavedGame(storage, key) {
    if (!storage) {
        return false;
    }
    try {
        storage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('Failed to clear saved game', error);
        return false;
    }
}

function toInt(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    return Math.floor(num);
}

function sanitizeWaveValue(value) {
    const wave = toInt(value, 1);
    return Math.max(1, wave);
}

function sanitizeEnergyValue(value) {
    const energy = toInt(value, 0);
    return Math.max(0, energy);
}

function sanitizeTowerEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const cellId = typeof entry.cellId === 'string' && entry.cellId.trim() !== ''
        ? entry.cellId
        : null;
    if (!cellId) {
        return null;
    }
    const color = typeof entry.color === 'string' && entry.color.trim() !== ''
        ? entry.color
        : 'red';
    const level = Math.max(1, toInt(entry.level, 1));
    return { cellId, color, level };
}

function sanitizeSavePayload(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const version = raw.version ?? 1;
    if (version !== 1) {
        return null;
    }
    const wave = sanitizeWaveValue(raw.wave);
    const energy = sanitizeEnergyValue(raw.energy);
    const towers = Array.isArray(raw.towers)
        ? raw.towers.map(sanitizeTowerEntry).filter(Boolean)
        : [];
    return { version: 1, wave, energy, towers };
}

function updateStatus(game, message, colorKey = 'info') {
    const statusEl = game?.statusEl;
    if (!statusEl) {
        return;
    }
    statusEl.textContent = message;
    const color = STATUS_COLORS[colorKey] ?? STATUS_COLORS.info;
    if (statusEl.style) {
        statusEl.style.color = color;
    }
}

function ensureControls(container, options = {}) {
    if (!container) {
        return false;
    }
    const enabled = resolveOption(options, 'enabled', true);
    if (!enabled) {
        container.classList.add(CONTROLS_HIDDEN_CLASS);
        return false;
    }
    container.classList.remove(CONTROLS_HIDDEN_CLASS);
    return true;
}

function getControlElements(game) {
    const doc = typeof document !== 'undefined' ? document : null;
    const container = game?.saveControlsEl ?? doc?.getElementById('saveControls') ?? null;
    const saveBtn = game?.saveBtn ?? doc?.getElementById('saveGame') ?? null;
    const loadBtn = game?.loadBtn ?? doc?.getElementById('loadGame') ?? null;
    const deleteBtn = game?.deleteSaveBtn ?? doc?.getElementById('deleteSave') ?? null;
    return { container, saveBtn, loadBtn, deleteBtn };
}

function formatLoadButtonLabel(saved) {
    if (!saved) {
        return 'Load Game';
    }
    const wave = sanitizeWaveValue(saved.wave);
    return `Load Wave ${wave}`;
}

function updateLoadControls({ loadBtn, deleteBtn }, saved) {
    const hasSave = Boolean(saved);
    if (loadBtn) {
        loadBtn.disabled = !hasSave;
        if (hasSave) {
            loadBtn.textContent = formatLoadButtonLabel(saved);
        } else {
            loadBtn.textContent = 'Load Game';
        }
    }
    if (deleteBtn) {
        deleteBtn.disabled = !hasSave;
    }
}

export function createSimpleSavePayload(game) {
    if (!game) {
        return { version: 1, wave: 1, energy: 0, towers: [] };
    }
    const wave = sanitizeWaveValue(game.wave);
    const energy = sanitizeEnergyValue(game.energy);
    const towers = Array.isArray(game.towers)
        ? game.towers
            .filter(tower => tower && tower.cell)
            .map(tower => ({
                cellId: typeof game.createCellIdentifier === 'function'
                    ? game.createCellIdentifier(tower.cell)
                    : null,
                color: typeof tower.color === 'string' ? tower.color : 'red',
                level: Math.max(1, toInt(tower.level, 1)),
            }))
            .filter(entry => entry.cellId !== null)
        : [];
    return { version: 1, wave, energy, towers };
}

export function applySimpleSaveState(game, rawState) {
    const sanitized = sanitizeSavePayload(rawState);
    if (!game || !sanitized) {
        return null;
    }

    const targetWave = sanitized.wave;
    game.wave = targetWave;
    game.energy = sanitized.energy;
    game.gameOver = false;
    game.waveInProgress = false;
    game.spawned = 0;
    game.spawnTimer = 0;
    game.enemies = [];
    game.projectiles = [];
    game.explosions = [];
    game.mergeAnimations = [];
    game.maxProjectileRadius = game.projectileRadius;
    if (Array.isArray(game.mergeHintPairs)) {
        game.mergeHintPairs.length = 0;
    } else {
        game.mergeHintPairs = [];
    }

    if (typeof game.ensureEndlessWaveTracking === 'function') {
        game.ensureEndlessWaveTracking();
    }
    if (typeof game.isEndlessWave === 'function') {
        game.endlessModeActive = game.isEndlessWave(targetWave);
    } else if (Number.isFinite(game.maxWaves)) {
        game.endlessModeActive = targetWave > game.maxWaves;
    }

    if (typeof game.getOrCreateWaveConfig === 'function') {
        const cfg = game.getOrCreateWaveConfig(targetWave);
        if (cfg) {
            game.spawnInterval = cfg.interval;
            game.enemiesPerWave = cfg.cycles;
            if (typeof game.prepareTankScheduleForWave === 'function') {
                game.prepareTankScheduleForWave(cfg, targetWave);
            }
        }
    }
    if (typeof game.getEnemyHpForWave === 'function') {
        game.getEnemyHpForWave(targetWave);
    }
    if (typeof game.resetWaveAdState === 'function') {
        game.resetWaveAdState();
    }

    if (game.nextWaveBtn) {
        game.nextWaveBtn.disabled = false;
    }
    if (game.mergeBtn) {
        game.mergeBtn.disabled = false;
    }

    game.restoreTowers(sanitized.towers);
    updateHUD(game);
    return sanitized;
}

export function initSimpleSaveSystem(game, options = {}) {
    const resolvedOptions = {
        storageKey: resolveOption(options, 'storageKey', DEFAULT_STORAGE_KEY),
        enabled: resolveOption(options, 'enabled', true),
    };
    const { container, saveBtn, loadBtn, deleteBtn } = getControlElements(game);
    if (!container || !saveBtn || !loadBtn) {
        return;
    }
    const controlsEnabled = ensureControls(container, resolvedOptions);
    if (!controlsEnabled) {
        return;
    }

    const storage = getLocalStorage();
    if (!storage) {
        saveBtn.disabled = true;
        loadBtn.disabled = true;
        if (deleteBtn) {
            deleteBtn.disabled = true;
        }
        updateStatus(game, 'Saving is unavailable in this browser.', 'error');
        return;
    }

    const { storageKey } = resolvedOptions;

    const refreshControls = () => {
        const saved = sanitizeSavePayload(readSavedGame(storage, storageKey));
        updateLoadControls({ loadBtn, deleteBtn }, saved);
        return saved;
    };

    if (!container.dataset.simpleSaveBound) {
        const handleSave = () => {
            const payload = createSimpleSavePayload(game);
            const saved = writeSavedGame(storage, storageKey, payload);
            if (saved) {
                updateStatus(game, `Game saved at wave ${payload.wave}.`, 'success');
            } else {
                updateStatus(game, 'Failed to save game.', 'error');
            }
            refreshControls();
        };
        const handleLoad = () => {
            const savedState = refreshControls();
            if (!savedState) {
                updateStatus(game, 'No saved game found.', 'warning');
                return;
            }
            const applied = applySimpleSaveState(game, savedState);
            if (!applied) {
                updateStatus(game, 'Saved game is invalid.', 'error');
                return;
            }
            updateStatus(game, `Loaded wave ${applied.wave}.`, 'success');
        };
        const handleDelete = () => {
            const cleared = clearSavedGame(storage, storageKey);
            if (cleared) {
                updateStatus(game, 'Saved game deleted.', 'info');
            } else {
                updateStatus(game, 'Failed to delete saved game.', 'error');
            }
            refreshControls();
        };
        saveBtn.addEventListener('click', handleSave);
        loadBtn.addEventListener('click', handleLoad);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }
        container.dataset.simpleSaveBound = '1';
        game.simpleSaveSystem = {
            save: handleSave,
            load: handleLoad,
            clear: handleDelete,
            storageKey,
        };
    }

    refreshControls();
}

export default initSimpleSaveSystem;
