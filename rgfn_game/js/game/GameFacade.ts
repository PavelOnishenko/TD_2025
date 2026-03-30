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
import WorldModeController from '../systems/WorldModeController.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import WorldMap from '../systems/world/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import Player from '../entities/player/Player.js';
import MagicSystem from '../systems/magic/MagicSystem.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestUiController from '../systems/quest/QuestUiController.js';
import { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameQuestRuntime from './runtime/GameQuestRuntime.js';
import GamePersistenceRuntime from './runtime/GamePersistenceRuntime.js';
import GameWorldInteractionRuntime from './runtime/GameWorldInteractionRuntime.js';
import { createGameRuntime } from './GameFactory.js';

export type UIBundle = {
    hudElements: HudElements;
    worldUI: WorldUI;
    battleUI: BattleUI;
    villageUI: VillageUI;
    gameLogUI: GameLogUI;
    developerUI: DeveloperUI;
};

const SAVE_KEY = 'rgfn_game_save_v1';
const WORLD_MAP_COLUMNS = balanceConfig.worldMap.dimensions.columns ?? theme.worldMap.gridDimensions.columns;
const WORLD_MAP_ROWS = balanceConfig.worldMap.dimensions.rows ?? theme.worldMap.gridDimensions.rows;
const WORLD_MAP_CELL_SIZE = theme.worldMap.cellSize.default;

export class GameFacade {
    public readonly canvas: HTMLCanvasElement;
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
    private readonly questRuntime = new GameQuestRuntime();
    private readonly persistenceRuntime = new GamePersistenceRuntime(SAVE_KEY);
    private readonly worldInteractionRuntime = new GameWorldInteractionRuntime();
    private devController: DeveloperEventController | null = null;

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop((dt: number) => this.update(dt), () => this.render());
        createGameRuntime(
            this,
            canvas,
            Boolean(window.localStorage.getItem(SAVE_KEY)),
            WORLD_MAP_COLUMNS,
            WORLD_MAP_ROWS,
            WORLD_MAP_CELL_SIZE,
        );
        new GameInputSetup(this.input, { onToggleDeveloperModal: () => this.devController?.toggleModal() }).configure();
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        if (!window.localStorage.getItem(SAVE_KEY)) {
            this.worldMap.centerOnPlayer();
        }
        applyThemeToCSS();
        this.syncPlayerToWorldMap();
        this.persistenceRuntime.loadGame(this.worldMap, this.player, this.magicSystem);
        this.refreshHud();
        this.persistenceRuntime.saveGameIfChanged(this.worldMap, this.player, this.magicSystem, this.questRuntime.activeQuest);
    }

    public assignRuntime(runtime: {
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
    }): void {
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
    }

    public start(): void {
        this.handleResize();
        this.refreshHud();
        this.loop.start();
    }

    public update(_deltaTime: number): void {
        this.stateMachine.update(_deltaTime);
        this.input.update();
        this.persistenceRuntime.saveGameIfChanged(
            this.worldMap,
            this.player,
            this.magicSystem,
            this.questRuntime.activeQuest,
        );
    }

    public render(): void {
        this.renderer.beginFrame();
        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.renderRouter.renderWorldMode();
        }
        if (this.stateMachine.isInState(MODES.VILLAGE)) {
            this.renderRouter.renderVillageMode();
        }
        if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderRouter.renderBattleMode(
                this.battleCoordinator.getCurrentEnemies(),
                this.battleCoordinator.getSelectedEnemy(),
            );
        }
        this.renderer.endFrame();
    }

    public gameOver(): void {
        this.loop.stop();
        alert('Game Over! A new character will be created.');
        this.startNewCharacter();
    }

    public startNewCharacter(): void {
        window.localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }

    public onGodSkillsBoost(): void {
        this.hudCoordinator.handleGodSkillsBoost();
        this.persistenceRuntime.saveGameIfChanged(
            this.worldMap,
            this.player,
            this.magicSystem,
            this.questRuntime.activeQuest,
        );
    }

    public onQuestLocationClick(locationName: string): boolean {
        const shown = this.worldMap.revealNamedLocation(locationName);
        if (shown) {
            this.stateMachine.transition(MODES.WORLD_MAP);
        }
        return shown;
    }

    public onVillageBarterCompleted(trader: string, item: string, village: string): void {
        const status = this.questRuntime.recordBarterCompletion(trader, item, village);
        if (status === 'updated') {
            this.hudCoordinator.addBattleLog(
                `Quest tracker: barter objective completed (${trader} -> ${item}).`,
                'system',
            );
        }
        if (status === 'no-objective') {
            this.hudCoordinator.addBattleLog(
                `Quest tracker: barter registered (${trader} -> ${item}), but no active objective matched.`,
                'system-message',
            );
        }
    }

    public onMonsterKilled(monsterName: string): void {
        if (this.questRuntime.recordMonsterKill(monsterName)) {
            this.hudCoordinator.addBattleLog(`Quest tracker: eliminated ${monsterName}.`, 'system');
        }
    }

    public tryCreateQuestMonsterEncounter = (): {
        enemies: import('../entities/Skeleton.js').default[];
        hint?: string;
    } | null => this.questRuntime.tryCreateQuestMonsterEncounter(this.worldMap);

    public onVillageEntered(worldMap: WorldMap, villageCoordinator: GameVillageCoordinator): void {
        this.questRuntime.recordLocationEntry(
            worldMap.getVillageNameAtPlayerPosition(),
            this.player.getInventory().map((item) => item.name),
        );
        villageCoordinator.enterVillageMode(
            this.canvas.width,
            this.canvas.height,
            worldMap.getVillageNameAtPlayerPosition(),
        );
    }

    public showVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }): void {
        this.worldInteractionRuntime.showWorldVillageEntryPrompt(worldUI, villageName, anchor, this.canvas);
    }

    public hideVillageEntryPrompt(worldUI: WorldUI): void {
        this.worldInteractionRuntime.hideWorldVillageEntryPrompt(worldUI);
    }

    public handleCanvasMove(event: MouseEvent): void {
        this.worldInteractionRuntime.handleCanvasMove(
            event,
            this.canvas,
            this.stateMachine as never,
            this.worldMap,
            this.battleMap,
            this.hudCoordinator,
            this.player,
        );
    }

    public handleCanvasLeave(): void {
        this.worldInteractionRuntime.handleCanvasLeave(
            this.stateMachine as never,
            this.worldMap,
            this.battleMap,
            this.hudCoordinator,
        );
    }

    public handleWorldMapWheel(event: WheelEvent): void {
        this.worldInteractionRuntime.handleWorldMapWheel(
            event,
            this.stateMachine as never,
            this.worldMap,
            this.player,
        );
    }

    public handleWorldMapMiddleDragStart(event: MouseEvent): void {
        this.worldInteractionRuntime.handleWorldMapMiddleDragStart(event, this.stateMachine as never);
    }

    public handleWorldMapKeyboardZoom(direction: 'in' | 'out'): void {
        this.worldInteractionRuntime.handleWorldMapKeyboardZoom(
            direction,
            this.stateMachine as never,
            this.worldMap,
            this.player,
        );
    }

    public centerWorldMapOnPlayer(): void {
        this.worldInteractionRuntime.centerWorldMapOnPlayer(this.stateMachine as never, this.worldMap, this.player);
    }

    public tryEnterVillageFromWorldMap(): void {
        this.worldInteractionRuntime.tryEnterVillageFromWorldMap(
            this.stateMachine as never,
            this.worldModeController,
            this.hudCoordinator,
        );
    }

    public confirmWorldVillageEntry(): void {
        this.worldInteractionRuntime.confirmWorldVillageEntry(
            this.stateMachine as never,
            this.worldModeController,
            this.hudCoordinator,
        );
    }

    private handleResize(): void {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(160, Math.floor(rect.width));
        const height = Math.max(160, Math.floor(rect.height));
        if (width !== this.canvas.width || height !== this.canvas.height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        if (this.worldMap && this.battleMap) {
            this.worldMap.resizeToCanvas(width, height);
            this.battleMap.resizeToCanvas(width, height);
            this.syncPlayerToWorldMap();
        }
    }

    private refreshHud(): void {
        if (this.hudCoordinator) {
            this.hudCoordinator.updateHUD();
            this.hudCoordinator.updateSelectedCell(this.worldMap.getSelectedCellInfo());
        }
    }

    private syncPlayerToWorldMap(): void {
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }
}

export default GameFacade;
