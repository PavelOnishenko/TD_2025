import GameLoop from '../../../engine/core/GameLoop.js';
import Renderer from '../../../engine/core/Renderer.js';
import InputManager from '../../../engine/systems/InputManager.js';
import GameInputSetup from '../systems/game/GameInputSetup.js';
import { applyThemeToCSS, theme } from '../config/ThemeConfig.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import StateMachine from '../utils/StateMachine.js';
import { BattleUI, DeveloperUI, GameLogUI, HudElements, VillageUI, WorldUI } from '../systems/game/GameUiTypes.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from '../systems/game/runtime/GameBattleCoordinator.js';
import WorldModeController from '../systems/world/worldMap/WorldModeController.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import Player from '../entities/player/Player.js';
import MagicSystem from '../systems/magic/MagicSystem.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestUiController from '../systems/quest/QuestUiController.js';
import GameQuestRuntime from './runtime/GameQuestRuntime.js';
import GamePersistenceRuntime from './runtime/GamePersistenceRuntime.js';
import GameWorldInteractionRuntime from './runtime/GameWorldInteractionRuntime.js';
import GameFacadeLifecycleCoordinator from './runtime/GameFacadeLifecycleCoordinator.js';
import GameFacadeWorldInteractionCoordinator from './runtime/GameFacadeWorldInteractionCoordinator.js';
import { createGameRuntime } from './GameFactory.js';
import type { GameFacadeStateAccess } from './runtime/GameFacadeSharedTypes.js';

export type UIBundle = {
    hudElements: HudElements;
    worldUI: WorldUI;
    battleUI: BattleUI;
    villageUI: VillageUI;
    gameLogUI: GameLogUI;
    developerUI: DeveloperUI;
};

export type GameRuntimeAssignment = {
    player: Player;
    worldMap: WorldMap;
    battleMap: BattleMap;
    magicSystem: MagicSystem;
    ui: UIBundle;
    questGenerator: QuestGenerator;
    questUiController: QuestUiController;
    stateMachine: StateMachine;
    renderRouter: GameRenderRouter;
    villageCoordinator: GameVillageCoordinator;
    villageActionsController: VillageActionsController;
    worldModeController: WorldModeController;
    hudCoordinator: GameHudCoordinator;
    battleCoordinator: GameBattleCoordinator;
    devController: DeveloperEventController;
};

const SAVE_KEY = 'rgfn_game_save_v1';
const WORLD_MAP_COLUMNS = balanceConfig.worldMap.dimensions.columns ?? theme.worldMap.gridDimensions.columns;
const WORLD_MAP_ROWS = balanceConfig.worldMap.dimensions.rows ?? theme.worldMap.gridDimensions.rows;
const WORLD_MAP_CELL_SIZE = theme.worldMap.cellSize.default;

export class GameFacade implements GameFacadeStateAccess {
    public readonly canvas: HTMLCanvasElement;
    public readonly saveKey = SAVE_KEY;
    public readonly renderer: Renderer;
    public readonly input: InputManager;
    public readonly loop: GameLoop;
    public stateMachine!: StateMachine;
    public renderRouter!: GameRenderRouter;
    public villageCoordinator!: GameVillageCoordinator;
    public hudCoordinator!: GameHudCoordinator;
    public battleCoordinator!: GameBattleCoordinator;
    public worldModeController!: WorldModeController;
    public villageActionsController!: VillageActionsController;
    public worldMap!: WorldMap;
    public battleMap!: BattleMap;
    public player!: Player;
    public magicSystem!: MagicSystem;
    public readonly questRuntime = new GameQuestRuntime();
    public readonly persistenceRuntime = new GamePersistenceRuntime(SAVE_KEY);
    public readonly worldInteractionRuntime = new GameWorldInteractionRuntime();
    private readonly lifecycle = new GameFacadeLifecycleCoordinator(this);
    private readonly worldInteractionCoordinator = new GameFacadeWorldInteractionCoordinator(this);
    private devController: DeveloperEventController | null = null;

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop((dt: number) => this.update(dt), () => this.render());
        createGameRuntime(this, canvas, Boolean(window.localStorage.getItem(SAVE_KEY)), WORLD_MAP_COLUMNS, WORLD_MAP_ROWS, WORLD_MAP_CELL_SIZE);
        new GameInputSetup(this.input, { onToggleDeveloperModal: () => this.devController?.toggleModal() }).configure();
        window.addEventListener('resize', this.lifecycle.handleResize);
        this.lifecycle.handleResize();
        applyThemeToCSS();
    }

    public assignRuntime(runtime: GameRuntimeAssignment): void {
        this.player = runtime.player;
        this.worldMap = runtime.worldMap;
        this.battleMap = runtime.battleMap;
        this.magicSystem = runtime.magicSystem;
        this.stateMachine = runtime.stateMachine;
        this.renderRouter = runtime.renderRouter;
        this.villageCoordinator = runtime.villageCoordinator;
        this.villageActionsController = runtime.villageActionsController;
        this.worldModeController = runtime.worldModeController;
        this.hudCoordinator = runtime.hudCoordinator;
        this.battleCoordinator = runtime.battleCoordinator;
        this.devController = runtime.devController;
        this.questRuntime.initialize(
            runtime.questGenerator,
            runtime.questUiController,
            () => this.persistenceRuntime.getParsedSaveState()?.quest ?? null,
            (contracts) => this.villageActionsController.configureQuestBarterContracts(contracts),
            this.worldMap,
        );
        this.lifecycle.initializeAfterRuntimeAssignment();
    }

    public start(): void { this.lifecycle.start(); }
    public update(deltaTime: number): void { this.lifecycle.update(deltaTime); }
    public render(): void { this.lifecycle.render(); }
    public gameOver(): void { this.lifecycle.gameOver(); }
    public startNewCharacter(): void { this.lifecycle.startNewCharacter(); }
    public onGodSkillsBoost(): void { this.lifecycle.onGodSkillsBoost(); }
    public onQuestLocationClick(locationName: string): boolean { return this.lifecycle.onQuestLocationClick(locationName); }
    public onVillageBarterCompleted(trader: string, item: string, village: string): void { this.lifecycle.onVillageBarterCompleted(trader, item, village); }
    public onMonsterKilled(monsterName: string): void { this.lifecycle.onMonsterKilled(monsterName); }

    public tryCreateQuestMonsterEncounter = (): {
        enemies: import('../entities/Skeleton.js').default[];
        hint?: string;
    } | null => this.questRuntime.tryCreateQuestMonsterEncounter(this.worldMap);

    public onVillageEntered(_worldMap: WorldMap, _villageCoordinator: GameVillageCoordinator): void { this.lifecycle.onVillageEntered(); }
    public showVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }): void { this.worldInteractionCoordinator.showVillageEntryPrompt(worldUI, villageName, anchor); }
    public hideVillageEntryPrompt(worldUI: WorldUI): void { this.worldInteractionCoordinator.hideVillageEntryPrompt(worldUI); }
    public handleCanvasMove(event: MouseEvent): void { this.worldInteractionCoordinator.handleCanvasMove(event); }
    public handleCanvasLeave(): void { this.worldInteractionCoordinator.handleCanvasLeave(); }
    public handleWorldMapWheel(event: WheelEvent): void { this.worldInteractionCoordinator.handleWorldMapWheel(event); }
    public handleWorldMapMiddleDragStart(event: MouseEvent): void { this.worldInteractionCoordinator.handleWorldMapMiddleDragStart(event); }
    public handleWorldMapKeyboardZoom(direction: 'in' | 'out'): void { this.worldInteractionCoordinator.handleWorldMapKeyboardZoom(direction); }
    public centerWorldMapOnPlayer(): void { this.worldInteractionCoordinator.centerWorldMapOnPlayer(); }
    public tryEnterVillageFromWorldMap(): void { this.worldInteractionCoordinator.tryEnterVillageFromWorldMap(); }
    public confirmWorldVillageEntry(): void { this.worldInteractionCoordinator.confirmWorldVillageEntry(); }
}

export default GameFacade;
