type ActionPanelConfig = {
    elementId: string;
    title: string;
    offsetX: number;
    offsetY: number;
};

export default class GameUiActionPanelController {
    private static readonly ACTION_PANELS: ActionPanelConfig[] = [
        { elementId: 'village-actions', title: 'Village Actions', offsetX: 0, offsetY: 0 },
        { elementId: 'battle-actions', title: 'Combat Actions', offsetX: 18, offsetY: 18 },
        { elementId: 'village-rumors-section', title: 'Village Rumors', offsetX: 36, offsetY: 36 },
    ];
    private nextZIndex = 8;

    public bind(): void {
        GameUiActionPanelController.ACTION_PANELS.forEach((config) => this.decorate(config));
    }

    private decorate(config: ActionPanelConfig): void {
        const panel = document.getElementById(config.elementId);
        if (!panel || panel.querySelector('.panel-window-header')) {
            return;
        }

        panel.classList.add('aux-draggable-panel');
        panel.prepend(this.createHeader(config.title));
        this.seedPosition(panel, config);
        this.bindDrag(panel);
    }

    private createHeader(title: string): HTMLElement {
        const header = document.createElement('div');
        header.className = 'panel-window-header panel-window-header-aux';
        const handle = document.createElement('div');
        handle.className = 'panel-drag-handle';
        handle.textContent = title;
        handle.title = 'Drag to move panel';
        header.append(handle);
        return header;
    }

    private seedPosition(panel: HTMLElement, config: ActionPanelConfig): void {
        requestAnimationFrame(() => this.applySeed(panel, config));
    }

    private applySeed(panel: HTMLElement, config: ActionPanelConfig): void {
        if (panel.dataset.spawnPositioned === 'true') {
            return;
        }

        const rect = panel.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return;
        }

        const offsetX = rect.left + config.offsetX;
        const offsetY = rect.top + config.offsetY;
        panel.dataset.offsetX = String(offsetX);
        panel.dataset.offsetY = String(offsetY);
        panel.dataset.spawnPositioned = 'true';
        panel.style.setProperty('--panel-offset-x', `${offsetX}px`);
        panel.style.setProperty('--panel-offset-y', `${offsetY}px`);
    }

    private bindDrag(panel: HTMLElement): void {
        const dragHandle = panel.querySelector('.panel-drag-handle');
        if (!(dragHandle instanceof HTMLElement)) {
            return;
        }

        dragHandle.addEventListener('pointerdown', (event) => this.handlePointerDown(event, panel, dragHandle));
    }

    private handlePointerDown(event: PointerEvent, panel: HTMLElement, dragHandle: HTMLElement): void {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        dragHandle.setPointerCapture(event.pointerId);
        this.startDragging(panel);
        const dragState = this.buildDragState(event, panel);
        const onMove = (moveEvent: PointerEvent): void => this.handlePointerMove(moveEvent, panel, dragState);
        const stop = (): void => this.stopDrag(panel, dragHandle, onMove, stop);
        dragHandle.addEventListener('pointermove', onMove);
        dragHandle.addEventListener('pointerup', stop);
        dragHandle.addEventListener('pointercancel', stop);
    }

    private startDragging(panel: HTMLElement): void {
        panel.style.zIndex = String(this.nextZIndex++);
        panel.classList.add('panel-dragging');
    }

    private buildDragState(event: PointerEvent, panel: HTMLElement): { startX: number; startY: number; baseX: number; baseY: number } {
        const baseX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const baseY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        return { startX: event.clientX, startY: event.clientY, baseX, baseY };
    }

    private handlePointerMove(event: PointerEvent, panel: HTMLElement, dragState: { startX: number; startY: number; baseX: number; baseY: number }): void {
        const offsetX = dragState.baseX + (event.clientX - dragState.startX);
        const offsetY = dragState.baseY + (event.clientY - dragState.startY);
        panel.dataset.offsetX = String(offsetX);
        panel.dataset.offsetY = String(offsetY);
        panel.style.setProperty('--panel-offset-x', `${offsetX}px`);
        panel.style.setProperty('--panel-offset-y', `${offsetY}px`);
    }

    private stopDrag(panel: HTMLElement, dragHandle: HTMLElement, onMove: (event: PointerEvent) => void, stop: () => void): void {
        panel.classList.remove('panel-dragging');
        dragHandle.removeEventListener('pointermove', onMove);
        dragHandle.removeEventListener('pointerup', stop);
        dragHandle.removeEventListener('pointercancel', stop);
    }
}
