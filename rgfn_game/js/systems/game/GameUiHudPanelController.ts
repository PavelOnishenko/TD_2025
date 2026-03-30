import { HudElements } from './GameUiTypes.js';
import { GameUiEventCallbacks, HudPanelToggle } from './GameUiEventBinderTypes.js';

type PanelConfig = { key: HudPanelToggle; title: string; element: HTMLElement };

export default class GameUiHudPanelController {
    private hudElements: HudElements;
    private callbacks: GameUiEventCallbacks;
    private nextPanelZIndex = 10;
    private readonly panelSpawnOrigin = { x: 24, y: 96 };
    private readonly panelSpawnStepY = 34;

    constructor(hudElements: HudElements, callbacks: GameUiEventCallbacks) {
        this.hudElements = hudElements;
        this.callbacks = callbacks;
    }

    public bind(): void {
        this.bindHudMenuEvents();
        this.bindPanelToggleButtons();
        this.initializeHudPanelWindows();
    }

    private bindHudMenuEvents(): void {
        this.hudElements.hudMenuToggleBtn.addEventListener('click', () => {
            const menuIsClosed = this.hudElements.hudMenuPanel.classList.contains('hidden');
            this.setHudMenuOpen(menuIsClosed);
        });
    }

    private bindPanelToggleButtons(): void {
        this.hudElements.toggleStatsPanelBtn.addEventListener('click', () => this.handlePanelToggle('stats'));
        this.hudElements.toggleSkillsPanelBtn.addEventListener('click', () => this.handlePanelToggle('skills'));
        this.hudElements.toggleInventoryPanelBtn.addEventListener('click', () => this.handlePanelToggle('inventory'));
        this.hudElements.toggleMagicPanelBtn.addEventListener('click', () => this.handlePanelToggle('magic'));
        this.hudElements.toggleQuestsPanelBtn.addEventListener('click', () => this.handlePanelToggle('quests'));
        this.hudElements.toggleLorePanelBtn.addEventListener('click', () => this.handlePanelToggle('lore'));
        this.hudElements.toggleSelectedPanelBtn.addEventListener('click', () => this.handlePanelToggle('selected'));
        this.hudElements.toggleWorldMapPanelBtn.addEventListener('click', () => this.handlePanelToggle('worldMap'));
        this.hudElements.toggleLogPanelBtn.addEventListener('click', () => this.handlePanelToggle('log'));
    }

    private initializeHudPanelWindows(): void {
        this.getPanelConfigs().forEach(({ key, title, element }, panelIndex) => {
            this.decorateHudPanelWindow(key, title, element, panelIndex);
        });
    }

    private getPanelConfigs(): PanelConfig[] {
        return [
            { key: 'stats', title: 'Stats', element: this.hudElements.statsPanel },
            { key: 'skills', title: 'Skills', element: this.hudElements.skillsPanel },
            { key: 'inventory', title: 'Inventory', element: this.hudElements.inventoryPanel },
            { key: 'magic', title: 'Magic', element: this.hudElements.magicPanel },
            { key: 'quests', title: 'Quests', element: this.hudElements.questsPanel },
            { key: 'lore', title: 'Lore', element: this.hudElements.lorePanel },
            { key: 'selected', title: 'Selected', element: this.hudElements.selectedPanel },
            { key: 'worldMap', title: 'World Map', element: this.hudElements.worldMapPanel },
            { key: 'log', title: 'Log', element: this.hudElements.logPanel },
        ];
    }

    private decorateHudPanelWindow(panelKey: HudPanelToggle, title: string, panel: HTMLElement, panelIndex: number): void {
        if (panel.querySelector('.panel-window-header')) {
            return;
        }

        panel.classList.add('draggable-panel');
        const header = document.createElement('div');
        header.className = 'panel-window-header';

        const dragHandle = document.createElement('div');
        dragHandle.className = 'panel-drag-handle';
        dragHandle.textContent = title;
        dragHandle.title = 'Drag to move panel';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-btn panel-close-btn';
        closeBtn.type = 'button';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', `Close ${title} panel`);
        closeBtn.addEventListener('click', () => this.handlePanelClose(panelKey, panel));

        header.append(dragHandle, closeBtn);
        panel.prepend(header);
        this.bindPanelDragEvents(panel, dragHandle);
        this.bindPanelSpawnPositioning(panel, panelIndex);
    }

    private handlePanelClose(panelKey: HudPanelToggle, panel: HTMLElement): void {
        if (!panel.classList.contains('hidden')) {
            this.callbacks.onTogglePanel(panelKey);
        }

        this.setHudMenuOpen(false);
    }

    private bindPanelDragEvents(panel: HTMLElement, dragHandle: HTMLElement): void {
        dragHandle.addEventListener('pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();
            dragHandle.setPointerCapture(event.pointerId);
            panel.style.zIndex = String(this.nextPanelZIndex++);
            panel.classList.add('panel-dragging');

            const startX = event.clientX;
            const startY = event.clientY;
            const initialOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
            const initialOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;

            const onPointerMove = (moveEvent: PointerEvent): void => {
                const nextOffsetX = initialOffsetX + (moveEvent.clientX - startX);
                const nextOffsetY = initialOffsetY + (moveEvent.clientY - startY);
                panel.dataset.offsetX = String(nextOffsetX);
                panel.dataset.offsetY = String(nextOffsetY);
                panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
                panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
            };

            const stopDrag = (): void => {
                panel.classList.remove('panel-dragging');
                dragHandle.removeEventListener('pointermove', onPointerMove);
                dragHandle.removeEventListener('pointerup', stopDrag);
                dragHandle.removeEventListener('pointercancel', stopDrag);
            };

            dragHandle.addEventListener('pointermove', onPointerMove);
            dragHandle.addEventListener('pointerup', stopDrag);
            dragHandle.addEventListener('pointercancel', stopDrag);
        });
    }

    private bindPanelSpawnPositioning(panel: HTMLElement, panelIndex: number): void {
        const placePanelAtSpawn = (): void => {
            if (panel.classList.contains('hidden') || panel.dataset.spawnPositioned === 'true') {
                return;
            }

            const panelRect = panel.getBoundingClientRect();
            if (panelRect.width <= 0 || panelRect.height <= 0) {
                return;
            }

            const targetX = this.panelSpawnOrigin.x;
            const targetY = this.panelSpawnOrigin.y + (panelIndex * this.panelSpawnStepY);
            const nextOffsetX = targetX - panelRect.left;
            const nextOffsetY = targetY - panelRect.top;
            panel.dataset.offsetX = String(nextOffsetX);
            panel.dataset.offsetY = String(nextOffsetY);
            panel.dataset.spawnPositioned = 'true';
            panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
            panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
        };

        const scheduleSpawnPlacement = (): void => {
            requestAnimationFrame(() => placePanelAtSpawn());
        };
        scheduleSpawnPlacement();
        const visibilityObserver = new MutationObserver(() => scheduleSpawnPlacement());
        visibilityObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
    }

    private handlePanelToggle(panel: HudPanelToggle): void {
        this.callbacks.onTogglePanel(panel);
        this.setHudMenuOpen(false);
    }

    private setHudMenuOpen(isOpen: boolean): void {
        this.hudElements.hudMenuPanel.classList.toggle('hidden', !isOpen);
        this.hudElements.hudMenuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
}
