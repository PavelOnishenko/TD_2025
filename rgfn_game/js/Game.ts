import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js';
import WorldMap from './systems/world/WorldMap.js';
import BattleMap from './systems/combat/BattleMap.js';
import TurnManager from './systems/combat/TurnManager.js';
import EncounterSystem, { ForcedEncounterType } from './systems/encounter/EncounterSystem.js';
import VillagePopulation from './systems/village/VillagePopulation.js';
import VillageActionsController from './systems/village/VillageActionsController.js';
import DeveloperEventController from './systems/encounter/DeveloperEventController.js';
import VillageEnvironmentRenderer from './systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from './systems/village/VillageLifeRenderer.js';
import HudController from './systems/HudController.js';
import BattleUiController from './systems/BattleUiController.js';
import WorldModeController from './systems/WorldModeController.js';
import Player from './entities/Player.js';
import Skeleton from './entities/Skeleton.js';
import timingConfig from './config/timingConfig.js';
import { Direction } from './types/game.js';
import { BattleSplash } from './ui/BattleSplash.js';
import { ItemDiscoverySplash } from './ui/ItemDiscoverySplash.js';
import { applyThemeToCSS, theme } from './config/ThemeConfig.js';
import GameUiFactory from './systems/game/GameUiFactory.js';
import GameInputSetup from './systems/game/GameInputSetup.js';
import GameUiEventBinder from './systems/game/GameUiEventBinder.js';
import BattleTurnController from './systems/game/BattleTurnController.js';
import BattlePlayerActionController from './systems/game/BattlePlayerActionController.js';
import BattleCommandController from './systems/game/BattleCommandController.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI } from './systems/game/GameUiTypes.js';

const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
    VILLAGE: 'VILLAGE',
};



export default class Game {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private input: InputManager;
    private loop: GameLoop;
    private player: Player;
    private worldMap: WorldMap;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private encounterSystem: EncounterSystem;
    private currentEnemies: Skeleton[];
    private turnTransitioning: boolean;
    private stateMachine: StateMachine;
    private hudElements: HudElements;
    private battleUI: BattleUI;
    private villageUI: VillageUI;
    private battleSplash: BattleSplash;
    private itemDiscoverySplash: ItemDiscoverySplash;
    private developerUI: DeveloperUI;
    private villagePopulation: VillagePopulation;
    private villageEnvironmentRenderer: VillageEnvironmentRenderer;
    private villageLifeRenderer: VillageLifeRenderer;
    private villageActionsController: VillageActionsController | null;
    private developerEventController: DeveloperEventController | null;
    private hudController: HudController | null;
    private battleUiController: BattleUiController | null;
    private worldModeController: WorldModeController | null;
    private battleTurnController: BattleTurnController | null;
    private battlePlayerActionController: BattlePlayerActionController | null;
    private battleCommandController: BattleCommandController | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop(
            (dt: number) => this.update(dt),
            (dt: number) => this.render(dt)
        );

        // Game state
        this.player = new Player(0, 0);
        this.worldMap = new WorldMap(20, 15, 40);
        this.battleMap = new BattleMap();
        this.turnManager = new TurnManager();
        this.encounterSystem = new EncounterSystem();
        this.currentEnemies = [];
        this.turnTransitioning = false;

        // State machine for game modes
        this.stateMachine = new StateMachine(MODES.WORLD_MAP);
        this.stateMachine
            .addState(MODES.WORLD_MAP, {
                enter: () => this.enterWorldMode(),
                update: (dt: number) => this.updateWorldMode(dt),
            })
            .addState(MODES.BATTLE, {
                enter: (enemies: Skeleton[]) => this.enterBattleMode(enemies),
                update: (dt: number) => this.updateBattleMode(dt),
                exit: () => this.exitBattleMode(),
            })
            .addState(MODES.VILLAGE, {
                enter: () => this.enterVillageMode(),
                update: () => {},
                exit: () => this.exitVillageMode(),
            });

        // UI elements
        this.hudElements = {} as HudElements;
        this.battleUI = {} as BattleUI;
        this.villageUI = {} as VillageUI;
        this.developerUI = {} as DeveloperUI;
        this.villagePopulation = new VillagePopulation();
        this.villageEnvironmentRenderer = new VillageEnvironmentRenderer();
        this.villageLifeRenderer = new VillageLifeRenderer(this.villagePopulation);
        this.villageActionsController = null;
        this.developerEventController = null;
        this.hudController = null;
        this.battleUiController = null;
        this.worldModeController = null;
        this.battleTurnController = null;
        this.battlePlayerActionController = null;
        this.battleCommandController = null;

        const uiBundle = new GameUiFactory().create();
        this.hudElements = uiBundle.hudElements;
        this.battleUI = uiBundle.battleUI;
        this.villageUI = uiBundle.villageUI;
        this.developerUI = uiBundle.developerUI;

        this.villageActionsController = new VillageActionsController(this.player, this.villageUI, {
            onUpdateHUD: () => this.updateHUD(),
            onLeaveVillage: () => this.stateMachine.transition(MODES.WORLD_MAP),
        });

        this.developerEventController = new DeveloperEventController(this.developerUI, this.encounterSystem, {
            addVillageLog: (message: string, type: string = 'system') => this.villageActionsController!.addLog(message, type),
            getEventLabel: (type: ForcedEncounterType) => this.getDeveloperEventLabel(type),
        });

        // Initialize systems
        this.battleSplash = new BattleSplash();
        this.itemDiscoverySplash = new ItemDiscoverySplash();

        this.battleUiController = new BattleUiController(this.battleUI, this.battleMap, this.turnManager, this.player);
        this.hudController = new HudController(this.player, this.hudElements, this.battleUI);
        this.worldModeController = new WorldModeController(
            this.input,
            this.player,
            this.worldMap,
            this.encounterSystem,
            this.itemDiscoverySplash,
            {
                onEnterVillage: () => this.stateMachine.transition(MODES.VILLAGE),
                onStartBattle: (enemies: Skeleton[]) => this.stateMachine.transition(MODES.BATTLE, enemies),
                onAddBattleLog: (message: string, type: string = 'system') => this.addBattleLog(message, type),
                onUpdateHUD: () => this.updateHUD(),
            }
        );

        applyThemeToCSS();

        this.battlePlayerActionController = new BattlePlayerActionController(this.turnManager, this.battleUiController, {
            onAddBattleLog: (message: string, type: string = 'system') => this.addBattleLog(message, type),
            onEnableBattleButtons: (enabled: boolean) => this.enableBattleButtons(enabled),
            onProcessTurn: () => this.processTurn(),
            onPlayerTurnTransitionStart: () => {
                this.turnTransitioning = true;
            },
        });

        this.battleCommandController = new BattleCommandController(this.stateMachine, this.player, this.battleMap, this.turnManager, {
            onUpdateHUD: () => this.updateHUD(),
            onAddBattleLog: (message: string, type: string = 'system') => this.addBattleLog(message, type),
            onEnableBattleButtons: (enabled: boolean) => this.enableBattleButtons(enabled),
            onProcessTurn: () => this.processTurn(),
            onEndBattle: (result: 'victory' | 'fled') => this.endBattle(result),
            onPlayerTurnTransitionStart: () => {
                this.turnTransitioning = true;
            },
            onPlayerTurnReady: () => {
                this.turnTransitioning = false;
            },
            getSelectedEnemy: () => this.battlePlayerActionController!.getSelectedEnemy(),
            setSelectedEnemy: (enemy: Skeleton | null) => this.battlePlayerActionController!.setSelectedEnemy(enemy),
        });

        this.battleTurnController = new BattleTurnController(this.battleMap, this.turnManager, this.player, {
            onAddBattleLog: (message: string, type: string = 'system') => this.addBattleLog(message, type),
            onUpdateHUD: () => this.updateHUD(),
            onEnableBattleButtons: (enabled: boolean) => this.enableBattleButtons(enabled),
            onBattleEnd: (result: 'victory' | 'defeat') => this.endBattle(result),
            onPlayerTurnReady: () => {
                this.turnTransitioning = false;
                this.turnManager.waitingForPlayer = true;
                this.updateBattleUI();
            },
        });

        new GameUiEventBinder(
            this.canvas,
            this.hudElements,
            this.battleUI,
            this.villageUI,
            this.developerUI,
            this.villageActionsController,
            this.developerEventController,
            {
                onAttack: () => this.handleAttack(),
                onFlee: () => this.handleFlee(),
                onWait: () => this.handleWait(),
                onUsePotionFromBattle: () => this.handleUsePotion(true),
                onUsePotionFromHud: () => this.handleUsePotion(false),
                onAddStat: (stat) => this.handleAddStat(stat),
                onCanvasClick: (event) => this.handleCanvasClick(event),
            },
        ).bind(() => this.villageLifeRenderer.getVillageName());

        // Input mapping
        new GameInputSetup(this.input, {
            onToggleDeveloperModal: () => this.developerEventController!.toggleModal(),
        }).configure();

        // Initialize player position
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    public start(): void {
        this.updateHUD();
        this.loop.start();
    }

    private update(deltaTime: number): void {
        this.stateMachine.update(deltaTime);
        this.input.update();
    }

    private render(deltaTime: number): void {
        this.renderer.beginFrame();

        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.renderWorldMode();
        } else if (this.stateMachine.isInState(MODES.VILLAGE)) {
            this.renderVillageMode();
        } else if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderBattleMode();
        }

        this.renderer.endFrame();
    }

    // ============ WORLD MAP MODE ============

    private enterWorldMode(): void {
        this.worldModeController!.enterWorldMode(
            this.hudElements.modeIndicator,
            this.battleUI.sidebar,
            this.villageUI.sidebar,
        );
    }

    private updateWorldMode(deltaTime: number): void {
        void deltaTime;
        this.worldModeController!.updateWorldMode();
    }

    private renderWorldMode(): void {
        this.worldMap.draw(this.renderer.ctx, this.renderer);
        this.player.draw(this.renderer.ctx);
    }

    private renderVillageMode(): void {
        const ctx = this.renderer.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const time = performance.now() * 0.001;

        this.villageEnvironmentRenderer.render(ctx, width, height, time);
        this.villageLifeRenderer.update(time);
        this.villageLifeRenderer.render(ctx, time);

        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText(this.villageLifeRenderer.getVillageName(), 24, 56);
    }

    // ============ VILLAGE MODE ============

    private enterVillageMode(): void {
        this.hudElements.modeIndicator.textContent = 'Village';
        this.battleUI.sidebar.classList.add('hidden');
        this.villageLifeRenderer.initialize(this.canvas.width, this.canvas.height);
        this.villageActionsController!.enterVillage(this.villageLifeRenderer.getVillageName());
    }

    private exitVillageMode(): void {
        this.villageActionsController!.exitVillage();
    }

    private getDeveloperEventLabel(type: ForcedEncounterType): string {
        const labels: Record<ForcedEncounterType, string> = {
            skeleton: 'Skeleton battle',
            zombie: 'Zombie battle',
            ninja: 'Ninja battle',
            darkKnight: 'Dark Knight battle',
            dragon: 'Dragon battle',
            item: 'Item discovery',
            none: 'No encounter',
            village: 'Village',
        };

        return labels[type] ?? type;
    }

    private enterBattleMode(enemies: Skeleton[]): void {
        this.hudElements.modeIndicator.textContent = 'Battle!';
        this.battleUI.sidebar.classList.remove('hidden');
        this.villageUI.sidebar.classList.add('hidden');

        this.currentEnemies = enemies;
        this.battlePlayerActionController!.setSelectedEnemy(null);

        // Show battle start splash screen, then continue with battle setup
        this.battleSplash.showBattleStart(enemies.length, () => {
            this.battleMap.setup(this.player, this.currentEnemies);
            this.turnManager.initializeTurns([this.player, ...this.currentEnemies]);
            this.turnTransitioning = false;

            this.clearBattleLog();
            this.addBattleLog(`Encountered ${this.describeEncounter(enemies)}!`, 'system');
     
            // Update HUD to show current player stats
            this.updateHUD();
            this.processTurn();
        });
      
    }
    private updateBattleMode(deltaTime: number): void {
        void deltaTime;
        this.battlePlayerActionController!.updateBattleMode(() => this.getPressedDirection());
    }

    private getPressedDirection(): Direction | null {
        if (this.input.wasActionPressed('moveUp')) {
            return 'up';
        }

        if (this.input.wasActionPressed('moveDown')) {
            return 'down';
        }

        if (this.input.wasActionPressed('moveLeft')) {
            return 'left';
        }

        if (this.input.wasActionPressed('moveRight')) {
            return 'right';
        }

        return null;
    }

    private handleCanvasClick(event: MouseEvent): void {
        if (!this.stateMachine.isInState(MODES.BATTLE) || this.turnTransitioning) {
            return;
        }

        this.battlePlayerActionController!.handleCanvasClick(event, this.canvas);
    }

    private processTurn(): void {
        this.battleTurnController!.processTurn();
    }

    private handleAttack(): void {
        if (this.turnTransitioning) {
            return;
        }

        this.battleCommandController!.handleAttack();
    }

    private handleFlee(): void {
        if (this.turnTransitioning) {
            return;
        }

        this.battleCommandController!.handleFlee();
    }

    private handleWait(): void {
        if (this.turnTransitioning) {
            return;
        }

        this.battleCommandController!.handleWait();
    }

    private handleUsePotion(fromBattleControls: boolean): void {
        if (this.turnTransitioning && this.stateMachine.isInState(MODES.BATTLE)) {
            return;
        }

        this.battleCommandController!.handleUsePotion(fromBattleControls);
    }

    private endBattle(result: 'victory' | 'defeat' | 'fled'): void {
        if (result === 'victory') {
            this.addBattleLog('Victory!', 'system');
            // Show victory splash screen
            this.battleSplash.showBattleEnd('victory', () => {
                this.stateMachine.transition(MODES.WORLD_MAP);
            });
        } else if (result === 'defeat') {
            this.addBattleLog('Game Over!', 'system');
            // Show defeat splash screen
            this.battleSplash.showBattleEnd('defeat', () => {
                this.gameOver();
            });
        } else if (result === 'fled') {
            this.stateMachine.transition(MODES.WORLD_MAP);
        }
    }

    private exitBattleMode(): void {
        this.currentEnemies = [];
    }

    private renderBattleMode(): void {
        const currentEntity = this.turnManager.getCurrentEntity();
        this.battleMap.draw(this.renderer.ctx, this.renderer, currentEntity, this.battlePlayerActionController!.getSelectedEnemy());

        // Draw all entities
        const entities = [this.player, ...this.currentEnemies.filter(e => e.active)];
        this.renderer.drawEntities(entities);
    }

    // ============ BATTLE UI ============

    private updateBattleUI(): void {
        this.battlePlayerActionController!.updateBattleUI();
    }

    private enableBattleButtons(enabled: boolean): void {
        this.battleUiController!.setButtonsEnabled(enabled);
    }

    private addBattleLog(message: string, type: string = 'system'): void {
        this.battleUiController!.addBattleLog(message, type);
    }

    private clearBattleLog(): void {
        this.battleUiController!.clearBattleLog();
    }

    private describeEncounter(enemies: Skeleton[]): string {
        return this.battleUiController!.describeEncounter(enemies);
    }

    // ============ HUD ============

    private updateHUD(): void {
        this.hudController!.updateHUD();
    }

    private handleAddStat(stat: 'vitality' | 'toughness' | 'strength' | 'agility'): void {
        if (this.player.addStat(stat)) {
            this.updateHUD();
            this.addBattleLog(`+1 ${stat.charAt(0).toUpperCase() + stat.slice(1)}!`, 'system');
        }
    }

    // ============ GAME OVER ============

    private gameOver(): void {
        this.loop.stop();
        alert('Game Over! Refresh to restart.');
    }
}
