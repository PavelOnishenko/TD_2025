import StateMachine from '../utils/StateMachine.js';
import WorldMap from '../systems/world/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillagePopulation from '../systems/village/VillagePopulation.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import VillageEnvironmentRenderer from '../systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from '../systems/village/VillageLifeRenderer.js';
import HudController from '../systems/HudController.js';
import BattleUiController from '../systems/BattleUiController.js';
import WorldModeController from '../systems/WorldModeController.js';
import Player from '../entities/player/Player.js';
import Skeleton from '../entities/Skeleton.js';
import { BattleSplash } from '../ui/BattleSplash.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';
import GameUiFactory from '../systems/game/GameUiFactory.js';
import GameUiEventBinder from '../systems/game/GameUiEventBinder.js';
import BattleTurnController from '../systems/game/BattleTurnController.js';
import BattlePlayerActionController from '../systems/game/BattlePlayerActionController.js';
import BattleCommandController from '../systems/game/BattleCommandController.js';
import { UIBundle } from './GameFacade.js';
import GameModeStateMachine, { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from '../systems/game/runtime/GameBattleCoordinator.js';
import MagicSystem from '../systems/magic/MagicSystem.js';
import LoreBookController from '../systems/lore/LoreBookController.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestPackService from '../systems/quest/QuestPackService.js';
import QuestUiController from '../systems/quest/QuestUiController.js';
import { TerrainType } from '../types/game.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { consumeNextCharacterRollAllocation } from '../utils/NextCharacterRollConfig.js';
import { CombatMove } from '../systems/combat/DirectionalCombat.js';
import { GameFacade } from './GameFacade.js';

export function createGameRuntime(game: GameFacade, canvas: HTMLCanvasElement, hasSavedGame: boolean, worldColumns: number, worldRows: number, worldCellSize: number): void {
    const player = new Player(0, 0, { startingSkillAllocation: hasSavedGame ? null : consumeNextCharacterRollAllocation(balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0) });
    const worldMap = new WorldMap(worldColumns, worldRows, worldCellSize);
    const battleMap = new BattleMap();
    const turnManager = new TurnManager();
    const encounterSystem = new EncounterSystem();
    const villageLifeRenderer = new VillageLifeRenderer(new VillagePopulation());
    const ui = new GameUiFactory().create();
    const questGenerator = new QuestGenerator({ packService: new QuestPackService({ locationNamesProvider: () => worldMap.getAllVillageNames() }) });
    const questUiController = new QuestUiController(ui.hudElements.questsTitle, ui.hudElements.questsKnownOnlyToggle, ui.hudElements.questsBody, ui.hudElements.questIntroModal, ui.hudElements.questIntroBody, ui.hudElements.questIntroCloseBtn, { onLocationClick: (locationName: string) => game.onQuestLocationClick(locationName) });
    const loreBookController = new LoreBookController({ loreBody: ui.hudElements.loreBody }, player, worldMap);
    const magicSystem = new MagicSystem(player);
    const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
    let battleCommandControllerRef: BattleCommandController | null = null;
    const hudCoordinator = new GameHudCoordinator(player, new HudController(player, ui.hudElements, ui.battleUI, magicSystem, ui.gameLogUI.log, loreBookController, (a: string) => battleCommandControllerRef?.handleEquipmentAction(a) ?? true), battleUiController, magicSystem);
    const villageActionsController = new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, { onUpdateHUD: () => hudCoordinator.updateHUD(), onLeaveVillage: () => game.stateMachine.transition(MODES.WORLD_MAP), getVillageDirectionHint: (name: string) => worldMap.getVillageDirectionHintFromPlayer(name), onVillageBarterCompleted: (trader, item, village) => game.onVillageBarterCompleted(trader, item, village) });
    const villageCoordinator = new GameVillageCoordinator(ui.hudElements, ui.battleUI, ui.villageUI, ui.worldUI, villageLifeRenderer, villageActionsController);
    const stateMachine = createStateMachine(game, ui, worldMap, villageCoordinator);
    const battlePlayerActionController = new BattlePlayerActionController(turnManager, battleUiController, player, { onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onProcessTurn: () => game.battleCoordinator.processTurn(), onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart() });
    const battleCommandController = new BattleCommandController(stateMachine, player, battleMap, turnManager, magicSystem, { onUpdateHUD: () => hudCoordinator.updateHUD(), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onProcessTurn: () => game.battleCoordinator.processTurn(), onEndBattle: (result) => game.battleCoordinator.endBattle(result), onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart(), onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady(), getSelectedEnemy: () => battlePlayerActionController.getSelectedEnemy(), setSelectedEnemy: (enemy: Skeleton | null) => battlePlayerActionController.setSelectedEnemy(enemy), onEnemyDefeated: (enemy: Skeleton) => game.onMonsterKilled(enemy.name) });
    battleCommandControllerRef = battleCommandController;
    const battleTurnController = new BattleTurnController(battleMap, turnManager, player, { onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled), onBattleEnd: (result) => game.battleCoordinator.endBattle(result), onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady() });
    const battleCoordinator = new GameBattleCoordinator(game.input, stateMachine, { player, battleMap, turnManager, battleSplash: new BattleSplash(), hudElements: ui.hudElements, battleUI: ui.battleUI, villageUI: ui.villageUI, worldUI: ui.worldUI }, { battlePlayerActionController, battleCommandController, battleTurnController }, { onClearBattleLog: () => hudCoordinator.clearBattleLog(), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onDescribeEncounter: (enemies) => hudCoordinator.describeEncounter(enemies), onGameOver: () => game.gameOver() });
    const worldModeController = new WorldModeController(game.input, player, worldMap, encounterSystem, new ItemDiscoverySplash(), { onEnterVillage: () => stateMachine.transition(MODES.VILLAGE), onRequestVillageEntryPrompt: (name, anchor) => game.showVillageEntryPrompt(ui.worldUI, name, anchor), onCloseVillageEntryPrompt: () => game.hideVillageEntryPrompt(ui.worldUI), onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => stateMachine.transition(MODES.BATTLE, { enemies, terrainType }), onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t), onUpdateHUD: () => hudCoordinator.updateHUD(), onRememberTraveler: (traveler, disposition) => loreBookController.rememberTraveler(traveler, disposition), getQuestBattleEncounter: () => game.tryCreateQuestMonsterEncounter() });
    const renderRouter = new GameRenderRouter({ canvas: game.canvas, renderer: game.renderer, worldMap, player, battleMap, turnManager, villageEnvironmentRenderer: new VillageEnvironmentRenderer(), villageLifeRenderer });
    const devController = new DeveloperEventController(ui.developerUI, encounterSystem, { addVillageLog: (m, t = 'system') => villageActionsController.addLog(m, t), getEventLabel: (type) => villageCoordinator.getDeveloperEventLabel(type), getMapDisplayConfig: () => worldMap.getMapDisplayConfig(), setMapDisplayConfig: (config) => worldMap.setMapDisplayConfig(config) });
    new GameUiEventBinder(canvas, ui.hudElements, ui.worldUI, ui.battleUI, ui.villageUI, ui.developerUI, villageActionsController, devController, { onAttack: () => battleCoordinator.handleAttack(), onDirectionalCombatMove: (move: CombatMove) => battleCoordinator.handleDirectionalCombatMove(move), onFlee: () => battleCoordinator.handleFlee(), onWait: () => battleCoordinator.handleWait(), onUsePotionFromBattle: () => battleCoordinator.handleUsePotion(true), onUseManaPotionFromBattle: () => battleCoordinator.handleUseManaPotion(true), onUsePotionFromHud: () => battleCoordinator.handleUsePotion(false), onUseManaPotionFromHud: () => battleCoordinator.handleUseManaPotion(false), onUsePotionFromWorld: () => battleCoordinator.handleUsePotion(false), onEnterVillageFromWorld: () => game.tryEnterVillageFromWorldMap(), onConfirmVillageEntryPrompt: () => game.confirmWorldVillageEntry(), onDismissVillageEntryPrompt: () => worldModeController.dismissVillageEntryPrompt(), onCampSleepFromWorld: () => worldModeController.handleCampSleep(), onNewCharacter: () => game.startNewCharacter(), onAddStat: (stat) => hudCoordinator.handleAddStat(stat), onRemoveStat: (stat) => hudCoordinator.handleRemoveStat(stat), onSaveSkillChanges: () => hudCoordinator.handleSaveSkillChanges(), onGodSkillsBoost: () => game.onGodSkillsBoost(), onCastSpell: (id) => battleCoordinator.handleCastSpell(id), onUpgradeSpell: (id) => hudCoordinator.handleUpgradeSpell(id), onCanvasClick: (event) => battleCoordinator.handleCanvasClick(event, canvas), onCanvasMove: (event) => game.handleCanvasMove(event), onCanvasLeave: () => game.handleCanvasLeave(), onWorldMapWheel: (event) => game.handleWorldMapWheel(event), onWorldMapMiddleDragStart: (event) => game.handleWorldMapMiddleDragStart(event), onWorldMapKeyboardZoom: (direction) => game.handleWorldMapKeyboardZoom(direction), onCenterWorldMapOnPlayer: () => game.centerWorldMapOnPlayer(), onTogglePanel: (panel) => hudCoordinator.togglePanel(panel) }).bind(() => villageCoordinator.getVillageName());
    game.assignRuntime({ player, worldMap, battleMap, magicSystem, ui, questGenerator, questUiController, stateMachine, renderRouter, villageCoordinator, villageActionsController, worldModeController, hudCoordinator, battleCoordinator, devController });
}

function createStateMachine(game: GameFacade, ui: UIBundle, worldMap: WorldMap, villageCoordinator: GameVillageCoordinator): StateMachine {
    return new GameModeStateMachine<{ enemies: Skeleton[]; terrainType: TerrainType }>({
        onEnterWorld: () => game.worldModeController.enterWorldMode(ui.hudElements.modeIndicator, ui.worldUI.sidebar, ui.battleUI.sidebar, ui.villageUI.sidebar),
        onUpdateWorld: () => game.worldModeController.updateWorldMode(),
        onEnterBattle: (battleData) => game.battleCoordinator.enterBattleMode(battleData.enemies, battleData.terrainType),
        onUpdateBattle: () => game.battleCoordinator.updateBattleMode(),
        onExitBattle: () => game.battleCoordinator.exitBattleMode(),
        onEnterVillage: () => game.onVillageEntered(worldMap, villageCoordinator),
        onExitVillage: () => villageCoordinator.exitVillageMode(),
    }).create();
}
