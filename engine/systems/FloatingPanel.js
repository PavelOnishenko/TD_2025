export const FLOATING_PANEL_CLASS = 'engine-floating-panel';
export const FLOATING_PANEL_DRAG_HANDLE_CLASS = 'engine-floating-panel__drag-handle';
export const FLOATING_PANEL_DRAGGING_CLASS = 'engine-floating-panel--dragging';

const DEFAULT_BORDER_DRAG_THRESHOLD_PX = 10;
const DEFAULT_RESIZE_CORNER_PRIORITY_PX = 28;

function toPixelValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `${value}px`;
    }
    return '';
}

function readOffset(panel, axis) {
    const value = axis === 'x' ? panel.dataset?.offsetX : panel.dataset?.offsetY;
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
}

function applyPanelOffset(panel, offsetX, offsetY) {
    panel.dataset.offsetX = String(offsetX);
    panel.dataset.offsetY = String(offsetY);
    panel.style.setProperty('--panel-offset-x', `${offsetX}px`);
    panel.style.setProperty('--panel-offset-y', `${offsetY}px`);
    panel.style.transform = 'translate(var(--panel-offset-x, 0px), var(--panel-offset-y, 0px))';
}

function shouldStartBorderDrag(event, panel, options) {
    if (!options.borderDrag || event.button !== 0) {
        return false;
    }

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.width <= 0 || panelRect.height <= 0) {
        return false;
    }

    const localX = event.clientX - panelRect.left;
    const localY = event.clientY - panelRect.top;
    if (localX < 0 || localY < 0 || localX > panelRect.width || localY > panelRect.height) {
        return false;
    }

    const resizeCornerPriorityPx = options.resizeCornerPriorityPx ?? DEFAULT_RESIZE_CORNER_PRIORITY_PX;
    const isInResizePriorityCorner = localX >= panelRect.width - resizeCornerPriorityPx
        && localY >= panelRect.height - resizeCornerPriorityPx;
    if (isInResizePriorityCorner) {
        return false;
    }

    const threshold = options.borderDragThresholdPx ?? DEFAULT_BORDER_DRAG_THRESHOLD_PX;
    return localX <= threshold
        || localY <= threshold
        || localX >= panelRect.width - threshold
        || localY >= panelRect.height - threshold;
}

function startPanelDrag(event, panel, dragSurface, options) {
    event.preventDefault();
    if (typeof dragSurface.setPointerCapture === 'function') {
        dragSurface.setPointerCapture(event.pointerId);
    }

    const nextZIndex = typeof options.nextZIndex === 'function' ? options.nextZIndex() : null;
    if (nextZIndex !== null && nextZIndex !== undefined) {
        panel.style.zIndex = String(nextZIndex);
    }
    panel.classList.add(FLOATING_PANEL_DRAGGING_CLASS);

    const startX = event.clientX;
    const startY = event.clientY;
    const initialOffsetX = readOffset(panel, 'x');
    const initialOffsetY = readOffset(panel, 'y');
    const onPointerMove = (moveEvent) => {
        applyPanelOffset(
            panel,
            initialOffsetX + (moveEvent.clientX - startX),
            initialOffsetY + (moveEvent.clientY - startY),
        );
    };
    const stopDrag = () => {
        panel.classList.remove(FLOATING_PANEL_DRAGGING_CLASS);
        dragSurface.removeEventListener('pointermove', onPointerMove);
        dragSurface.removeEventListener('pointerup', stopDrag);
        dragSurface.removeEventListener('pointercancel', stopDrag);
    };

    dragSurface.addEventListener('pointermove', onPointerMove);
    dragSurface.addEventListener('pointerup', stopDrag);
    dragSurface.addEventListener('pointercancel', stopDrag);
}

export function enableFloatingPanel(panel, options = {}) {
    if (!panel) {
        return null;
    }

    const dragHandle = options.dragHandle ?? panel.querySelector?.(`.${FLOATING_PANEL_DRAG_HANDLE_CLASS}`);
    panel.classList.add(FLOATING_PANEL_CLASS);
    panel.style.transform = panel.style.transform || 'translate(var(--panel-offset-x, 0px), var(--panel-offset-y, 0px))';
    panel.style.resize = 'both';
    panel.style.overflow = panel.style.overflow || 'auto';

    const minWidth = toPixelValue(options.minWidth);
    const minHeight = toPixelValue(options.minHeight);
    if (minWidth) {
        panel.style.minWidth = minWidth;
    }
    if (minHeight) {
        panel.style.minHeight = minHeight;
    }

    const onHandlePointerDown = (event) => {
        if (event.button !== 0) {
            return;
        }
        startPanelDrag(event, panel, dragHandle, options);
    };
    const onPanelPointerDown = (event) => {
        if (!shouldStartBorderDrag(event, panel, options)) {
            return;
        }
        startPanelDrag(event, panel, panel, options);
    };

    if (dragHandle) {
        dragHandle.classList.add(FLOATING_PANEL_DRAG_HANDLE_CLASS);
        dragHandle.addEventListener('pointerdown', onHandlePointerDown);
    }
    panel.addEventListener('pointerdown', onPanelPointerDown);

    return {
        destroy() {
            dragHandle?.removeEventListener?.('pointerdown', onHandlePointerDown);
            panel.removeEventListener?.('pointerdown', onPanelPointerDown);
        },
    };
}

export default enableFloatingPanel;
