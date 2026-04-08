import { HudElements } from './GameUiTypes.js';
import { GameUiEventCallbacks, HudPanelToggle } from './GameUiEventBinderTypes.js';

type PanelConfig = { key: HudPanelToggle; title: string; element: HTMLElement };
type LayoutContext = 'world' | 'battle';
type PanelLayoutSnapshot = {
    offsetX: number;
    offsetY: number;
    width: string | null;
    height: string | null;
    hidden: boolean;
    zIndex: number | null;
};
type StoredPanelLayout = Partial<Record<HudPanelToggle, PanelLayoutSnapshot>>;

export default class GameUiHudPanelController {
    private static readonly WORLD_LAYOUT_STORAGE_KEY = 'rgfn_hud_panel_layout_world_v1';
    private static readonly BATTLE_LAYOUT_STORAGE_KEY = 'rgfn_hud_panel_layout_battle_v1';
    private hudElements: HudElements;
    private callbacks: GameUiEventCallbacks;
    private nextPanelZIndex = 10;
    private readonly panelSpawnOrigin = { x: 24, y: 96 };
    private readonly panelSpawnStepY = 34;
    private activeLayoutContext: LayoutContext = 'world';

    constructor(hudElements: HudElements, callbacks: GameUiEventCallbacks) {
        this.hudElements = hudElements;
        this.callbacks = callbacks;
    }

    public bind(): void {
        this.bindHudMenuEvents();
        this.bindPanelToggleButtons();
        this.initializeHudPanelWindows();
        this.activeLayoutContext = this.getLayoutContextFromModeIndicator();
        this.restoreLayoutForCurrentContext();
        this.bindLayoutContextListener();
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
        this.hudElements.toggleGroupPanelBtn.addEventListener('click', () => this.handlePanelToggle('group'));
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

    private getPanelConfigs = (): PanelConfig[] => [
        { key: 'stats', title: 'Stats', element: this.hudElements.statsPanel },
        { key: 'skills', title: 'Skills', element: this.hudElements.skillsPanel },
        { key: 'inventory', title: 'Inventory', element: this.hudElements.inventoryPanel },
        { key: 'magic', title: 'Magic', element: this.hudElements.magicPanel },
        { key: 'quests', title: 'Quests', element: this.hudElements.questsPanel },
        { key: 'group', title: 'Group', element: this.hudElements.groupPanel },
        { key: 'lore', title: 'Lore', element: this.hudElements.lorePanel },
        { key: 'selected', title: 'Selected', element: this.hudElements.selectedPanel },
        { key: 'worldMap', title: 'World Map', element: this.hudElements.worldMapPanel },
        { key: 'log', title: 'Log', element: this.hudElements.logPanel },
    ];

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
        this.bindPanelPersistenceObserver(panel);
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
                this.persistCurrentContextLayout();
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
            this.ensurePanelDragHandleIsReachable(panel);
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
        const panelElement = this.getPanelElement(panel);
        if (panelElement && !panelElement.classList.contains('hidden')) {
            requestAnimationFrame(() => this.ensurePanelDragHandleIsReachable(panelElement));
        }
        this.setHudMenuOpen(false);
        this.persistCurrentContextLayout();
    }

    private setHudMenuOpen(isOpen: boolean): void {
        this.hudElements.hudMenuPanel.classList.toggle('hidden', !isOpen);
        this.hudElements.hudMenuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    private bindPanelPersistenceObserver(panel: HTMLElement): void {
        const observer = new MutationObserver(() => this.persistCurrentContextLayout());
        observer.observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    private bindLayoutContextListener(): void {
        const modeIndicator = this.hudElements.modeIndicator;
        const observer = new MutationObserver(() => this.handleLayoutContextChange());
        observer.observe(modeIndicator, { childList: true, characterData: true, subtree: true });
    }

    private handleLayoutContextChange(): void {
        const nextContext = this.getLayoutContextFromModeIndicator();
        if (nextContext === this.activeLayoutContext) {
            return;
        }

        this.persistCurrentContextLayout();
        this.activeLayoutContext = nextContext;
        this.restoreLayoutForCurrentContext();
    }

    private getLayoutContextFromModeIndicator(): LayoutContext {
        return this.hudElements.modeIndicator.textContent?.trim() === 'Battle!' ? 'battle' : 'world';
    }

    private restoreLayoutForCurrentContext(): void {
        const storedLayout = this.getStoredLayout(this.activeLayoutContext);
        const panelConfigs = this.getPanelConfigs();

        if (!storedLayout) {
            panelConfigs.forEach(({ element }, panelIndex) => this.resetPanelToSpawn(element, panelIndex));
            return;
        }

        panelConfigs.forEach(({ key, element }, panelIndex) => {
            const snapshot = storedLayout[key];
            if (!snapshot) {
                this.resetPanelToSpawn(element, panelIndex);
                return;
            }

            element.dataset.offsetX = String(snapshot.offsetX);
            element.dataset.offsetY = String(snapshot.offsetY);
            element.dataset.spawnPositioned = 'true';
            element.style.setProperty('--panel-offset-x', `${snapshot.offsetX}px`);
            element.style.setProperty('--panel-offset-y', `${snapshot.offsetY}px`);
            element.style.width = snapshot.width ?? '';
            element.style.height = snapshot.height ?? '';

            if (snapshot.zIndex !== null) {
                element.style.zIndex = String(snapshot.zIndex);
            } else {
                element.style.removeProperty('z-index');
            }

            element.classList.toggle('hidden', snapshot.hidden);

            if (!snapshot.hidden) {
                requestAnimationFrame(() => this.ensurePanelDragHandleIsReachable(element));
            }
        });
    }

    private resetPanelToSpawn(panel: HTMLElement, panelIndex: number): void {
        panel.dataset.offsetX = '0';
        panel.dataset.offsetY = '0';
        panel.dataset.spawnPositioned = 'false';
        panel.style.setProperty('--panel-offset-x', '0px');
        panel.style.setProperty('--panel-offset-y', '0px');
        panel.style.removeProperty('z-index');
        panel.style.width = '';
        panel.style.height = '';
        requestAnimationFrame(() => {
            if (panel.classList.contains('hidden')) {
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
            this.ensurePanelDragHandleIsReachable(panel);
        });
    }

    private getPanelElement = (panel: HudPanelToggle): HTMLElement | null => this.getPanelConfigs().find((config) => config.key === panel)?.element ?? null;

    private ensurePanelDragHandleIsReachable(panel: HTMLElement): void {
        if (panel.classList.contains('hidden')) {
            return;
        }

        const dragHandle = panel.querySelector<HTMLElement>('.panel-drag-handle');
        if (!dragHandle) {
            return;
        }

        const menuToggleRect = this.hudElements.hudMenuToggleBtn.getBoundingClientRect();
        const dragHandleRect = dragHandle.getBoundingClientRect();
        if (menuToggleRect.width <= 0 || menuToggleRect.height <= 0 || dragHandleRect.width <= 0 || dragHandleRect.height <= 0) {
            return;
        }

        if (!this.rectanglesOverlap(dragHandleRect, menuToggleRect)) {
            return;
        }

        const clearancePx = 12;
        const horizontalShift = (menuToggleRect.right + clearancePx) - dragHandleRect.left;
        const verticalShift = (menuToggleRect.bottom + clearancePx) - dragHandleRect.top;
        this.applyPanelNudge(panel, horizontalShift, verticalShift);
    }

    private rectanglesOverlap = (firstRect: DOMRect, secondRect: DOMRect): boolean => !(
        firstRect.right < secondRect.left
        || firstRect.left > secondRect.right
        || firstRect.bottom < secondRect.top
        || firstRect.top > secondRect.bottom
    );

    private applyPanelNudge(panel: HTMLElement, horizontalShift: number, verticalShift: number): void {
        const shouldShiftHorizontally = horizontalShift <= verticalShift;
        const currentOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const currentOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        const nextOffsetX = shouldShiftHorizontally ? (currentOffsetX + horizontalShift) : currentOffsetX;
        const nextOffsetY = shouldShiftHorizontally ? currentOffsetY : (currentOffsetY + verticalShift);
        this.applyPanelOffset(panel, nextOffsetX, nextOffsetY);
    }

    private applyPanelOffset(panel: HTMLElement, nextOffsetX: number, nextOffsetY: number): void {
        panel.dataset.offsetX = String(nextOffsetX);
        panel.dataset.offsetY = String(nextOffsetY);
        panel.dataset.spawnPositioned = 'true';
        panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
        panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
    }

    private persistCurrentContextLayout(): void {
        if (!window.localStorage) {
            return;
        }

        const layout: StoredPanelLayout = {};
        this.getPanelConfigs().forEach(({ key, element }) => {
            const offsetX = Number.parseFloat(element.dataset.offsetX ?? '0') || 0;
            const offsetY = Number.parseFloat(element.dataset.offsetY ?? '0') || 0;
            const zIndex = Number.parseInt(element.style.zIndex || '', 10);
            layout[key] = {
                offsetX,
                offsetY,
                width: element.style.width || null,
                height: element.style.height || null,
                hidden: element.classList.contains('hidden'),
                zIndex: Number.isFinite(zIndex) ? zIndex : null,
            };
        });

        window.localStorage.setItem(this.getStorageKey(this.activeLayoutContext), JSON.stringify(layout));
    }

    private getStoredLayout(context: LayoutContext): StoredPanelLayout | null {
        if (!window.localStorage) {
            return null;
        }

        const raw = window.localStorage.getItem(this.getStorageKey(context));
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as StoredPanelLayout;
        } catch {
            return null;
        }
    }

    private getStorageKey(context: LayoutContext): string {
        return context === 'battle'
            ? GameUiHudPanelController.BATTLE_LAYOUT_STORAGE_KEY
            : GameUiHudPanelController.WORLD_LAYOUT_STORAGE_KEY;
    }
}
