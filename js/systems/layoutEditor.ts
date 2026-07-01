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
const SPAWN_HIT_RADIUS = 52;
const PORTAL_MIN_RADIUS = 20;
const BASE_MIN_SIZE = 20;

const BASELINE_SIZES = new WeakMap();

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

function getPlatformCenter(platform) {
    return {
        x: Number.isFinite(platform?.x) ? platform.x : 0,
        y: Number.isFinite(platform?.y) ? platform.y : 0,
    };
}

function makeRectHitBox(center, halfWidth, halfHeight) {
    return {
        x: center.x - halfWidth,
        y: center.y - halfHeight,
        w: halfWidth * 2,
        h: halfHeight * 2,
    };
}

function pointInRect(point, rect) {
    return point.x >= rect.x
        && point.x <= rect.x + rect.w
        && point.y >= rect.y
        && point.y <= rect.y + rect.h;
}

function pointInEllipse(point, center, radiusX, radiusY) {
    const safeRadiusX = Math.max(1, radiusX);
    const safeRadiusY = Math.max(1, radiusY);
    const dx = (point.x - center.x) / safeRadiusX;
    const dy = (point.y - center.y) / safeRadiusY;
    return dx * dx + dy * dy <= 1;
}

function getSpawnPoint(game) {
    if (game?.layoutSpawnPoint) {
        return { ...game.layoutSpawnPoint };
    }
    if (typeof game?.getDefaultEnemyCoords === 'function') {
        return game.getDefaultEnemyCoords();
    }
    return { x: gameConfig.enemies.defaultSpawn.x, y: gameConfig.enemies.defaultSpawn.y };
}

function getBaseline(target, fallbackX, fallbackY) {
    if (!target || typeof target !== 'object') {
        return { x: fallbackX, y: fallbackY };
    }
    if (!BASELINE_SIZES.has(target)) {
        BASELINE_SIZES.set(target, { x: fallbackX, y: fallbackY });
    }
    return BASELINE_SIZES.get(target);
}

export function getLayoutEditorTargets(game) {
    const platformLayouts = getEditablePlatformLayouts(game);
    const platforms = Array.isArray(game?.platforms) ? game.platforms : [];
    const targets = platformLayouts.map((layout, index) => {
        const center = getPlatformCenter(platforms[index] ?? layout);
        return {
            id: `platform:${layout.id}`,
            type: 'platform',
            index,
            label: `Platform ${index + 1}`,
            x: center.x,
            y: center.y,
            scaleX: layout.scaleX,
            scaleY: layout.scaleY,
            hitBox: makeRectHitBox(center, 430 * layout.scaleX, 180 * layout.scaleY),
        };
    });

    if (game?.portal?.position) {
        const radiusX = Math.max(PORTAL_MIN_RADIUS, Number(game.portal.radiusX) || 0);
        const radiusY = Math.max(PORTAL_MIN_RADIUS, Number(game.portal.radiusY) || 0);
        targets.push({
            id: 'portal',
            type: 'portal',
            label: 'Portal',
            x: game.portal.position.x,
            y: game.portal.position.y,
            scaleX: radiusX / getBaseline(game.portal, radiusX, radiusY).x,
            scaleY: radiusY / getBaseline(game.portal, radiusX, radiusY).y,
            radiusX,
            radiusY,
        });
    }

    const spawn = getSpawnPoint(game);
    targets.push({
        id: 'spawn',
        type: 'spawn',
        label: 'Spawn point',
        x: spawn.x,
        y: spawn.y,
        scaleX: game?.layoutSpawnMarkerScaleX ?? 1,
        scaleY: game?.layoutSpawnMarkerScaleY ?? 1,
        radiusX: SPAWN_HIT_RADIUS,
        radiusY: SPAWN_HIT_RADIUS,
    });

    if (game?.base) {
        const baseline = getBaseline(game.base, game.base.w ?? BASE_MIN_SIZE, game.base.h ?? BASE_MIN_SIZE);
        targets.push({
            id: 'base',
            type: 'base',
            label: 'Base',
            x: game.base.x,
            y: game.base.y,
            scaleX: (game.base.w ?? BASE_MIN_SIZE) / baseline.x,
            scaleY: (game.base.h ?? BASE_MIN_SIZE) / baseline.y,
            hitBox: {
                x: game.base.x,
                y: game.base.y,
                w: game.base.w ?? BASE_MIN_SIZE,
                h: game.base.h ?? BASE_MIN_SIZE,
            },
        });
    }

    return targets;
}

export function selectLayoutEditorTargetAt(game, point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return null;
    }
    const targets = getLayoutEditorTargets(game);
    for (let index = targets.length - 1; index >= 0; index -= 1) {
        const target = targets[index];
        if (target.hitBox && pointInRect(point, target.hitBox)) {
            return target;
        }
        if (Number.isFinite(target.radiusX) && Number.isFinite(target.radiusY)
            && pointInEllipse(point, { x: target.x, y: target.y }, target.radiusX, target.radiusY)) {
            return target;
        }
    }
    return null;
}

function applyPortalTargetPatch(game, patch) {
    const portal = game?.portal;
    if (!portal?.position) {
        return false;
    }
    const spawn = getSpawnPoint(game);
    if (Number.isFinite(patch.x)) {
        portal.position.x = patch.x;
    }
    if (Number.isFinite(patch.y)) {
        portal.position.y = patch.y;
    }
    const baseline = getBaseline(portal, portal.radiusX ?? PORTAL_MIN_RADIUS, portal.radiusY ?? PORTAL_MIN_RADIUS);
    if (Number.isFinite(patch.scaleX)) {
        portal.radiusX = Math.max(PORTAL_MIN_RADIUS, baseline.x * patch.scaleX);
    }
    if (Number.isFinite(patch.scaleY)) {
        portal.radiusY = Math.max(PORTAL_MIN_RADIUS, baseline.y * patch.scaleY);
    }
    portal.offset = {
        x: portal.position.x - spawn.x,
        y: portal.position.y - spawn.y,
    };
    portal.anchor = { ...spawn };
    return true;
}

function applySpawnTargetPatch(game, patch) {
    if (!game) {
        return false;
    }
    const current = getSpawnPoint(game);
    game.layoutSpawnPoint = {
        x: Number.isFinite(patch.x) ? patch.x : current.x,
        y: Number.isFinite(patch.y) ? patch.y : current.y,
    };
    if (Number.isFinite(patch.scaleX)) {
        game.layoutSpawnMarkerScaleX = clamp(patch.scaleX, MIN_SCALE, MAX_SCALE);
    }
    if (Number.isFinite(patch.scaleY)) {
        game.layoutSpawnMarkerScaleY = clamp(patch.scaleY, MIN_SCALE, MAX_SCALE);
    }
    if (game.portal?.position) {
        game.portal.spawn = { ...game.layoutSpawnPoint };
        game.portal.anchor = { ...game.layoutSpawnPoint };
        game.portal.offset = {
            x: game.portal.position.x - game.layoutSpawnPoint.x,
            y: game.portal.position.y - game.layoutSpawnPoint.y,
        };
    }
    return true;
}

function applyBaseTargetPatch(game, patch) {
    const base = game?.base;
    if (!base) {
        return false;
    }
    const baseline = getBaseline(base, base.w ?? BASE_MIN_SIZE, base.h ?? BASE_MIN_SIZE);
    if (Number.isFinite(patch.x)) {
        base.x = patch.x;
    }
    if (Number.isFinite(patch.y)) {
        base.y = patch.y;
    }
    if (Number.isFinite(patch.scaleX)) {
        base.w = Math.max(BASE_MIN_SIZE, baseline.x * patch.scaleX);
    }
    if (Number.isFinite(patch.scaleY)) {
        base.h = Math.max(BASE_MIN_SIZE, baseline.y * patch.scaleY);
    }
    return true;
}

export function applyLayoutEditorTargetPatch(game, targetId, patch) {
    if (!game || !targetId || !patch) {
        return false;
    }
    let changed = false;
    if (targetId.startsWith('platform:')) {
        const layouts = getEditablePlatformLayouts(game);
        const id = targetId.slice('platform:'.length);
        const index = layouts.findIndex(layout => layout.id === id);
        if (index >= 0) {
            layouts[index] = { ...layouts[index], ...patch };
            changed = applyPlatformLayoutToGame(game, layouts);
        }
    } else if (targetId === 'portal') {
        changed = applyPortalTargetPatch(game, patch);
    } else if (targetId === 'spawn') {
        changed = applySpawnTargetPatch(game, patch);
    } else if (targetId === 'base') {
        changed = applyBaseTargetPatch(game, patch);
    }

    if (changed && typeof game.computeWorldBounds === 'function') {
        game.worldBounds = game.computeWorldBounds();
    }
    return changed;
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

function formatTargetConfigValue(target) {
    if (!target) {
        return '';
    }
    if (target.id === 'portal') {
        return `portal: { x: ${formatNumber(target.x)}, y: ${formatNumber(target.y)}, scaleX: ${formatNumber(target.scaleX)}, scaleY: ${formatNumber(target.scaleY)} }`;
    }
    if (target.id === 'spawn') {
        return `spawn: { x: ${formatNumber(target.x)}, y: ${formatNumber(target.y)} }`;
    }
    if (target.id === 'base') {
        return `base: { x: ${formatNumber(target.x)}, y: ${formatNumber(target.y)}, scaleX: ${formatNumber(target.scaleX)}, scaleY: ${formatNumber(target.scaleY)} }`;
    }
    return '';
}

export function formatLayoutEditorConfig(game) {
    const layouts = getEditablePlatformLayouts(game);
    const targets = getLayoutEditorTargets(game);
    const portal = targets.find(target => target.id === 'portal');
    const spawn = targets.find(target => target.id === 'spawn');
    const base = targets.find(target => target.id === 'base');
    const platformLines = layouts.map(layout => {
        const normalized = normalizePlatformConfig(layout);
        return `        { id: '${normalized.id}', x: ${formatNumber(normalized.x)}, y: ${formatNumber(normalized.y)}, scaleX: ${formatNumber(normalized.scaleX)}, scaleY: ${formatNumber(normalized.scaleY)} },`;
    });
    return [
        'const layoutConfig = {',
        '    platforms: [',
        ...platformLines,
        '    ],',
        `    ${formatTargetConfigValue(portal)},`,
        `    ${formatTargetConfigValue(spawn)},`,
        `    ${formatTargetConfigValue(base)},`,
        '};',
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

export function getLayoutEditorTargetControlDescriptors(target) {
    const label = target?.label ?? target?.id ?? 'selection';
    return [
        {
            id: 'move-left',
            label: '←',
            title: `Move ${label} left`,
            patch: current => ({ x: current.x - MOVE_STEP }),
        },
        {
            id: 'move-right',
            label: '→',
            title: `Move ${label} right`,
            patch: current => ({ x: current.x + MOVE_STEP }),
        },
        {
            id: 'move-up',
            label: '↑',
            title: `Move ${label} up`,
            patch: current => ({ y: current.y - MOVE_STEP }),
        },
        {
            id: 'move-down',
            label: '↓',
            title: `Move ${label} down`,
            patch: current => ({ y: current.y + MOVE_STEP }),
        },
        {
            id: 'scale-x-down',
            label: 'X−',
            title: `Decrease ${label} scaleX`,
            patch: current => ({ scaleX: clamp(current.scaleX - SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-x-up',
            label: 'X+',
            title: `Increase ${label} scaleX`,
            patch: current => ({ scaleX: clamp(current.scaleX + SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-y-down',
            label: 'Y−',
            title: `Decrease ${label} scaleY`,
            patch: current => ({ scaleY: clamp(current.scaleY - SCALE_STEP, MIN_SCALE, MAX_SCALE) }),
        },
        {
            id: 'scale-y-up',
            label: 'Y+',
            title: `Increase ${label} scaleY`,
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
        selectionEl: document.getElementById('layoutEditorSelection'),
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

function renderValues(valuesEl, game) {
    if (!valuesEl) {
        return;
    }
    valuesEl.value = formatLayoutEditorConfig(game);
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

function getSelectedTarget(game, selectedTargetId) {
    if (!selectedTargetId) {
        return null;
    }
    return getLayoutEditorTargets(game).find(target => target.id === selectedTargetId) ?? null;
}

function createSelectedHandleGroup(game, state, rerender) {
    const target = getSelectedTarget(game, state.selectedTargetId);
    if (!target) {
        return null;
    }
    const group = document.createElement('div');
    group.className = 'layout-editor-handle-group';
    group.dataset.targetId = target.id;
    const change = (patch) => {
        const current = getSelectedTarget(game, state.selectedTargetId);
        if (!current) {
            return;
        }
        applyLayoutEditorTargetPatch(game, current.id, patch);
        state.layouts = getEditablePlatformLayouts(game);
        rerender();
    };

    getLayoutEditorTargetControlDescriptors(target).forEach(control => {
        const button = createHandleButton(control.label, control.title, () => change(control.patch(getSelectedTarget(game, state.selectedTargetId))));
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
    const group = createSelectedHandleGroup(game, state, rerender);
    if (group) {
        const point = getPlatformHandleScreenPoint(game, getSelectedTarget(game, state.selectedTargetId), 0, 1);
        group.style.left = `${point.x}px`;
        group.style.top = `${point.y}px`;
        elements.handlesEl.appendChild(group);
    }
}

function renderSelection(selectionEl, selectedTarget) {
    if (!selectionEl) {
        return;
    }
    selectionEl.textContent = selectedTarget ? `${selectedTarget.label} is selected` : 'Nothing selected';
}

function getCanvasWorldPoint(game, event) {
    const canvas = game?.canvas;
    const rect = canvas?.getBoundingClientRect?.();
    if (!rect) {
        return null;
    }
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const canvasX = cssX * ((canvas.width || rect.width) / rect.width);
    const canvasY = cssY * ((canvas.height || rect.height) / rect.height);
    const viewport = game.viewport ?? {};
    const scale = Number.isFinite(viewport.scale) ? viewport.scale : 1;
    const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
    const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;
    return {
        x: (canvasX - offsetX) / scale,
        y: (canvasY - offsetY) / scale,
    };
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
        selectedTargetId: null,
    };
    const rerender = () => {
        renderValues(elements.valuesEl, game);
        renderSelection(elements.selectionEl, getSelectedTarget(game, state.selectedTargetId));
        renderHandles(game, elements, state, rerender);
    };
    const setOpen = (open) => {
        state.open = open;
        game.layoutEditorState = { ...(game.layoutEditorState ?? {}), open, selectedTargetId: state.selectedTargetId };
        if (open) {
            state.layouts = getEditablePlatformLayouts(game);
            rerender();
        } else {
            state.selectedTargetId = null;
            game.layoutEditorState.selectedTargetId = null;
        }
        toggleModal(elements.modal, open);
        setHandlesVisible(elements.handlesEl, open);
        rerender();
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
    game.canvas?.addEventListener?.('click', (event) => {
        if (!state.open) {
            return;
        }
        const point = getCanvasWorldPoint(game, event);
        const selectedTarget = selectLayoutEditorTargetAt(game, point);
        state.selectedTargetId = selectedTarget?.id ?? null;
        game.layoutEditorState = { ...(game.layoutEditorState ?? {}), open: true, selectedTargetId: state.selectedTargetId };
        rerender();
    });

    rerender();
    setOpen(false);
}

export default initLayoutEditor;
