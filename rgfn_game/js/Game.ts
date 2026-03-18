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
import { BattleSplash } from './ui/BattleSplash.js';
import { balanceConfig } from './config/balanceConfig.js';
import { ItemDiscoverySplash } from './ui/ItemDiscoverySplash.js';
import { applyThemeToCSS } from './config/ThemeConfig.js';
import GameUiFactory from './systems/game/GameUiFactory.js';
import GameInputSetup from './systems/game/GameInputSetup.js';
import GameUiEventBinder from './systems/game/GameUiEventBinder.js';
import BattleTurnController from './systems/game/BattleTurnController.js';
import BattlePlayerActionController from './systems/game/BattlePlayerActionController.js';
import BattleCommandController from './systems/game/BattleCommandController.js';
import { BattleUI, DeveloperUI, GameLogUI, HudElements, VillageUI } from './systems/game/GameUiTypes.js';
import { theme } from './config/ThemeConfig.js';
import GameModeStateMachine, { MODES } from './systems/game/runtime/GameModeStateMachine.js';
import GameRenderRouter from './systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from './systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from './systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from './systems/game/runtime/GameBattleCoordinator.js';
import MagicSystem from './systems/magic/MagicSystem.js';
import QuestGenerator from './systems/quest/QuestGenerator.js';
import QuestUiController from './systems/quest/QuestUiController.js';
import { QuestNode } from './systems/quest/QuestTypes.js';
import { TerrainType } from './types/game.js';
import { consumeNextCharacterRollAllocation } from './utils/NextCharacterRollConfig.js';

type UIBundle = { hudElements: HudElements; battleUI: BattleUI; villageUI: VillageUI; gameLogUI: GameLogUI; developerUI: DeveloperUI };

type GameSaveState = {
    version: 1;
    worldMap: Record<string, unknown>;
    player: Record<string, unknown>;
    spellLevels: Record<string, number>;
};

const SAVE_KEY = 'rgfn_game_save_v1';
const WORLD_MAP_COLUMNS = theme.worldMap.gridDimensions.columns;
const WORLD_MAP_ROWS = theme.worldMap.gridDimensions.rows;
const WORLD_MAP_CELL_SIZE = 40;

export default class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly renderer: Renderer;
    private readonly input: InputManager;
    private readonly loop: GameLoop;
    private readonly stateMachine: StateMachine;
    private readonly renderRouter: GameRenderRouter;
    private readonly villageCoordinator: GameVillageCoordinator;
    private readonly hudCoordinator: GameHudCoordinator;
    private readonly battleCoordinator: GameBattleCoordinator;
    private readonly worldModeController: WorldModeController;
    private readonly worldMap: WorldMap;
    private readonly battleMap: BattleMap;
    private readonly player: Player;
    private readonly magicSystem: MagicSystem;
    private lastSavedSnapshot: string = '';

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop((dt: number) => this.update(dt), () => this.render());
        const player = new Player(0, 0, {
            startingSkillAllocation: window.localStorage.getItem(SAVE_KEY)
                ? null
                : consumeNextCharacterRollAllocation(balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0),
        });
        const worldMap = new WorldMap(WORLD_MAP_COLUMNS, WORLD_MAP_ROWS, WORLD_MAP_CELL_SIZE);
        const battleMap = new BattleMap();
        this.player = player;
        this.worldMap = worldMap;
        this.battleMap = battleMap;
        const turnManager = new TurnManager();
        const encounterSystem = new EncounterSystem();
        const villageLifeRenderer = new VillageLifeRenderer(new VillagePopulation());
        const ui = new GameUiFactory().create();
        const questGenerator = new QuestGenerator();
        const questUiController = new QuestUiController(
            ui.hudElements.questsTitle,
            ui.hudElements.questsBody,
            ui.hudElements.questIntroModal,
            ui.hudElements.questIntroBody,
            ui.hudElements.questIntroCloseBtn,
            {
                onLocationClick: (locationName: string) => {
                    const shown = this.worldMap.revealNamedLocation(locationName);
                    if (shown) {
                        this.stateMachine.transition(MODES.WORLD_MAP);
                    }
                    return shown;
                },
            },
        );
        this.initializeQuestUi(questGenerator, questUiController);
        const magicSystem = new MagicSystem(player);
        const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
        this.magicSystem = magicSystem;
        this.hudCoordinator = new GameHudCoordinator(
            player,
            new HudController(player, ui.hudElements, ui.battleUI, magicSystem, ui.gameLogUI.log),
            battleUiController,
            magicSystem,
        );
        const villageActionsController = new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, {
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onLeaveVillage: () => this.stateMachine.transition(MODES.WORLD_MAP),
        });
        this.villageCoordinator = new GameVillageCoordinator(ui.hudElements, ui.battleUI, ui.villageUI, villageLifeRenderer, villageActionsController);
        this.stateMachine = this.createStateMachine(ui);
        const battlePlayerActionController = new BattlePlayerActionController(turnManager, battleUiController, {
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onEnableBattleButtons: (enabled: boolean) => this.hudCoordinator.enableBattleButtons(enabled),
            onProcessTurn: () => this.battleCoordinator.processTurn(),
            onPlayerTurnTransitionStart: () => this.battleCoordinator.onPlayerTurnTransitionStart(),
        });
        const battleCommandController = new BattleCommandController(this.stateMachine, player, battleMap, turnManager, magicSystem, {
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onEnableBattleButtons: (enabled: boolean) => this.hudCoordinator.enableBattleButtons(enabled),
            onProcessTurn: () => this.battleCoordinator.processTurn(),
            onEndBattle: (result: 'victory' | 'fled') => this.battleCoordinator.endBattle(result),
            onPlayerTurnTransitionStart: () => this.battleCoordinator.onPlayerTurnTransitionStart(),
            onPlayerTurnReady: () => this.battleCoordinator.onPlayerTurnReady(),
            getSelectedEnemy: () => battlePlayerActionController.getSelectedEnemy(),
            setSelectedEnemy: (enemy: Skeleton | null) => battlePlayerActionController.setSelectedEnemy(enemy),
        });
        const battleTurnController = new BattleTurnController(battleMap, turnManager, player, {
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onEnableBattleButtons: (enabled: boolean) => this.hudCoordinator.enableBattleButtons(enabled),
            onBattleEnd: (result: 'victory' | 'defeat') => this.battleCoordinator.endBattle(result),
            onPlayerTurnReady: () => this.battleCoordinator.onPlayerTurnReady(),
        });
        this.battleCoordinator = new GameBattleCoordinator(this.input, this.stateMachine, {
            player, battleMap, turnManager, battleSplash: new BattleSplash(), hudElements: ui.hudElements, battleUI: ui.battleUI, villageUI: ui.villageUI,
        }, { battlePlayerActionController, battleCommandController, battleTurnController }, {
            onClearBattleLog: () => this.hudCoordinator.clearBattleLog(),
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onDescribeEncounter: (enemies: Skeleton[]) => this.hudCoordinator.describeEncounter(enemies),
            onGameOver: () => this.gameOver(),
        });
        this.worldModeController = new WorldModeController(this.input, player, worldMap, encounterSystem, new ItemDiscoverySplash(), {
            onEnterVillage: () => this.stateMachine.transition(MODES.VILLAGE),
            onStartBattle: (enemies: Skeleton[], terrainType) => this.stateMachine.transition(MODES.BATTLE, { enemies, terrainType }),
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
        });
        this.renderRouter = new GameRenderRouter({
            canvas: this.canvas, renderer: this.renderer, worldMap, player, battleMap, turnManager,
            villageEnvironmentRenderer: new VillageEnvironmentRenderer(), villageLifeRenderer,
        });
        this.bindUi(ui, villageActionsController, encounterSystem);
        this.configureInput();
        this.configureViewport();
        applyThemeToCSS();
        const [x, y] = worldMap.getPlayerPixelPosition();
        player.x = x;
        player.y = y;
        this.loadGame();
        this.saveGameIfChanged();
    }

    public start(): void { this.handleResize(); this.hudCoordinator.updateHUD(); this.loop.start(); }

    private async initializeQuestUi(questGenerator: QuestGenerator, questUiController: QuestUiController): Promise<void> {
        const quest = await questGenerator.generateMainQuest();
        this.registerQuestLocations(quest);
        questUiController.renderQuest(quest);
        questUiController.showIntro();
    }

    private registerQuestLocations(quest: QuestNode): void {
        for (const entity of quest.entities) {
            if (entity.type === 'location') {
                this.worldMap.registerNamedLocation(entity.text);
            }
        }

        for (const child of quest.children) {
            this.registerQuestLocations(child);
        }
    }


    private configureViewport(): void {
        const onResize = (): void => this.handleResize();
        window.addEventListener('resize', onResize);
        onResize();
    }

    private handleResize(): void {
        const rect = this.canvas.getBoundingClientRect();
        const nextWidth = Math.max(160, Math.floor(rect.width));
        const nextHeight = Math.max(160, Math.floor(rect.height));

        if (nextWidth !== this.canvas.width || nextHeight !== this.canvas.height) {
            this.canvas.width = nextWidth;
            this.canvas.height = nextHeight;
        }

        this.worldMap.resizeToCanvas(this.canvas.width, this.canvas.height);
        this.battleMap.resizeToCanvas(this.canvas.width, this.canvas.height);

        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private createStateMachine(ui: UIBundle): StateMachine {
        return new GameModeStateMachine<{ enemies: Skeleton[]; terrainType: TerrainType }>({
            onEnterWorld: () => this.worldModeController.enterWorldMode(ui.hudElements.modeIndicator, ui.battleUI.sidebar, ui.villageUI.sidebar),
            onUpdateWorld: () => this.worldModeController.updateWorldMode(),
            onEnterBattle: (battleData: { enemies: Skeleton[]; terrainType: TerrainType }) => this.battleCoordinator.enterBattleMode(battleData.enemies, battleData.terrainType),
            onUpdateBattle: () => this.battleCoordinator.updateBattleMode(),
            onExitBattle: () => this.battleCoordinator.exitBattleMode(),
            onEnterVillage: () => this.villageCoordinator.enterVillageMode(this.canvas.width, this.canvas.height),
            onExitVillage: () => this.villageCoordinator.exitVillageMode(),
        }).create();
    }

    private bindUi(ui: UIBundle, villageActionsController: VillageActionsController, encounterSystem: EncounterSystem): void {
        const devController = new DeveloperEventController(ui.developerUI, encounterSystem, {
            addVillageLog: (m: string, t: string = 'system') => villageActionsController.addLog(m, t),
            getEventLabel: (type: ForcedEncounterType) => this.villageCoordinator.getDeveloperEventLabel(type),
        });
        new GameUiEventBinder(this.canvas, ui.hudElements, ui.battleUI, ui.villageUI, ui.developerUI, villageActionsController, devController, {
            onAttack: () => this.battleCoordinator.handleAttack(), onFlee: () => this.battleCoordinator.handleFlee(),
            onWait: () => this.battleCoordinator.handleWait(), onUsePotionFromBattle: () => this.battleCoordinator.handleUsePotion(true),
            onUseManaPotionFromBattle: () => this.battleCoordinator.handleUseManaPotion(true),
            onUsePotionFromHud: () => this.battleCoordinator.handleUsePotion(false),
            onUseManaPotionFromHud: () => this.battleCoordinator.handleUseManaPotion(false),
            onNewCharacter: () => this.startNewCharacter(),
            onAddStat: (stat) => this.hudCoordinator.handleAddStat(stat),
            onRemoveStat: (stat) => this.hudCoordinator.handleRemoveStat(stat),
            onSaveSkillChanges: () => this.hudCoordinator.handleSaveSkillChanges(),
            onCastSpell: (spellId) => this.battleCoordinator.handleCastSpell(spellId),
            onUpgradeSpell: (spellId) => this.hudCoordinator.handleUpgradeSpell(spellId),
            onCanvasClick: (event) => this.battleCoordinator.handleCanvasClick(event, this.canvas),
            onTogglePanel: (panel) => this.hudCoordinator.togglePanel(panel),
        }).bind(() => this.villageCoordinator.getVillageName());
        this.devController = devController;
    }

    private devController: DeveloperEventController | null = null;

    private configureInput(): void {
        new GameInputSetup(this.input, { onToggleDeveloperModal: () => this.devController!.toggleModal() }).configure();
    }

    private update(deltaTime: number): void {
        this.stateMachine.update(deltaTime);
        this.input.update();
        this.saveGameIfChanged();
    }

    private render(): void {
        this.renderer.beginFrame();
        if (this.stateMachine.isInState(MODES.WORLD_MAP)) this.renderRouter.renderWorldMode();
        if (this.stateMachine.isInState(MODES.VILLAGE)) this.renderRouter.renderVillageMode();
        if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderRouter.renderBattleMode(this.battleCoordinator.getCurrentEnemies(), this.battleCoordinator.getSelectedEnemy());
        }
        this.renderer.endFrame();
    }

    private gameOver(): void {
        this.loop.stop();
        alert('Game Over! A new character will be created.');
        this.startNewCharacter();
    }

    private buildSaveState(): GameSaveState {
        return {
            version: 1,
            worldMap: this.worldMap.getState(),
            player: this.player.getState(),
            spellLevels: this.magicSystem.getSpellLevels(),
        };
    }

    private saveGameIfChanged(): void {
        const snapshot = JSON.stringify(this.buildSaveState());
        if (snapshot === this.lastSavedSnapshot) {
            return;
        }

        this.lastSavedSnapshot = snapshot;
        window.localStorage.setItem(SAVE_KEY, snapshot);
    }

    private loadGame(): void {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<GameSaveState>;
            if (parsed.version !== 1 || !parsed.player || !parsed.worldMap || !parsed.spellLevels) {
                return;
            }

            this.worldMap.restoreState(parsed.worldMap);
            this.player.restoreState(parsed.player);
            this.magicSystem.restoreSpellLevels(parsed.spellLevels);

            const [x, y] = this.worldMap.getPlayerPixelPosition();
            this.player.x = x;
            this.player.y = y;
            this.hudCoordinator.updateHUD();
        } catch {
            console.warn('Failed to parse save data, starting a new character.');
        }
    }

    private startNewCharacter(): void {
        window.localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }
}
