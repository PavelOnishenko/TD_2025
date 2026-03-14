import VillageActionsController from '../village/VillageActionsController.js';
import DeveloperEventController from '../encounter/DeveloperEventController.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI } from './GameUiTypes.js';

type GameUiEventCallbacks = {
    onAttack: () => void;
    onFlee: () => void;
    onWait: () => void;
    onUsePotionFromBattle: () => void;
    onUsePotionFromHud: () => void;
    onAddStat: (stat: 'vitality' | 'toughness' | 'strength' | 'agility') => void;
    onCanvasClick: (event: MouseEvent) => void;
};

export default class GameUiEventBinder {
    private canvas: HTMLCanvasElement;
    private hudElements: HudElements;
    private battleUI: BattleUI;
    private villageUI: VillageUI;
    private developerUI: DeveloperUI;
    private villageActionsController: VillageActionsController;
    private developerEventController: DeveloperEventController;
    private callbacks: GameUiEventCallbacks;

    constructor(
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        battleUI: BattleUI,
        villageUI: VillageUI,
        developerUI: DeveloperUI,
        villageActionsController: VillageActionsController,
        developerEventController: DeveloperEventController,
        callbacks: GameUiEventCallbacks,
    ) {
        this.canvas = canvas;
        this.hudElements = hudElements;
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

        this.canvas.addEventListener('click', (event: MouseEvent) => this.callbacks.onCanvasClick(event));
    }

    private bindBattleEvents(): void {
        this.battleUI.attackBtn.addEventListener('click', () => this.callbacks.onAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.callbacks.onFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.callbacks.onWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromBattle());
        this.hudElements.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromHud());
    }

    private bindVillageEvents(villageNameProvider: () => string): void {
        this.villageUI.enterBtn.addEventListener('click', () => this.villageActionsController.handleEnter(villageNameProvider()));
        this.villageUI.skipBtn.addEventListener('click', () => this.villageActionsController.handleSkip());
        this.villageUI.waitBtn.addEventListener('click', () => this.villageActionsController.handleWait());
        this.villageUI.buyBtn.addEventListener('click', () => this.villageActionsController.handleBuyBow());
        this.villageUI.sellBtn.addEventListener('click', () => this.villageActionsController.handleSellBow());
        this.villageUI.buyPotionBtn.addEventListener('click', () => this.villageActionsController.handleBuyPotion());
        this.villageUI.sellPotionBtn.addEventListener('click', () => this.villageActionsController.handleSellPotion());
        this.villageUI.leaveBtn.addEventListener('click', () => this.villageActionsController.handleLeave());
    }

    private bindDeveloperEvents(): void {
        this.developerUI.addBtn.addEventListener('click', () => this.developerEventController.handleQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.developerEventController.handleQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.developerEventController.toggleModal(false));
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.modal) {
                this.developerEventController.toggleModal(false);
            }
        });
    }

    private bindStatEvents(): void {
        this.hudElements.addVitalityBtn.addEventListener('click', () => this.callbacks.onAddStat('vitality'));
        this.hudElements.addToughnessBtn.addEventListener('click', () => this.callbacks.onAddStat('toughness'));
        this.hudElements.addStrengthBtn.addEventListener('click', () => this.callbacks.onAddStat('strength'));
        this.hudElements.addAgilityBtn.addEventListener('click', () => this.callbacks.onAddStat('agility'));
    }
}
