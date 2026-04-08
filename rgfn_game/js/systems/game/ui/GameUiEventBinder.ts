import VillageActionsController from '../../village/VillageActionsController.js';
import DeveloperEventController from '../../encounter/DeveloperEventController.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI, WorldUI } from './GameUiTypes.js';
import GameUiPrimaryEventBinder from './GameUiPrimaryEventBinder.js';
import GameUiHudPanelController from './GameUiHudPanelController.js';
import GameUiDevStatBinder from './GameUiDevStatBinder.js';
import GameUiActionPanelController from './GameUiActionPanelController.js';
import { GameUiEventCallbacks } from './GameUiEventBinderTypes.js';

export default class GameUiEventBinder {
    private primaryEventBinder: GameUiPrimaryEventBinder;
    private panelController: GameUiHudPanelController;
    private devStatBinder: GameUiDevStatBinder;
    private actionPanelController: GameUiActionPanelController;

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
        this.primaryEventBinder = this.createPrimaryEventBinder(canvas, hudElements, worldUI, battleUI, villageUI, villageActionsController, callbacks);
        this.panelController = this.createHudPanelController(hudElements, callbacks);
        this.devStatBinder = this.createDevStatBinder(hudElements, developerUI, developerEventController, callbacks);
        this.actionPanelController = new GameUiActionPanelController();
    }

    public bind(villageNameProvider: () => string): void {
        this.primaryEventBinder.bind(villageNameProvider);
        this.devStatBinder.bind();
        this.panelController.bind();
        this.actionPanelController.bind();
    }

    private createPrimaryEventBinder = (
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        worldUI: WorldUI,
        battleUI: BattleUI,
        villageUI: VillageUI,
        villageActionsController: VillageActionsController,
        callbacks: GameUiEventCallbacks,
    ): GameUiPrimaryEventBinder =>
        new GameUiPrimaryEventBinder(canvas, hudElements, worldUI, battleUI, villageUI, villageActionsController, callbacks);

    private createHudPanelController = (hudElements: HudElements, callbacks: GameUiEventCallbacks): GameUiHudPanelController =>
        new GameUiHudPanelController(hudElements, callbacks);

    private createDevStatBinder = (
        hudElements: HudElements,
        developerUI: DeveloperUI,
        developerEventController: DeveloperEventController,
        callbacks: GameUiEventCallbacks,
    ): GameUiDevStatBinder =>
        new GameUiDevStatBinder(hudElements, developerUI, developerEventController, callbacks);
}
