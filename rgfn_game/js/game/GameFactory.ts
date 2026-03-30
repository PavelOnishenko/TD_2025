import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillagePopulation from '../systems/village/VillagePopulation.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import VillageEnvironmentRenderer from '../systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from '../systems/village/life/VillageLifeRenderer.js';
import HudController from '../systems/controllers/HudController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import WorldModeController from '../systems/world/worldMap/WorldModeController.js';
import Player from '../entities/player/Player.js';
import Skeleton from '../entities/Skeleton.js';
import { BattleSplash } from '../ui/BattleSplash.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';
import GameUiFactory from '../systems/game/ui/GameUiFactory.js';
import BattleTurnController from '../systems/game/BattleTurnController.js';
import BattlePlayerActionController from '../systems/game/BattlePlayerActionController.js';
import BattleCommandController from '../systems/game/BattleCommandController.js';
import { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from '../systems/game/runtime/GameBattleCoordinator.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestPackService from '../systems/quest/generation/QuestPackService.js';
import QuestUiController from '../systems/quest/QuestUiController.js';
import { TerrainType } from '../types/game.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { consumeNextCharacterRollAllocation } from '../utils/NextCharacterRollConfig.js';
import { GameFacade } from './GameFacade.js';
import GameRuntimeUiBinder from './runtime/GameRuntimeUiBinder.js';
import GameRuntimeStateMachineFactory from './runtime/GameRuntimeStateMachineFactory.js';

function createPlayer(hasSavedGame: boolean): Player {
    return new Player(0, 0, {
        startingSkillAllocation: hasSavedGame
            ? null
            : consumeNextCharacterRollAllocation(balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0),
    });
}

function createQuestUiController(game: GameFacade, ui: ReturnType<GameUiFactory['create']>): QuestUiController {
    return new QuestUiController(
        ui.hudElements.questsTitle,
        ui.hudElements.questsKnownOnlyToggle,
        ui.hudElements.questsBody,
        ui.hudElements.questIntroModal,
        ui.hudElements.questIntroBody,
        ui.hudElements.questIntroCloseBtn,
        { onLocationClick: (locationName: string) => game.onQuestLocationClick(locationName) },
    );
}

function createBattleControllers(
    game: GameFacade,
    stateMachine: ReturnType<typeof GameRuntimeStateMachineFactory.create>,
    player: Player,
    battleMap: BattleMap,
    turnManager: TurnManager,
    magicSystem: MagicSystem,
    hudCoordinator: GameHudCoordinator,
    battleUiController: BattleUiController,
): {
    battlePlayerActionController: BattlePlayerActionController;
    battleCommandController: BattleCommandController;
    battleTurnController: BattleTurnController;
} {
    const battlePlayerActionController = createBattlePlayerActionController(game, turnManager, battleUiController, player, hudCoordinator);
    const battleCommandController = createBattleCommandController(game, stateMachine, player, battleMap, turnManager, magicSystem, hudCoordinator, battlePlayerActionController);
    const battleTurnController = createBattleTurnController(game, battleMap, turnManager, player, hudCoordinator);
    return { battlePlayerActionController, battleCommandController, battleTurnController };
}

function createBattlePlayerActionController(
    game: GameFacade, turnManager: TurnManager, battleUiController: BattleUiController, player: Player, hudCoordinator: GameHudCoordinator,
): BattlePlayerActionController {
    return new BattlePlayerActionController(turnManager, battleUiController, player, { onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onProcessTurn: () => game.battleCoordinator.processTurn(), onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart() });
}

function createBattleCommandController(
    game: GameFacade, stateMachine: ReturnType<typeof GameRuntimeStateMachineFactory.create>, player: Player, battleMap: BattleMap, turnManager: TurnManager, magicSystem: MagicSystem, hudCoordinator: GameHudCoordinator, battlePlayerActionController: BattlePlayerActionController,
): BattleCommandController {
    return new BattleCommandController(stateMachine, player, battleMap, turnManager, magicSystem, { onUpdateHUD: () => hudCoordinator.updateHUD(), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onProcessTurn: () => game.battleCoordinator.processTurn(), onEndBattle: (result) => game.battleCoordinator.endBattle(result), onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart(), onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady(), getSelectedEnemy: () => battlePlayerActionController.getSelectedEnemy(), setSelectedEnemy: (enemy: Skeleton | null) => battlePlayerActionController.setSelectedEnemy(enemy), onEnemyDefeated: (enemy: Skeleton) => game.onMonsterKilled(enemy.name) });
}

function createBattleTurnController(
    game: GameFacade, battleMap: BattleMap, turnManager: TurnManager, player: Player, hudCoordinator: GameHudCoordinator,
): BattleTurnController {
    return new BattleTurnController(battleMap, turnManager, player, { onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onBattleEnd: (result) => game.battleCoordinator.endBattle(result), onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady() });
}

function createVillageAndState(game: GameFacade, ui: ReturnType<GameUiFactory['create']>, player: Player, worldMap: WorldMap, villageLifeRenderer: VillageLifeRenderer, hudCoordinator: GameHudCoordinator) {
    const villageActionsController = new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, { onUpdateHUD: () => hudCoordinator.updateHUD(), onLeaveVillage: () => game.stateMachine.transition(MODES.WORLD_MAP), getVillageDirectionHint: (name: string) => worldMap.getVillageDirectionHintFromPlayer(name), onVillageBarterCompleted: (trader, item, village) => game.onVillageBarterCompleted(trader, item, village) });
    const villageCoordinator = new GameVillageCoordinator(ui.hudElements, ui.battleUI, ui.villageUI, ui.worldUI, villageLifeRenderer, villageActionsController);
    const stateMachine = GameRuntimeStateMachineFactory.create(game, ui, worldMap, villageCoordinator);
    return { villageActionsController, villageCoordinator, stateMachine };
}

function createRuntimeBase(hasSavedGame: boolean, worldColumns: number, worldRows: number, worldCellSize: number) {
    const player = createPlayer(hasSavedGame);
    const worldMap = new WorldMap(worldColumns, worldRows, worldCellSize);
    const battleMap = new BattleMap();
    const turnManager = new TurnManager();
    const encounterSystem = new EncounterSystem();
    const villageLifeRenderer = new VillageLifeRenderer(new VillagePopulation());
    const ui = new GameUiFactory().create();
    return { player, worldMap, battleMap, turnManager, encounterSystem, villageLifeRenderer, ui };
}

function createBattleCoordinator(game: GameFacade, stateMachine: ReturnType<typeof GameRuntimeStateMachineFactory.create>, player: Player, battleMap: BattleMap, turnManager: TurnManager, ui: ReturnType<GameUiFactory['create']>, hudCoordinator: GameHudCoordinator, battlePlayerActionController: BattlePlayerActionController, battleCommandController: BattleCommandController, battleTurnController: BattleTurnController): GameBattleCoordinator {
    return new GameBattleCoordinator(game.input, stateMachine, { player, battleMap, turnManager, battleSplash: new BattleSplash(), hudElements: ui.hudElements, battleUI: ui.battleUI, villageUI: ui.villageUI, worldUI: ui.worldUI }, { battlePlayerActionController, battleCommandController, battleTurnController }, { onClearBattleLog: () => hudCoordinator.clearBattleLog(), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onDescribeEncounter: (enemies) => hudCoordinator.describeEncounter(enemies), onGameOver: () => game.gameOver() });
}

function createWorldModeControllerRuntime(game: GameFacade, player: Player, worldMap: WorldMap, encounterSystem: EncounterSystem, stateMachine: ReturnType<typeof GameRuntimeStateMachineFactory.create>, ui: ReturnType<GameUiFactory['create']>, hudCoordinator: GameHudCoordinator, loreBookController: LoreBookController): WorldModeController {
    return new WorldModeController(game.input, player, worldMap, encounterSystem, new ItemDiscoverySplash(), { onEnterVillage: () => stateMachine.transition(MODES.VILLAGE), onRequestVillageEntryPrompt: (name, anchor) => game.showVillageEntryPrompt(ui.worldUI, name, anchor), onCloseVillageEntryPrompt: () => game.hideVillageEntryPrompt(ui.worldUI), onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => stateMachine.transition(MODES.BATTLE, { enemies, terrainType }), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onRememberTraveler: (traveler, disposition) => loreBookController.rememberTraveler(traveler, disposition), getQuestBattleEncounter: () => game.tryCreateQuestMonsterEncounter() });
}

export function createGameRuntime(
    game: GameFacade,
    canvas: HTMLCanvasElement,
    hasSavedGame: boolean,
    worldColumns: number,
    worldRows: number,
    worldCellSize: number,
): void {
    const { player, worldMap, battleMap, turnManager, encounterSystem, villageLifeRenderer, ui } = createRuntimeBase(hasSavedGame, worldColumns, worldRows, worldCellSize);
    const questGenerator = new QuestGenerator({ packService: new QuestPackService({ locationNamesProvider: () => worldMap.getAllVillageNames() }) });
    const questUiController = createQuestUiController(game, ui);
    const loreBookController = new LoreBookController({ loreBody: ui.hudElements.loreBody }, player, worldMap);
    const magicSystem = new MagicSystem(player);
    const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
    let battleCommandControllerRef: BattleCommandController | null = null;
    const hudCoordinator = new GameHudCoordinator(
        player,
        new HudController(
            player,
            ui.hudElements,
            ui.battleUI,
            magicSystem,
            ui.gameLogUI.log,
            loreBookController,
            (a: string) => battleCommandControllerRef?.handleEquipmentAction(a) ?? true,
        ),
        battleUiController,
        magicSystem,
    );
    const { villageActionsController, villageCoordinator, stateMachine } = createVillageAndState(game, ui, player, worldMap, villageLifeRenderer, hudCoordinator);
    const { battlePlayerActionController, battleCommandController, battleTurnController } = createBattleControllers(
        game,
        stateMachine,
        player,
        battleMap,
        turnManager,
        magicSystem,
        hudCoordinator,
        battleUiController,
    );
    battleCommandControllerRef = battleCommandController;
    const battleCoordinator = createBattleCoordinator(game, stateMachine, player, battleMap, turnManager, ui, hudCoordinator, battlePlayerActionController, battleCommandController, battleTurnController);
    const worldModeController = createWorldModeControllerRuntime(game, player, worldMap, encounterSystem, stateMachine, ui, hudCoordinator, loreBookController);
    const renderRouter = new GameRenderRouter({
        canvas: game.canvas,
        renderer: game.renderer,
        worldMap,
        player,
        battleMap,
        turnManager,
        villageEnvironmentRenderer: new VillageEnvironmentRenderer(),
        villageLifeRenderer,
    });
    const devController = new DeveloperEventController(ui.developerUI, encounterSystem, {
        addVillageLog: (m, t = 'system') => villageActionsController.addLog(m, t),
        getEventLabel: (type) => villageCoordinator.getDeveloperEventLabel(type),
        getMapDisplayConfig: () => worldMap.getMapDisplayConfig(),
        setMapDisplayConfig: (config) => worldMap.setMapDisplayConfig(config),
    });
    new GameRuntimeUiBinder(game, canvas, ui, villageActionsController, devController, villageCoordinator, battleCoordinator, worldModeController, hudCoordinator).bind();
    game.assignRuntime({
        player,
        worldMap,
        battleMap,
        magicSystem,
        ui,
        questGenerator,
        questUiController,
        stateMachine,
        renderRouter,
        villageCoordinator,
        villageActionsController,
        worldModeController,
        hudCoordinator,
        battleCoordinator,
        devController,
    });
}
