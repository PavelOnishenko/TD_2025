import { createPlatformGridConfig, normalizePlatformConfig } from '../core/platformLayout.js';
import gameConfig from '../config/gameConfig.js';
import { enableFloatingPanel } from '../../engine/systems/FloatingPanel.js';

const MOVE_STEP = 10;
const SCALE_STEP = 0.02;
const MIN_SCALE = 0.1;
const MAX_SCALE = 2;
const HANDLE_GROUP_WIDTH = 154;
const HANDLE_GROUP_HEIGHT = 74;
const HANDLE_RIGHT_MARGIN = 180;
const HANDLE_MIN_EDGE_MARGIN = 28;
const HANDLE_VERTICAL_SPACING = 124;

function clamp(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return min;
    }
    return Math.min(max, Math.max(min, numeric));
}

function formatNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return '0';
    }
    return Number(numeric.toFixed(3)).toString();
}

function getConfigPlatform(game, index) {
    const configs = game?.gameConfig?.world?.platforms ?? gameConfig.world.platforms;
    return Array.isArray(configs) ? configs[index] : null;
}

export function getEditablePlatformLayouts(game) {
    const platforms = Array.isArray(game?.platforms) ? game.platforms : [];
    return platforms.map((platform, index) => {
        const configPlatform = getConfigPlatform(game, index);
        const normalized = normalizePlatformConfig({
            id: configPlatform?.id ?? platform.id ?? `platform-${index + 1}`,
            x: platform.x,
            y: platform.y,
            scale: platform.scale,
            scaleX: platform.scaleX,
            scaleY: platform.scaleY,
        });
        return {
            id: normalized.id,
            x: normalized.x,
            y: normalized.y,
            scaleX: normalized.scaleX,
            scaleY: normalized.scaleY,
        };
    });
}

function applyPlatformValues(platform, layout) {
    platform.x = layout.x;
    platform.y = layout.y;
    platform.scaleX = layout.scaleX;
    platform.scaleY = layout.scaleY;
    platform.scale = layout.scaleX;
}

function updateCells(row, nextCells) {
    nextCells.forEach((next, index) => {
        const cell = row[index];
        if (!cell) {
            return;
        }
        cell.x = next.x;
        cell.y = next.y;
        cell.w = next.w;
        cell.h = next.h;
        if (cell.tower && typeof cell.tower.alignToCell === 'function') {
            cell.tower.alignToCell(cell);
        }
    });
}

function updateGridFromConfig(game, gridConfig) {
    const topCells = Array.isArray(game?.grid?.topCells) ? game.grid.topCells : [];
    const bottomCells = Array.isArray(game?.grid?.bottomCells) ? game.grid.bottomCells : [];
    const buildCells = (origin, offsets) => offsets.map(offset => ({
        x: origin.x + offset.x,
        y: origin.y + offset.y,
        w: gridConfig.cellSize.w,
        h: gridConfig.cellSize.h,
    }));

    if (game.grid) {
        game.grid.cellWidth = gridConfig.cellSize.w;
        game.grid.cellHeight = gridConfig.cellSize.h;
        game.grid.topOrigin = { ...gridConfig.topOrigin };
        game.grid.bottomOrigin = { ...gridConfig.bottomOrigin };
        game.grid.topOffsets = gridConfig.topOffsets.map(offset => ({ ...offset }));
        game.grid.bottomOffsets = gridConfig.bottomOffsets.map(offset => ({ ...offset }));
    }

    updateCells(topCells, buildCells(gridConfig.topOrigin, gridConfig.topOffsets));
    updateCells(bottomCells, buildCells(gridConfig.bottomOrigin, gridConfig.bottomOffsets));
    game.topCells = topCells;
    game.bottomCells = bottomCells;
}

export function applyPlatformLayoutToGame(game, layouts) {
    if (!game || !Array.isArray(layouts) || !Array.isArray(game.platforms)) {
        return false;
    }

    const normalizedLayouts = layouts.map(layout => ({
        ...normalizePlatformConfig(layout),
        scaleX: clamp(layout.scaleX, MIN_SCALE, MAX_SCALE),
        scaleY: clamp(layout.scaleY, MIN_SCALE, MAX_SCALE),
    }));

    normalizedLayouts.forEach((layout, index) => {
        const platform = game.platforms[index];
        if (platform) {
            applyPlatformValues(platform, layout);
        }
    });

    updateGridFromConfig(game, createPlatformGridConfig(normalizedLayouts));
    if (typeof game.computeWorldBounds === 'function') {
        game.worldBounds = game.computeWorldBounds();
    }
    return true;
}

export function formatPlatformLayoutConfig(layouts) {
    const lines = layouts.map(layout => {
        const normalized = normalizePlatformConfig(layout);
        return `    { id: '${normalized.id}', x: ${formatNumber(normalized.x)}, y: ${formatNumber(normalized.y)}, scaleX: ${formatNumber(normalized.scaleX)}, scaleY: ${formatNumber(normalized.scaleY)} },`;
    });
    return [
        'const platformConfigs = [',
        ...lines,
        '];',
    ].join('\n');
}

export function getPlatformHandleControlDescriptors(layout) {
    const id = layout?.id ?? 'platform';
    return [
        {
            id: 'move-left',
            label: '←',
            title: `Move ${id} left`,
            patch: current => ({ x: current.x - MOVE_STEP }),
        },
        {
            id: 'move-right',
            label: '→',
            title: `Move ${id} right`,
            patch: current => ({ x: current.x + MOVE_STEP }),
        },
        {
            id: 'move-up',
            label: '↑',
            title: `Move ${id} up`,
            patch: current => ({ y: current.y - MOVE_STEP }),
        },
        {
            id: 'move-down',
            label: '↓',
            title: `Move ${id} down`,
            patch: current => ({ y: current.y + MOVE_STEP }),
        },
        {
            id: 'scale-x-down',
            label: 'X−',
            title: `Decrease ${id} scaleX`,
            patch: current => ({ scaleX: clamp(current.scaleX - SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-x-up',
            label: 'X+',
            title: `Increase ${id} scaleX`,
            patch: current => ({ scaleX: clamp(current.scaleX + SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-y-down',
            label: 'Y−',
            title: `Decrease ${id} scaleY`,
            patch: current => ({ scaleY: clamp(current.scaleY - SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-y-up',
            label: 'Y+',
            title: `Increase ${id} scaleY`,
            patch: current => ({ scaleY: clamp(current.scaleY + SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
    ];
}

function getEditorElements() {
    return {
        openBtn: document.getElementById('openLayoutEditor'),
        modal: document.getElementById('layoutEditor'),
        panel: document.querySelector('#layoutEditor .dev-modal__panel'),
        header: document.querySelector('#layoutEditor .dev-modal__header > div'),
        closeBtn: document.getElementById('closeLayoutEditor'),
        valuesEl: document.getElementById('layoutEditorValues'),
        handlesEl: document.getElementById('layoutEditorHandles'),
    };
}

function toggleModal(modal, open) {
    modal?.classList?.toggle('dev-modal--hidden', !open);
}

function setHandlesVisible(handlesEl, open) {
    handlesEl?.classList?.toggle('layout-editor-handles--hidden', !open);
}

function getHandleSurfaceSize(game) {
    const rect = game?.canvas?.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
    }
    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
        return { width: window.innerWidth, height: window.innerHeight };
    }
    const dpr = Number.isFinite(game?.viewport?.dpr) && game.viewport.dpr > 0 ? game.viewport.dpr : 1;
    const canvasWidth = Number.isFinite(game?.canvas?.width) ? game.canvas.width / dpr : null;
    const canvasHeight = Number.isFinite(game?.canvas?.height) ? game.canvas.height / dpr : null;
    return {
        width: canvasWidth && canvasWidth > 0 ? canvasWidth : 1600,
        height: canvasHeight && canvasHeight > 0 ? canvasHeight : 900,
    };
}

export function getPlatformHandleScreenPoint(game, layout, index = 0, total = 1) {
    const surface = getHandleSurfaceSize(game);
    const groupHalfWidth = HANDLE_GROUP_WIDTH / 2;
    const groupHalfHeight = HANDLE_GROUP_HEIGHT / 2;
    const x = clamp(
        surface.width - HANDLE_RIGHT_MARGIN,
        HANDLE_MIN_EDGE_MARGIN + groupHalfWidth,
        surface.width - HANDLE_MIN_EDGE_MARGIN - groupHalfWidth,
    );
    const centerIndex = (Math.max(1, total) - 1) / 2;
    const preferredY = surface.height * 0.62 + (index - centerIndex) * HANDLE_VERTICAL_SPACING;
    const y = clamp(
        preferredY,
        HANDLE_MIN_EDGE_MARGIN + groupHalfHeight,
        surface.height - HANDLE_MIN_EDGE_MARGIN - groupHalfHeight,
    );
    return { x, y };
}

function renderValues(valuesEl, layouts) {
    if (!valuesEl) {
        return;
    }
    valuesEl.value = formatPlatformLayoutConfig(layouts);
}

function createHandleButton(label, title, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-editor-handle';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', onClick);
    return button;
}

function createPlatformHandleGroup(game, state, index, rerender) {
    const group = document.createElement('div');
    group.className = 'layout-editor-handle-group';
    group.dataset.platformIndex = String(index);
    const change = (patch) => {
        const current = state.layouts[index];
        state.layouts[index] = { ...current, ...patch };
        applyPlatformLayoutToGame(game, state.layouts);
        rerender();
    };

    getPlatformHandleControlDescriptors(state.layouts[index]).forEach(control => {
        const button = createHandleButton(control.label, control.title, () => change(control.patch(state.layouts[index])));
        button.dataset.controlId = control.id;
        group.appendChild(button);
    });
    return group;
}

function renderHandles(game, elements, state, rerender) {
    if (!elements.handlesEl) {
        return;
    }
    elements.handlesEl.innerHTML = '';
    state.layouts.forEach((layout, index) => {
        const group = createPlatformHandleGroup(game, state, index, rerender);
        const point = getPlatformHandleScreenPoint(game, layout, index, state.layouts.length);
        group.style.left = `${point.x}px`;
        group.style.top = `${point.y}px`;
        elements.handlesEl.appendChild(group);
    });
}

export function initLayoutEditor(game) {
    if (!game || typeof document === 'undefined') {
        return;
    }
    const elements = getEditorElements();
    if (!elements.openBtn || !elements.modal) {
        return;
    }
    if (elements.panel && elements.header) {
        enableFloatingPanel(elements.panel, {
            dragHandle: elements.header,
            minWidth: 360,
            minHeight: 220,
            borderDrag: true,
        });
    }
    const state = {
        open: false,
        layouts: getEditablePlatformLayouts(game),
    };
    const rerender = () => {
        renderValues(elements.valuesEl, state.layouts);
        renderHandles(game, elements, state, rerender);
    };
    const setOpen = (open) => {
        state.open = open;
        if (open) {
            state.layouts = getEditablePlatformLayouts(game);
            rerender();
        }
        toggleModal(elements.modal, open);
        setHandlesVisible(elements.handlesEl, open);
    };

    elements.openBtn.addEventListener('click', () => setOpen(true));
    elements.closeBtn?.addEventListener('click', () => setOpen(false));
    elements.modal.addEventListener('click', (event) => {
        const target = event.target;
        if (target === elements.modal || (target instanceof HTMLElement && target.classList.contains('dev-modal__backdrop'))) {
            setOpen(false);
        }
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state.open) {
            setOpen(false);
        }
    });
    window.addEventListener('resize', () => {
        if (state.open) {
            renderHandles(game, elements, state, rerender);
        }
    });

    rerender();
    setOpen(false);
}

export default initLayoutEditor;
