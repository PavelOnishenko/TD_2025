/* eslint-disable style-guide/file-length-warning */
import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillageLifeRenderer from '../systems/village/life/VillageLifeRenderer.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestPackService from '../systems/quest/generation/QuestPackService.js';
import QuestUiController from '../systems/quest/ui/QuestUiController.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import BattleCommandController from '../systems/game/BattleCommandController.js';
import GameRuntimeUiBinder from './runtime/GameRuntimeUiBinder.js';
import { GameFacade } from './GameFacade.js';
import { RuntimeUi, createHudCoordinator, createRenderRouter, createRuntimeBase, createVillageRuntime } from './GameFactoryHelpers.js';
import { createBattleCommandController, createBattleCoordinator, createBattlePlayerActionController, createBattleTurnController, createWorldModeControllerRuntime } from './GameFactoryBattleHelpers.js';

type RuntimeBase = {
    player: any;
    worldMap: WorldMap;
    battleMap: BattleMap;
    turnManager: TurnManager;
    encounterSystem: EncounterSystem;
    villageLifeRenderer: VillageLifeRenderer;
    ui: RuntimeUi;
};

type SharedRuntime = ReturnType<typeof createSharedRuntime>;
type RuntimeControllers = ReturnType<typeof createRuntimeControllers>;

const createQuestUiController = (game: GameFacade, ui: RuntimeUi): QuestUiController => new QuestUiController(
    ui.hudElements.questsTitle,
    ui.hudElements.questsKnownOnlyToggle,
    ui.hudElements.questsBody,
    ui.hudElements.questIntroModal,
    ui.hudElements.questIntroBody,
    ui.hudElements.questIntroCloseBtn,
    { onLocationClick: (locationName: string) => game.onQuestLocationClick(locationName) },
);

const createQuestGenerator = (worldMap: WorldMap): QuestGenerator => new QuestGenerator({
    packService: new QuestPackService({ locationNamesProvider: () => worldMap.getAllVillageNames() }),
});

const createDevController = (
    ui: RuntimeUi,
    encounterSystem: EncounterSystem,
    worldMap: WorldMap,
    worldInteractionRuntime: GameFacade['worldInteractionRuntime'],
    villageActionsController: { addLog: (message: string, type?: string) => void },
    villageCoordinator: { getDeveloperEventLabel: (type: string) => string },
): DeveloperEventController => new DeveloperEventController(ui.developerUI, encounterSystem, {
    addVillageLog: (m, t = 'system') => villageActionsController.addLog(m, t),
    getEventLabel: (type) => villageCoordinator.getDeveloperEventLabel(type),
    getMapDisplayConfig: () => worldMap.getMapDisplayConfig(),
    setMapDisplayConfig: (config) => worldMap.setMapDisplayConfig(config),
    setWorldMapDrawProfilingEnabled: (enabled) => worldMap.setDrawProfilingEnabled(enabled),
    isWorldMapDrawProfilingEnabled: () => worldMap.isDrawProfilingEnabled(),
    resetWorldMapDrawProfiling: () => worldMap.resetDrawProfiling(),
    getWorldMapDrawProfilingSnapshot: () => worldMap.getDrawProfilingSnapshot(),
    setWorldMapRenderLayerToggles: (toggles) => worldMap.setRenderLayerToggles(toggles),
    getWorldMapRenderLayerToggles: () => worldMap.getRenderLayerToggles(),
    getWorldMapPerformanceSnapshot: () => worldMap.getPerformanceSnapshot(),
    getWorldMapPointerSnapshot: () => worldInteractionRuntime.getPointerDiagnosticsSnapshot(),
    setWorldMapRenderFpsCap: (cap) => worldMap.setRenderFpsCap(cap),
    getWorldMapRenderFpsCap: () => worldMap.getRenderFpsCap(),
    setWorldMapDevicePixelRatioClamp: (clamp) => worldMap.setDevicePixelRatioClamp(clamp),
    getWorldMapDevicePixelRatioClamp: () => worldMap.getDevicePixelRatioClamp(),
});

// eslint-disable-next-line style-guide/function-length-warning
function createSharedRuntime(
    game: GameFacade,
    runtimeBase: RuntimeBase,
    loreBookController: LoreBookController,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
) {
    const { player, ui, worldMap, villageLifeRenderer } = runtimeBase;
    let battleCommandControllerRef: BattleCommandController | null = null;
    const hudCoordinator = createHudCoordinator(
        player,
        ui,
        magicSystem,
        battleUiController,
        loreBookController,
        (action) => battleCommandControllerRef?.handleEquipmentAction(action) ?? true,
        () => game.getHudTimeSnapshot(),
    );
    const villageRuntime = createVillageRuntime(game, ui, player, worldMap, villageLifeRenderer, hudCoordinator);
    return { hudCoordinator, battleCommandControllerRef, ...villageRuntime };
}

// eslint-disable-next-line style-guide/function-length-warning
const createBattleControllers = (
    game: GameFacade,
    runtimeBase: RuntimeBase,
    shared: SharedRuntime,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
) => {
    const { player, battleMap, turnManager, ui } = runtimeBase;
    const { hudCoordinator, stateMachine } = shared;
    const battlePlayerActionController = createBattlePlayerActionController(game, turnManager, battleUiController, player, hudCoordinator);
    const battleCommandController = createBattleCommandController(
        game,
        stateMachine,
        player,
        battleMap,
        turnManager,
        magicSystem,
        hudCoordinator,
        battlePlayerActionController,
    );
    const battleTurnController = createBattleTurnController(game, battleMap, turnManager, player, hudCoordinator);
    const battleCoordinator = createBattleCoordinator(
        game,
        stateMachine,
        player,
        battleMap,
        turnManager,
        ui,
        hudCoordinator,
        battlePlayerActionController,
        battleCommandController,
        battleTurnController,
    );
    return { battleCommandController, battleCoordinator };
};

const createWorldMode = (game: GameFacade, runtimeBase: RuntimeBase, shared: SharedRuntime, loreBookController: LoreBookController) => {
    const { player, worldMap, encounterSystem, ui } = runtimeBase;
    return createWorldModeControllerRuntime(game, player, worldMap, encounterSystem, shared.stateMachine, ui, shared.hudCoordinator, loreBookController);
};

function createRuntimeControllers(game: GameFacade, runtimeBase: RuntimeBase) {
    const { player, worldMap, battleMap, turnManager, ui } = runtimeBase;
    const questGenerator = createQuestGenerator(worldMap);
    const questUiController = createQuestUiController(game, ui);
    const loreBookController = new LoreBookController({ loreBody: ui.hudElements.loreBody }, player, worldMap);
    const magicSystem = new MagicSystem(player);
    const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
    const shared = createSharedRuntime(game, runtimeBase, loreBookController, magicSystem, battleUiController);
    const combat = createBattleControllers(game, runtimeBase, shared, magicSystem, battleUiController);
    shared.battleCommandControllerRef = combat.battleCommandController;
    const worldModeController = createWorldMode(game, runtimeBase, shared, loreBookController);
    return { questGenerator, questUiController, magicSystem, worldModeController, ...shared, ...combat };
}

const bindRuntimeUi = (
    game: GameFacade,
    canvas: HTMLCanvasElement,
    ui: RuntimeUi,
    runtime: RuntimeControllers,
    devController: DeveloperEventController,
) => new GameRuntimeUiBinder(
    game,
    canvas,
    ui,
    runtime.villageActionsController,
    devController,
    runtime.villageCoordinator,
    runtime.battleCoordinator,
    runtime.worldModeController,
    runtime.hudCoordinator,
).bind();

// eslint-disable-next-line style-guide/function-length-warning
const assignRuntime = (game: GameFacade, runtimeBase: RuntimeBase, runtime: RuntimeControllers, devController: DeveloperEventController): void => {
    const { player, worldMap, battleMap, ui } = runtimeBase;
    const renderRouter = new GameRenderRouter(
        createRenderRouter(game, worldMap, player, battleMap, runtimeBase.turnManager, runtimeBase.villageLifeRenderer),
    );
    game.assignRuntime({
        player,
        worldMap,
        battleMap,
        magicSystem: runtime.magicSystem,
        ui,
        questGenerator: runtime.questGenerator,
        questUiController: runtime.questUiController,
        stateMachine: runtime.stateMachine,
        renderRouter,
        villageCoordinator: runtime.villageCoordinator,
        villageActionsController: runtime.villageActionsController,
        worldModeController: runtime.worldModeController,
        hudCoordinator: runtime.hudCoordinator,
        battleCoordinator: runtime.battleCoordinator,
        devController,
    });
};

// eslint-disable-next-line style-guide/function-length-warning
export function buildGameRuntime(
    game: GameFacade,
    canvas: HTMLCanvasElement,
    hasSavedGame: boolean,
    worldColumns: number,
    worldRows: number,
    worldCellSize: number,
): void {
    const runtimeBase = createRuntimeBase(hasSavedGame, worldColumns, worldRows, worldCellSize);
    const runtime = createRuntimeControllers(game, runtimeBase);
    const devController = createDevController(
        runtimeBase.ui,
        runtimeBase.encounterSystem,
        runtimeBase.worldMap,
        game.worldInteractionRuntime,
        runtime.villageActionsController,
        runtime.villageCoordinator,
    );
    devController.applyDeveloperModeOnStartup();
    bindRuntimeUi(game, canvas, runtimeBase.ui, runtime, devController);
    assignRuntime(game, runtimeBase, runtime, devController);
}
