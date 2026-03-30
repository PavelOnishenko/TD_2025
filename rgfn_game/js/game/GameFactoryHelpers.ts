import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillagePopulation from '../systems/village/VillagePopulation.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import VillageEnvironmentRenderer from '../systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from '../systems/village/life/VillageLifeRenderer.js';
import HudController from '../systems/controllers/HudController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import Player from '../entities/player/Player.js';
import GameUiFactory from '../systems/game/ui/GameUiFactory.js';
import { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import { consumeNextCharacterRollAllocation } from '../utils/NextCharacterRollConfig.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { GameFacade } from './GameFacade.js';
import GameRuntimeStateMachineFactory from './runtime/GameRuntimeStateMachineFactory.js';

export type RuntimeUi = ReturnType<GameUiFactory['create']>;
export type RuntimeStateMachine = ReturnType<typeof GameRuntimeStateMachineFactory.create>;

export const createPlayer = (hasSavedGame: boolean): Player => new Player(0, 0, {
    startingSkillAllocation: hasSavedGame
        ? null
        : consumeNextCharacterRollAllocation(balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0),
});

export const createRuntimeBase = (hasSavedGame: boolean, worldColumns: number, worldRows: number, worldCellSize: number) => ({
    player: createPlayer(hasSavedGame),
    worldMap: new WorldMap(worldColumns, worldRows, worldCellSize),
    battleMap: new BattleMap(),
    turnManager: new TurnManager(),
    encounterSystem: new EncounterSystem(),
    villageLifeRenderer: new VillageLifeRenderer(new VillagePopulation()),
    ui: new GameUiFactory().create(),
});

const createVillageActionsController = (
    game: GameFacade,
    ui: RuntimeUi,
    player: Player,
    worldMap: WorldMap,
    hudCoordinator: GameHudCoordinator,
): VillageActionsController => new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, {
    onUpdateHUD: () => hudCoordinator.updateHUD(),
    onLeaveVillage: () => game.stateMachine.transition(MODES.WORLD_MAP),
    getVillageDirectionHint: (name: string) => worldMap.getVillageDirectionHintFromPlayer(name),
    onVillageBarterCompleted: (trader, item, village) => game.onVillageBarterCompleted(trader, item, village),
});

export function createVillageRuntime(
    game: GameFacade,
    ui: RuntimeUi,
    player: Player,
    worldMap: WorldMap,
    villageLifeRenderer: VillageLifeRenderer,
    hudCoordinator: GameHudCoordinator,
) {
    const villageActionsController = createVillageActionsController(game, ui, player, worldMap, hudCoordinator);
    const villageCoordinator = new GameVillageCoordinator(
        ui.hudElements,
        ui.battleUI,
        ui.villageUI,
        ui.worldUI,
        villageLifeRenderer,
        villageActionsController,
    );
    const stateMachine = GameRuntimeStateMachineFactory.create(game, ui, worldMap, villageCoordinator);
    return { villageActionsController, villageCoordinator, stateMachine };
}

export const createHudCoordinator = (
    player: Player,
    ui: RuntimeUi,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
    loreBookController: LoreBookController,
    onEquipmentAction: (action: string) => boolean,
): GameHudCoordinator => new GameHudCoordinator(
    player,
    new HudController(
        player,
        ui.hudElements,
        ui.battleUI,
        magicSystem,
        ui.gameLogUI.log,
        loreBookController,
        onEquipmentAction,
    ),
    battleUiController,
    magicSystem,
);

export const createRenderRouter = (
    game: GameFacade,
    worldMap: WorldMap,
    player: Player,
    battleMap: BattleMap,
    turnManager: TurnManager,
    villageLifeRenderer: VillageLifeRenderer,
) => ({
    canvas: game.canvas,
    renderer: game.renderer,
    worldMap,
    player,
    battleMap,
    turnManager,
    villageEnvironmentRenderer: new VillageEnvironmentRenderer(),
    villageLifeRenderer,
});
