interface StoredPanelLayout {
    left: number;
    top: number;
    width: number;
    height: number;
}

interface StoredLayoutRecord {
    version: number;
    panels: Record<string, StoredPanelLayout>;
}

const STORAGE_KEY = 'rgfn.layouts.v1';
const LAYOUT_VERSION = 1;
const PANEL_SELECTOR = '.layout-panel[data-layout-panel-id]';

export default class LayoutManager {
    private readonly panels: Map<string, HTMLElement>;
    private readonly handles: Map<string, HTMLElement>;
    private readonly nameInput: HTMLInputElement | null;

    public constructor() {
        this.panels = new Map();
        this.handles = new Map();
        this.nameInput = document.getElementById('layout-name-input') as HTMLInputElement | null;

        this.collectPanels();
        this.attachButtonHandlers();
        this.installPanelControls();
    }

    private collectPanels(): void {
        const panelNodes = document.querySelectorAll<HTMLElement>(PANEL_SELECTOR);
        panelNodes.forEach((panel): void => {
            const panelId = panel.dataset.layoutPanelId;
            if (!panelId) {
                return;
            }

            this.panels.set(panelId, panel);
        });
    }

    private attachButtonHandlers(): void {
        const saveBtn = document.getElementById('layout-save-btn');
        const loadBtn = document.getElementById('layout-load-btn');
        const resetBtn = document.getElementById('layout-reset-btn');

        saveBtn?.addEventListener('click', (): void => {
            this.saveLayout();
        });

        loadBtn?.addEventListener('click', (): void => {
            this.loadLayout();
        });

        resetBtn?.addEventListener('click', (): void => {
            this.resetPanels();
        });
    }

    private installPanelControls(): void {
        this.panels.forEach((panel, panelId): void => {
            const dragHandle = document.createElement('button');
            dragHandle.type = 'button';
            dragHandle.className = 'layout-drag-handle';
            dragHandle.textContent = 'Move';
            dragHandle.title = `Move panel: ${panelId}`;

            panel.classList.add('layout-panel-enabled');
            panel.prepend(dragHandle);
            this.handles.set(panelId, dragHandle);

            this.enablePanelDragging(panelId, panel, dragHandle);
            this.enablePanelResize(panel);
        });
    }

    private enablePanelDragging(panelId: string, panel: HTMLElement, handle: HTMLElement): void {
        handle.addEventListener('pointerdown', (startEvent: PointerEvent): void => {
            startEvent.preventDefault();
            handle.setPointerCapture(startEvent.pointerId);

            this.preparePanelForFloating(panel);

            const startRect = panel.getBoundingClientRect();
            const startX = startEvent.clientX;
            const startY = startEvent.clientY;

            const onMove = (moveEvent: PointerEvent): void => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                const nextLeft = this.clamp(startRect.left + deltaX, 0, Math.max(0, window.innerWidth - panel.offsetWidth));
                const nextTop = this.clamp(startRect.top + deltaY, 0, Math.max(0, window.innerHeight - panel.offsetHeight));

                panel.style.left = `${Math.round(nextLeft)}px`;
                panel.style.top = `${Math.round(nextTop)}px`;
            };

            const onUp = (upEvent: PointerEvent): void => {
                handle.releasePointerCapture(upEvent.pointerId);
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);

                console.info(`Moved layout panel: ${panelId}`);
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });
    }

    private enablePanelResize(panel: HTMLElement): void {
        panel.style.resize = 'both';
        panel.style.overflow = 'auto';

        panel.addEventListener('pointerdown', (): void => {
            this.preparePanelForFloating(panel);
        });
    }

    private preparePanelForFloating(panel: HTMLElement): void {
        if (panel.classList.contains('layout-floating')) {
            return;
        }

        const rect = panel.getBoundingClientRect();
        panel.classList.add('layout-floating');
        panel.style.left = `${Math.round(rect.left)}px`;
        panel.style.top = `${Math.round(rect.top)}px`;
        panel.style.width = `${Math.round(rect.width)}px`;
        panel.style.height = `${Math.round(rect.height)}px`;
    }

    private saveLayout(): void {
        const layoutName = this.readLayoutName();
        if (!layoutName) {
            return;
        }

        const allLayouts = this.readAllLayouts();
        const panelLayouts: Record<string, StoredPanelLayout> = {};

        this.panels.forEach((panel, panelId): void => {
            const rect = panel.getBoundingClientRect();
            panelLayouts[panelId] = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        });

        allLayouts[layoutName] = {
            version: LAYOUT_VERSION,
            panels: panelLayouts
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
        console.info(`Layout '${layoutName}' saved`);
    }

    private loadLayout(): void {
        const layoutName = this.readLayoutName();
        if (!layoutName) {
            return;
        }

        const allLayouts = this.readAllLayouts();
        const record = allLayouts[layoutName];

        if (!record || record.version !== LAYOUT_VERSION) {
            console.warn(`Layout '${layoutName}' not found`);
            return;
        }

        Object.entries(record.panels).forEach(([panelId, panelState]): void => {
            const panel = this.panels.get(panelId);
            if (!panel) {
                return;
            }

            panel.classList.add('layout-floating');
            panel.style.left = `${panelState.left}px`;
            panel.style.top = `${panelState.top}px`;
            panel.style.width = `${panelState.width}px`;
            panel.style.height = `${panelState.height}px`;
        });

        console.info(`Layout '${layoutName}' loaded`);
    }

    private resetPanels(): void {
        this.panels.forEach((panel): void => {
            panel.classList.remove('layout-floating');
            panel.style.left = '';
            panel.style.top = '';
            panel.style.width = '';
            panel.style.height = '';
            panel.style.resize = 'both';
            panel.style.overflow = 'auto';
        });

        console.info('Layout reset to defaults');
    }

    private readLayoutName(): string {
        const rawName = this.nameInput?.value?.trim() ?? '';
        if (!rawName) {
            console.warn('Provide a layout name first');
        }

        return rawName;
    }

    private readAllLayouts(): Record<string, StoredLayoutRecord> {
        const rawData = window.localStorage.getItem(STORAGE_KEY);
        if (!rawData) {
            return {};
        }

        try {
            const parsed = JSON.parse(rawData) as Record<string, StoredLayoutRecord>;
            return parsed ?? {};
        } catch (error) {
            console.warn('Failed to parse saved layouts', error);
            return {};
        }
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(value, max));
    }
}
