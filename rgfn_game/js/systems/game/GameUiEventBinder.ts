import VillageActionsController from '../village/VillageActionsController.js';
import DeveloperEventController from '../encounter/DeveloperEventController.js';
import { RandomEncounterType } from '../encounter/EncounterSystem.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI, WorldUI } from './GameUiTypes.js';
import { BaseSpellId } from '../magic/MagicSystem.js';
import { CombatMove } from '../combat/DirectionalCombat.js';

type GameUiEventCallbacks = {
    onAttack: () => void;
    onDirectionalCombatMove: (move: CombatMove) => void;
    onFlee: () => void;
    onWait: () => void;
    onUsePotionFromBattle: () => void;
    onUseManaPotionFromBattle: () => void;
    onUsePotionFromHud: () => void;
    onUseManaPotionFromHud: () => void;
    onNewCharacter: () => void;
    onAddStat: (stat: 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence') => void;
    onRemoveStat: (stat: 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence') => void;
    onSaveSkillChanges: () => void;
    onGodSkillsBoost: () => void;
    onCastSpell: (spellId: BaseSpellId) => void;
    onUpgradeSpell: (spellId: BaseSpellId) => void;
    onCanvasClick: (event: MouseEvent) => void;
    onCanvasMove: (event: MouseEvent) => void;
    onCanvasLeave: () => void;
    onWorldMapZoomIn: () => void;
    onWorldMapZoomOut: () => void;
    onWorldMapPan: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onCenterWorldMapOnPlayer: () => void;
    onUsePotionFromWorld: () => void;
    onEnterVillageFromWorld: () => void;
    onCampSleepFromWorld: () => void;
    onTogglePanel: (panel: 'stats' | 'skills' | 'inventory' | 'magic' | 'quests' | 'lore' | 'selected' | 'worldMap' | 'log') => void;
};

type HudPanelToggle = 'stats' | 'skills' | 'inventory' | 'magic' | 'quests' | 'lore' | 'selected' | 'worldMap' | 'log';

export default class GameUiEventBinder {
    private canvas: HTMLCanvasElement;
    private hudElements: HudElements;
    private worldUI: WorldUI;
    private battleUI: BattleUI;
    private villageUI: VillageUI;
    private developerUI: DeveloperUI;
    private villageActionsController: VillageActionsController;
    private developerEventController: DeveloperEventController;
    private callbacks: GameUiEventCallbacks;
    private nextPanelZIndex = 10;
    private readonly panelSpawnOrigin = { x: 24, y: 96 };
    private readonly panelSpawnStepY = 34;
    private readonly staticHudPanels = new Set<HudPanelToggle>(['worldMap']);

    constructor(
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        worldUI: WorldUI,
        battleUI: BattleUI,
        villageUI: VillageUI,
        developerUI: DeveloperUI,
        villageActionsController: VillageActionsController,
        developerEventController: DeveloperEventController,
        callbacks: GameUiEventCallbacks,
    ) {
        this.canvas = canvas;
        this.hudElements = hudElements;
        this.worldUI = worldUI;
        this.battleUI = battleUI;
        this.villageUI = villageUI;
        this.developerUI = developerUI;
        this.villageActionsController = villageActionsController;
        this.developerEventController = developerEventController;
        this.callbacks = callbacks;
    }

    public bind(villageNameProvider: () => string): void {
        this.bindBattleEvents();
        this.bindVillageEvents(villageNameProvider);
        this.bindDeveloperEvents();
        this.bindStatEvents();
        this.bindHudMenuEvents();
        this.initializeHudPanelWindows();

        this.canvas.addEventListener('click', (event: MouseEvent) => this.callbacks.onCanvasClick(event));
        this.canvas.addEventListener('mousemove', (event: MouseEvent) => this.callbacks.onCanvasMove(event));
        this.canvas.addEventListener('mouseleave', () => this.callbacks.onCanvasLeave());
    }

    private bindBattleEvents(): void {
        this.battleUI.attackBtn.addEventListener('click', () => this.callbacks.onAttack());
        Object.entries(this.battleUI.directionalButtons).forEach(([move, button]) => {
            button.addEventListener('click', () => this.callbacks.onDirectionalCombatMove(move as CombatMove));
        });
        this.battleUI.fleeBtn.addEventListener('click', () => this.callbacks.onFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.callbacks.onWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromBattle());
        this.battleUI.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromBattle());
        this.battleUI.spellFireballBtn.addEventListener('click', () => this.callbacks.onCastSpell('fireball'));
        this.battleUI.spellCurseBtn.addEventListener('click', () => this.callbacks.onCastSpell('curse'));
        this.battleUI.spellSlowBtn.addEventListener('click', () => this.callbacks.onCastSpell('slow'));
        this.battleUI.spellRageBtn.addEventListener('click', () => this.callbacks.onCastSpell('rage'));
        this.battleUI.spellArcaneLanceBtn.addEventListener('click', () => this.callbacks.onCastSpell('arcane-lance'));
        this.hudElements.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromHud());
        this.hudElements.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromHud());
        this.hudElements.newCharacterBtn.addEventListener('click', () => this.callbacks.onNewCharacter());
        this.hudElements.worldMapZoomInBtn.addEventListener('click', () => this.callbacks.onWorldMapZoomIn());
        this.hudElements.worldMapZoomOutBtn.addEventListener('click', () => this.callbacks.onWorldMapZoomOut());
        this.hudElements.worldMapPanUpBtn.addEventListener('click', () => this.callbacks.onWorldMapPan('up'));
        this.hudElements.worldMapPanDownBtn.addEventListener('click', () => this.callbacks.onWorldMapPan('down'));
        this.hudElements.worldMapPanLeftBtn.addEventListener('click', () => this.callbacks.onWorldMapPan('left'));
        this.hudElements.worldMapPanRightBtn.addEventListener('click', () => this.callbacks.onWorldMapPan('right'));
        this.worldUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromWorld());
        this.worldUI.enterVillageBtn.addEventListener('click', () => this.callbacks.onEnterVillageFromWorld());
        this.worldUI.campSleepBtn.addEventListener('click', () => this.callbacks.onCampSleepFromWorld());
        this.worldUI.centerOnCharacterBtn.addEventListener('click', () => this.callbacks.onCenterWorldMapOnPlayer());
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

    private bindHudMenuEvents(): void {
        this.hudElements.hudMenuToggleBtn.addEventListener('click', () => {
            const menuIsClosed = this.hudElements.hudMenuPanel.classList.contains('hidden');
            this.setHudMenuOpen(menuIsClosed);
        });
    }

    private handlePanelToggle(panel: HudPanelToggle): void {
        this.callbacks.onTogglePanel(panel);
        this.setHudMenuOpen(false);
    }

    private setHudMenuOpen(isOpen: boolean): void {
        this.hudElements.hudMenuPanel.classList.toggle('hidden', !isOpen);
        this.hudElements.hudMenuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    private initializeHudPanelWindows(): void {
        const panels: Array<{ key: HudPanelToggle; title: string; element: HTMLElement }> = [
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

        panels.forEach(({ key, title, element }, panelIndex) => this.decorateHudPanelWindow(key, title, element, panelIndex));
    }

    private decorateHudPanelWindow(panelKey: HudPanelToggle, title: string, panel: HTMLElement, panelIndex: number): void {
        if (panel.querySelector('.panel-window-header')) {
            return;
        }

        if (this.staticHudPanels.has(panelKey)) {
            panel.classList.add('static-panel-window');
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
        closeBtn.addEventListener('click', () => {
            if (!panel.classList.contains('hidden')) {
                this.callbacks.onTogglePanel(panelKey);
            }
            this.setHudMenuOpen(false);
        });

        header.append(dragHandle, closeBtn);
        panel.prepend(header);

        this.bindPanelDragEvents(panel, dragHandle);
        this.bindPanelSpawnPositioning(panel, panelIndex);
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

        const visibilityObserver = new MutationObserver(() => {
            scheduleSpawnPlacement();
        });

        visibilityObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
    }

    private bindVillageEvents(villageNameProvider: () => string): void {
        this.villageUI.enterBtn.addEventListener('click', () => this.villageActionsController.handleEnter(villageNameProvider()));
        this.villageUI.skipBtn.addEventListener('click', () => this.villageActionsController.handleSkip());
        this.villageUI.waitBtn.addEventListener('click', () => this.villageActionsController.handleWait());
        this.villageUI.buyOffer1Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(0));
        this.villageUI.buyOffer2Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(1));
        this.villageUI.buyOffer3Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(2));
        this.villageUI.buyOffer4Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(3));
        this.villageUI.sellSelect.addEventListener('focus', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelect.addEventListener('pointerdown', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelect.addEventListener('change', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelectedBtn.addEventListener('click', () => this.villageActionsController.handleSellSelected());
        this.villageUI.askVillageInput.addEventListener('input', () => this.villageActionsController.updateButtons());
        this.villageUI.openDialogueBtn.addEventListener('click', () => this.villageActionsController.openDialogueWindow());
        this.villageUI.dialogueCloseBtn.addEventListener('click', () => this.villageActionsController.closeDialogueWindow());
        this.villageUI.dialogueModal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.villageUI.dialogueModal) {
                this.villageActionsController.closeDialogueWindow();
            }
        });
        this.villageUI.askVillageBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutSettlement());
        this.villageUI.askPersonInput.addEventListener('input', () => this.villageActionsController.updateButtons());
        this.villageUI.askPersonBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutPerson());
        this.villageUI.askBarterBtn.addEventListener('click', () => this.villageActionsController.handleAskAboutBarter());
        this.villageUI.barterNowBtn.addEventListener('click', () => this.villageActionsController.handleConfirmBarter());
        this.villageUI.sleepRoomBtn.addEventListener('click', () => this.villageActionsController.handleSleepInRoom());
        this.villageUI.leaveBtn.addEventListener('click', () => this.villageActionsController.handleLeave());
    }

    private bindDeveloperEvents(): void {
        this.developerUI.addBtn.addEventListener('click', () => this.developerEventController.handleQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.developerEventController.handleQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.developerEventController.toggleModal(false));
        this.bindEncounterTypeToggleEvents();
        this.developerUI.nextRollOpenBtn.addEventListener('click', () => this.developerEventController.toggleNextCharacterRollModal(true));
        this.developerUI.nextRollCloseBtn.addEventListener('click', () => this.developerEventController.toggleNextCharacterRollModal(false));
        this.developerUI.nextRollSaveBtn.addEventListener('click', () => this.developerEventController.handleNextCharacterRollSave());
        this.developerUI.nextRollClearBtn.addEventListener('click', () => this.developerEventController.handleNextCharacterRollClear());
        this.developerUI.randomModeSelect.addEventListener('change', () => this.developerEventController.handleRandomSettingsInputChanged());
        this.developerUI.randomSeedInput.addEventListener('input', () => this.developerEventController.handleRandomSettingsInputChanged());
        this.developerUI.randomApplyBtn.addEventListener('click', () => this.developerEventController.handleRandomSettingsApply());
        this.developerUI.everythingDiscoveredToggle.addEventListener('change', () => this.developerEventController.handleMapDisplayToggle('everythingDiscovered', this.developerUI.everythingDiscoveredToggle.checked));
        this.developerUI.fogOfWarToggle.addEventListener('change', () => this.developerEventController.handleMapDisplayToggle('fogOfWar', this.developerUI.fogOfWarToggle.checked));
        Object.values(this.developerUI.nextRollInputs).forEach((input) => {
            input.addEventListener('input', () => this.developerEventController.handleNextCharacterRollInputChanged());
        });
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.modal) {
                this.developerEventController.toggleModal(false);
            }
        });
        this.developerUI.nextRollModal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.nextRollModal) {
                this.developerEventController.toggleNextCharacterRollModal(false);
            }
        });
    }

    private bindEncounterTypeToggleEvents(): void {
        this.developerUI.enableAllEncountersBtn.addEventListener('click', () => this.developerEventController.handleEncounterTypesToggleAll(true));
        this.developerUI.disableAllEncountersBtn.addEventListener('click', () => this.developerEventController.handleEncounterTypesToggleAll(false));
        Object.entries(this.developerUI.encounterTypeToggles).forEach(([type, input]) => {
            input.addEventListener('change', () => this.developerEventController.handleEncounterTypeToggle(type as RandomEncounterType, input.checked));
        });
    }

    private bindStatEvents(): void {
        this.hudElements.addVitalityBtn.addEventListener('click', () => this.callbacks.onAddStat('vitality'));
        this.hudElements.addToughnessBtn.addEventListener('click', () => this.callbacks.onAddStat('toughness'));
        this.hudElements.addStrengthBtn.addEventListener('click', () => this.callbacks.onAddStat('strength'));
        this.hudElements.addAgilityBtn.addEventListener('click', () => this.callbacks.onAddStat('agility'));
        this.hudElements.addConnectionBtn.addEventListener('click', () => this.callbacks.onAddStat('connection'));
        this.hudElements.addIntelligenceBtn.addEventListener('click', () => this.callbacks.onAddStat('intelligence'));
        this.hudElements.subVitalityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('vitality'));
        this.hudElements.subToughnessBtn.addEventListener('click', () => this.callbacks.onRemoveStat('toughness'));
        this.hudElements.subStrengthBtn.addEventListener('click', () => this.callbacks.onRemoveStat('strength'));
        this.hudElements.subAgilityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('agility'));
        this.hudElements.subConnectionBtn.addEventListener('click', () => this.callbacks.onRemoveStat('connection'));
        this.hudElements.subIntelligenceBtn.addEventListener('click', () => this.callbacks.onRemoveStat('intelligence'));
        this.hudElements.saveSkillsBtn.addEventListener('click', () => this.callbacks.onSaveSkillChanges());
        this.hudElements.godSkillsBtn.addEventListener('click', () => this.callbacks.onGodSkillsBoost());
        this.hudElements.upgradeFireballBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('fireball'));
        this.hudElements.upgradeCurseBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('curse'));
        this.hudElements.upgradeSlowBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('slow'));
        this.hudElements.upgradeRageBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('rage'));
        this.hudElements.upgradeArcaneLanceBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('arcane-lance'));
    }
}
