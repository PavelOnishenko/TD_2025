import { applySimpleSaveState, createSimpleSavePayload } from './simpleSaveSystem.js';

const STORAGE_KEY = 'td_dev_positions_v1';
const DEFAULT_DRAFT = { version: 1, wave: 1, energy: 0, towers: [], swarmKills: 0, tankKills: 0, energyGained: 0, energySpent: 0 };

function getStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return window.localStorage;
}

function clonePayload(payload) {
    try {
        return JSON.parse(JSON.stringify(payload));
    } catch (error) {
        console.warn('Failed to clone payload', error);
        return { ...DEFAULT_DRAFT };
    }
}

function readSavedSlots(storage) {
    if (!storage) {
        return {};
    }
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to read saved positions', error);
        return {};
    }
}

function writeSavedSlots(storage, slots) {
    if (!storage) {
        return false;
    }
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(slots));
        return true;
    } catch (error) {
        console.warn('Failed to write saved positions', error);
        return false;
    }
}

function normalizeSlotName(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().slice(0, 80);
}

function sanitizeTowerDraft(entry) {
    const cellId = typeof entry?.cellId === 'string' ? entry.cellId.trim() : '';
    const color = typeof entry?.color === 'string' && entry.color.trim() !== '' ? entry.color.trim() : 'red';
    const levelRaw = Number(entry?.level);
    const level = Number.isFinite(levelRaw) ? Math.max(1, Math.floor(levelRaw)) : 1;
    return { cellId, color, level };
}

function sanitizeDraft(rawDraft) {
    const draft = rawDraft && typeof rawDraft === 'object' ? rawDraft : DEFAULT_DRAFT;
    const waveRaw = Number(rawDraft?.wave);
    const wave = Number.isFinite(waveRaw) ? Math.max(1, Math.floor(waveRaw)) : 1;
    const energyRaw = Number(rawDraft?.energy);
    const energy = Number.isFinite(energyRaw) ? Math.max(0, Math.floor(energyRaw)) : 0;
    const towers = Array.isArray(rawDraft?.towers)
        ? rawDraft.towers.map(sanitizeTowerDraft).filter(entry => entry.cellId)
        : [];
    const swarmKills = Math.max(0, Math.floor(Number(rawDraft?.swarmKills) || 0));
    const tankKills = Math.max(0, Math.floor(Number(rawDraft?.tankKills) || 0));
    const energyGained = Math.max(0, Math.floor(Number(rawDraft?.energyGained) || 0));
    const energySpent = Math.max(0, Math.floor(Number(rawDraft?.energySpent) || 0));
    return { version: 1, wave, energy, towers, swarmKills, tankKills, energyGained, energySpent };
}

function formatSlotSummary(slot) {
    const wave = Number(slot?.wave) || 1;
    const energy = Number(slot?.energy) || 0;
    const towers = Array.isArray(slot?.towers) ? slot.towers.length : 0;
    return `Wave ${wave} • Energy ${energy} • ${towers} towers`;
}

function createTowerEntryElement(entry, index, handlers) {
    const { onChange, onRemove } = handlers;
    const container = document.createElement('div');
    container.className = 'dev-modal__tower-entry';
    container.dataset.index = String(index);

    const cellInput = document.createElement('input');
    cellInput.className = 'dev-modal__input';
    cellInput.placeholder = 'top:0';
    cellInput.value = entry.cellId ?? '';
    cellInput.setAttribute('aria-label', `Cell ID for tower ${index + 1}`);

    const colorInput = document.createElement('input');
    colorInput.className = 'dev-modal__input';
    colorInput.placeholder = 'red';
    colorInput.value = entry.color ?? 'red';
    colorInput.setAttribute('aria-label', `Color for tower ${index + 1}`);

    const levelInput = document.createElement('input');
    levelInput.className = 'dev-modal__input';
    levelInput.type = 'number';
    levelInput.min = '1';
    levelInput.step = '1';
    levelInput.value = String(entry.level ?? 1);
    levelInput.setAttribute('aria-label', `Level for tower ${index + 1}`);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'dev-modal__tower-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => onRemove(index));

    const handleChange = () => {
        onChange(index, sanitizeTowerDraft({
            cellId: cellInput.value,
            color: colorInput.value,
            level: levelInput.value,
        }));
    };

    cellInput.addEventListener('input', handleChange);
    colorInput.addEventListener('input', handleChange);
    levelInput.addEventListener('input', handleChange);

    container.append(cellInput, colorInput, levelInput, removeBtn);
    return container;
}

function renderTowerEntries(listEl, state, updateDraft) {
    if (!listEl) {
        return;
    }
    listEl.innerHTML = '';
    const towers = Array.isArray(state?.draft?.towers) ? state.draft.towers : [];
    const handlers = {
        onChange(index, next) {
            const currentTowers = Array.isArray(state?.draft?.towers) ? [...state.draft.towers] : [];
            currentTowers[index] = next;
            updateDraft({ ...state.draft, towers: currentTowers }, { skipTowerRender: true });
        },
        onRemove(index) {
            const currentTowers = Array.isArray(state?.draft?.towers) ? state.draft.towers : [];
            const updated = currentTowers.filter((_, idx) => idx !== index);
            updateDraft({ ...state.draft, towers: updated });
        },
    };

    if (towers.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'dev-modal__hint';
        empty.textContent = 'No towers yet. Add one to set its cell, color, and level.';
        listEl.appendChild(empty);
        return;
    }

    towers.forEach((entry, index) => {
        const element = createTowerEntryElement(entry, index, handlers);
        listEl.appendChild(element);
    });
}

function renderSlotList(listEl, slots, actions) {
    if (!listEl) {
        return;
    }
    listEl.innerHTML = '';
    const names = Object.keys(slots ?? {}).sort((a, b) => a.localeCompare(b));
    if (names.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'dev-modal__hint';
        empty.textContent = 'No saved positions yet. Name a slot and save to create one.';
        listEl.appendChild(empty);
        return;
    }

    names.forEach((name) => {
        const slot = slots[name];
        const row = document.createElement('div');
        row.className = 'dev-modal__slot';
        row.setAttribute('role', 'listitem');

        const info = document.createElement('div');
        info.className = 'dev-modal__slot-info';
        const title = document.createElement('strong');
        title.textContent = name;
        const summary = document.createElement('span');
        summary.textContent = formatSlotSummary(slot);
        info.append(title, summary);

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'dev-modal__slot-actions';

        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'dev-modal__button';
        loadBtn.textContent = 'Load';
        loadBtn.addEventListener('click', () => actions.onLoad?.(name));

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'dev-modal__button dev-modal__button--primary';
        applyBtn.textContent = 'Load & Apply';
        applyBtn.addEventListener('click', () => actions.onApply?.(name));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'dev-modal__button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => actions.onDelete?.(name));

        actionsContainer.append(loadBtn, applyBtn, deleteBtn);
        row.append(info, actionsContainer);
        listEl.appendChild(row);
    });
}

function toggleModal(modalEl, open) {
    if (!modalEl) {
        return;
    }
    modalEl.classList.toggle('dev-modal--hidden', !open);
}

function getEditorElements() {
    return {
        openBtn: document.getElementById('openPositionEditor'),
        modal: document.getElementById('positionEditor'),
        closeBtn: document.getElementById('closePositionEditor'),
        waveInput: document.getElementById('positionWave'),
        energyInput: document.getElementById('positionEnergy'),
        towerListEl: document.getElementById('towerEntryList'),
        addTowerBtn: document.getElementById('addTowerEntry'),
        useLiveBtn: document.getElementById('useLivePosition'),
        applyBtn: document.getElementById('applyPosition'),
        slotNameInput: document.getElementById('positionSlotName'),
        saveSlotBtn: document.getElementById('savePositionSlot'),
        slotListEl: document.getElementById('positionSlotList'),
    };
}

function createEditorState(storage) {
    return {
        slots: readSavedSlots(storage),
        draft: clonePayload(DEFAULT_DRAFT),
    };
}

function createDraftUpdater(elements, state) {
    function updateDraft(next, options: any = {}) {
        state.draft = sanitizeDraft(next);
        if (elements.waveInput) {
            elements.waveInput.value = String(state.draft.wave ?? 1);
        }
        if (elements.energyInput) {
            elements.energyInput.value = String(state.draft.energy ?? 0);
        }
        if (!options.skipTowerRender) {
            renderTowerEntries(elements.towerListEl, state, updateDraft);
        }
    }
    return updateDraft;
}

function createSlotActions(game, storage, state, updateDraft, refreshSlots) {
    return {
        onLoad: (name) => {
            const slot = state.slots?.[name];
            if (slot) {
                updateDraft(clonePayload(slot));
            }
        },
        onApply: (name) => {
            const slot = state.slots?.[name];
            if (slot) {
                updateDraft(clonePayload(slot));
                applySimpleSaveState(game, sanitizeDraft(slot));
            }
        },
        onDelete: (name) => {
            const nextSlots = { ...state.slots };
            delete nextSlots[name];
            state.slots = nextSlots;
            writeSavedSlots(storage, state.slots);
            refreshSlots();
        },
    };
}

function createSlotRefresher(game, storage, elements, state, updateDraft) {
    const refreshSlots = () => {
        const actions = createSlotActions(game, storage, state, updateDraft, refreshSlots);
        renderSlotList(elements.slotListEl, state.slots, actions);
    };
    return refreshSlots;
}

function getDraftFromInputs(elements, state) {
    return sanitizeDraft({
        wave: elements.waveInput ? elements.waveInput.value : state.draft.wave,
        energy: elements.energyInput ? elements.energyInput.value : state.draft.energy,
        towers: state.draft.towers,
    });
}

function bindDraftInputs(elements, state, updateDraft) {
    if (elements.waveInput) {
        elements.waveInput.addEventListener('input', () => {
            updateDraft({ ...state.draft, wave: elements.waveInput.value });
        });
    }
    if (elements.energyInput) {
        elements.energyInput.addEventListener('input', () => {
            updateDraft({ ...state.draft, energy: elements.energyInput.value });
        });
    }
}

function bindEditorActions(game, storage, elements, state, updateDraft, refreshSlots) {
    const hydrateFromGame = () => updateDraft(createSimpleSavePayload(game));
    const applyDraftToGame = () => {
        const payload = getDraftFromInputs(elements, state);
        applySimpleSaveState(game, payload);
        updateDraft(payload);
    };
    if (elements.addTowerBtn) {
        elements.addTowerBtn.addEventListener('click', () => {
            const next = [...(state.draft.towers ?? [])];
            next.push({ cellId: 'top:0', color: 'red', level: 1 });
            updateDraft({ ...state.draft, towers: next });
        });
    }
    elements.useLiveBtn?.addEventListener('click', hydrateFromGame);
    elements.applyBtn?.addEventListener('click', applyDraftToGame);
    bindSlotSaveButton(storage, elements, state, refreshSlots);
    return hydrateFromGame;
}

function bindSlotSaveButton(storage, elements, state, refreshSlots) {
    if (!elements.saveSlotBtn) {
        return;
    }
    elements.saveSlotBtn.addEventListener('click', () => {
        const name = normalizeSlotName(elements.slotNameInput?.value ?? '');
        if (!name) {
            return;
        }
        const payload = getDraftFromInputs(elements, state);
        state.slots = { ...state.slots, [name]: payload };
        writeSavedSlots(storage, state.slots);
        refreshSlots();
    });
}

function bindModalControls(elements) {
    elements.openBtn.addEventListener('click', () => toggleModal(elements.modal, true));
    elements.closeBtn?.addEventListener('click', () => toggleModal(elements.modal, false));
    elements.modal.addEventListener('click', (event) => {
        const target = event.target;
        const clickedBackdrop = target === elements.modal
            || (target instanceof HTMLElement && target.classList.contains('dev-modal__backdrop'));
        if (clickedBackdrop) {
            toggleModal(elements.modal, false);
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.modal.classList.contains('dev-modal--hidden')) {
            toggleModal(elements.modal, false);
        }
    });
}

export function initDeveloperPositionEditor(game) {
    if (!game) {
        return;
    }
    const elements = getEditorElements();
    const storage = getStorage();
    if (!elements.openBtn || !elements.modal) {
        return;
    }
    const state = createEditorState(storage);
    const updateDraft = createDraftUpdater(elements, state);
    const refreshSlots = createSlotRefresher(game, storage, elements, state, updateDraft);
    const hydrateFromGame = bindEditorActions(game, storage, elements, state, updateDraft, refreshSlots);

    bindDraftInputs(elements, state, updateDraft);
    bindModalControls(elements);
    hydrateFromGame();
    refreshSlots();
    toggleModal(elements.modal, false);
}

export default initDeveloperPositionEditor;
