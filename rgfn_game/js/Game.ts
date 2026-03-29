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
import Skeleton, { MonsterMutationTrait } from './entities/Skeleton.js';
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
import { BattleUI, DeveloperUI, GameLogUI, HudElements, VillageUI, WorldUI } from './systems/game/GameUiTypes.js';
import { theme } from './config/ThemeConfig.js';
import GameModeStateMachine, { MODES } from './systems/game/runtime/GameModeStateMachine.js';
import GameRenderRouter from './systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from './systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from './systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from './systems/game/runtime/GameBattleCoordinator.js';
import MagicSystem from './systems/magic/MagicSystem.js';
import QuestGenerator from './systems/quest/QuestGenerator.js';
import QuestPackService from './systems/quest/QuestPackService.js';
import QuestUiController from './systems/quest/QuestUiController.js';
import QuestProgressTracker from './systems/quest/QuestProgressTracker.js';
import { QuestNode } from './systems/quest/QuestTypes.js';
import { TerrainType } from './types/game.js';
import { consumeNextCharacterRollAllocation } from './utils/NextCharacterRollConfig.js';
import LoreBookController from './systems/lore/LoreBookController.js';
import { CombatMove } from './systems/combat/DirectionalCombat.js';

type UIBundle = { hudElements: HudElements; worldUI: WorldUI; battleUI: BattleUI; villageUI: VillageUI; gameLogUI: GameLogUI; developerUI: DeveloperUI };

type GameSaveState = {
    version: 1;
    worldMap: Record<string, unknown>;
    player: Record<string, unknown>;
    spellLevels: Record<string, number>;
    quest: QuestNode | null;
};

const SAVE_KEY = 'rgfn_game_save_v1';
const WORLD_MAP_COLUMNS = balanceConfig.worldMap.dimensions.columns ?? theme.worldMap.gridDimensions.columns;
const WORLD_MAP_ROWS = balanceConfig.worldMap.dimensions.rows ?? theme.worldMap.gridDimensions.rows;
const WORLD_MAP_CELL_SIZE = theme.worldMap.cellSize.default;

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
    private readonly villageActionsController: VillageActionsController;
    private readonly worldMap: WorldMap;
    private readonly battleMap: BattleMap;
    private readonly player: Player;
    private readonly magicSystem: MagicSystem;
    private activeQuest: QuestNode | null = null;
    private questUiController: QuestUiController | null = null;
    private questProgressTracker: QuestProgressTracker | null = null;
    private lastSavedSnapshot: string = '';
    private isWorldMapMiddleDragActive = false;
    private worldMapDragPointer = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop((dt: number) => this.update(dt), () => this.render());
        const hasSavedGame = Boolean(window.localStorage.getItem(SAVE_KEY));
        const player = new Player(0, 0, {
            startingSkillAllocation: hasSavedGame
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
        const questGenerator = new QuestGenerator({
            packService: new QuestPackService({
                locationNamesProvider: () => worldMap.getAllVillageNames(),
            }),
        });
        const questUiController = new QuestUiController(
            ui.hudElements.questsTitle,
            ui.hudElements.questsKnownOnlyToggle,
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
        const loreBookController = new LoreBookController({ loreBody: ui.hudElements.loreBody }, player, worldMap);
        const magicSystem = new MagicSystem(player);
        const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
        let battleCommandControllerRef: BattleCommandController | null = null;
        this.magicSystem = magicSystem;
        this.hudCoordinator = new GameHudCoordinator(
            player,
            new HudController(
                player,
                ui.hudElements,
                ui.battleUI,
                magicSystem,
                ui.gameLogUI.log,
                loreBookController,
                (actionDescription: string) => battleCommandControllerRef?.handleEquipmentAction(actionDescription) ?? true,
            ),
            battleUiController,
            magicSystem,
        );
        const villageActionsController = new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, {
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onLeaveVillage: () => this.stateMachine.transition(MODES.WORLD_MAP),
            getVillageDirectionHint: (settlementName: string) => this.worldMap.getVillageDirectionHintFromPlayer(settlementName),
            onVillageBarterCompleted: (traderName: string, itemName: string, villageName: string) => this.recordBarterCompletion(traderName, itemName, villageName),
        });
        this.villageActionsController = villageActionsController;
        this.initializeQuestUi(questGenerator, questUiController);
        this.villageCoordinator = new GameVillageCoordinator(ui.hudElements, ui.battleUI, ui.villageUI, ui.worldUI, villageLifeRenderer, villageActionsController);
        this.stateMachine = this.createStateMachine(ui);
        const battlePlayerActionController = new BattlePlayerActionController(turnManager, battleUiController, player, {
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
            onEnemyDefeated: (enemy: Skeleton) => this.recordMonsterKill(enemy.name),
        });
        battleCommandControllerRef = battleCommandController;
        const battleTurnController = new BattleTurnController(battleMap, turnManager, player, {
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onEnableBattleButtons: (enabled: boolean) => this.hudCoordinator.enableBattleButtons(enabled),
            onBattleEnd: (result: 'victory' | 'defeat') => this.battleCoordinator.endBattle(result),
            onPlayerTurnReady: () => this.battleCoordinator.onPlayerTurnReady(),
        });
        this.battleCoordinator = new GameBattleCoordinator(this.input, this.stateMachine, {
            player, battleMap, turnManager, battleSplash: new BattleSplash(), hudElements: ui.hudElements, battleUI: ui.battleUI, villageUI: ui.villageUI, worldUI: ui.worldUI,
        }, { battlePlayerActionController, battleCommandController, battleTurnController }, {
            onClearBattleLog: () => this.hudCoordinator.clearBattleLog(),
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onDescribeEncounter: (enemies: Skeleton[]) => this.hudCoordinator.describeEncounter(enemies),
            onGameOver: () => this.gameOver(),
        });
        this.worldModeController = new WorldModeController(this.input, player, worldMap, encounterSystem, new ItemDiscoverySplash(), {
            onEnterVillage: () => this.stateMachine.transition(MODES.VILLAGE),
            onRequestVillageEntryPrompt: (villageName, anchor) => this.showWorldVillageEntryPrompt(ui.worldUI, villageName, anchor),
            onCloseVillageEntryPrompt: () => this.hideWorldVillageEntryPrompt(ui.worldUI),
            onStartBattle: (enemies: Skeleton[], terrainType) => this.stateMachine.transition(MODES.BATTLE, { enemies, terrainType }),
            onAddBattleLog: (m: string, t: string = 'system') => this.hudCoordinator.addBattleLog(m, t),
            onUpdateHUD: () => this.hudCoordinator.updateHUD(),
            onRememberTraveler: (traveler, disposition) => loreBookController.rememberTraveler(traveler, disposition),
            getQuestBattleEncounter: () => this.tryCreateQuestMonsterEncounter(),
        });
        this.renderRouter = new GameRenderRouter({
            canvas: this.canvas, renderer: this.renderer, worldMap, player, battleMap, turnManager,
            villageEnvironmentRenderer: new VillageEnvironmentRenderer(), villageLifeRenderer,
        });
        this.bindUi(ui, villageActionsController, encounterSystem);
        this.configureInput();
        this.configureViewport();
        if (!hasSavedGame) {
            this.worldMap.centerOnPlayer();
        }
        applyThemeToCSS();
        const [x, y] = worldMap.getPlayerPixelPosition();
        player.x = x;
        player.y = y;
        this.loadGame();
        this.saveGameIfChanged();
    }

    public start(): void { this.handleResize(); this.refreshHud(); this.loop.start(); }

    private async initializeQuestUi(questGenerator: QuestGenerator, questUiController: QuestUiController): Promise<void> {
        const savedQuest = this.getParsedSaveState()?.quest;
        const quest = savedQuest ?? await questGenerator.generateMainQuest();
        const shouldShowIntro = !savedQuest;
        this.activeQuest = quest;
        this.questUiController = questUiController;
        this.questProgressTracker = new QuestProgressTracker(quest);
        this.villageActionsController.configureQuestBarterContracts(this.collectBarterContracts(quest));
        this.registerQuestLocations(quest);
        questUiController.renderQuest(quest);
        if (shouldShowIntro) {
            questUiController.showIntro();
        }
    }

    private recordLocationEntry(locationName: string): void {
        if (!this.activeQuest || !this.questUiController || !this.questProgressTracker) {
            return;
        }

        const carriedItemNames = this.player.getInventory().map((item) => item.name);
        if (!this.questProgressTracker.recordLocationEntryWithInventory(locationName, carriedItemNames)) {
            return;
        }

        this.questUiController.renderQuest(this.activeQuest);
    }

    private recordBarterCompletion(traderName: string, itemName: string, villageName: string): void {
        if (!this.activeQuest || !this.questUiController || !this.questProgressTracker) {
            return;
        }

        if (!this.questProgressTracker.recordBarterCompletion(traderName, itemName, villageName)) {
            this.hudCoordinator.addBattleLog(`Quest tracker: barter registered (${traderName} -> ${itemName}), but no active objective matched.`, 'system-message');
            return;
        }

        this.hudCoordinator.addBattleLog(`Quest tracker: barter objective completed (${traderName} -> ${itemName}).`, 'system');
        this.questUiController.renderQuest(this.activeQuest);
    }

    private recordMonsterKill(monsterName: string): void {
        if (!this.activeQuest || !this.questUiController || !this.questProgressTracker) {
            return;
        }

        if (!this.questProgressTracker.recordMonsterKill(monsterName)) {
            return;
        }

        this.hudCoordinator.addBattleLog(`Quest tracker: eliminated ${monsterName}.`, 'system');
        this.questUiController.renderQuest(this.activeQuest);
    }

    private tryCreateQuestMonsterEncounter(): { enemies: Skeleton[]; hint?: string } | null {
        if (!this.questProgressTracker) {
            return null;
        }

        const activeMonsterObjectives = this.questProgressTracker.getActiveMonsterObjectives();
        if (activeMonsterObjectives.length === 0) {
            return null;
        }

        for (const objective of activeMonsterObjectives) {
            if (!objective.villageName) {
                continue;
            }

            const hint = this.worldMap.getVillageDirectionHintFromPlayer(objective.villageName);
            if (!hint.exists || typeof hint.distanceCells !== 'number' || hint.distanceCells > 7) {
                continue;
            }

            const encounterChance = hint.distanceCells <= 2 ? 0.42 : 0.2;
            if (Math.random() >= encounterChance) {
                continue;
            }

            const spawnCount = Math.max(1, Math.min(3, objective.remainingKills));
            const mutations = objective.mutations.filter(this.isSupportedMutationTrait);
            const enemies = Array.from({ length: spawnCount }, () => new Skeleton(0, 0, {
                ...balanceConfig.enemies.skeleton,
                name: objective.targetName,
                mutations,
            }));
            const message = `Scouts report ${objective.targetName} tracks near ${objective.villageName} (${hint.direction ?? 'nearby'}).`;
            return { enemies, hint: message };
        }

        return null;
    }

    private isSupportedMutationTrait(value: string): value is MonsterMutationTrait {
        return ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'].includes(value);
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

    private collectBarterContracts(quest: QuestNode): Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' }> {
        const contracts: Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' }> = [];
        const visit = (node: QuestNode): void => {
            if (node.objectiveType === 'barter' && node.children.length === 0) {
                const trader = node.entities.find((entity) => entity.type === 'person')?.text?.trim();
                const item = node.entities.find((entity) => entity.type === 'item')?.text?.trim();
                if (trader && item) {
                    contracts.push({ traderName: trader, itemName: item, contractType: 'barter' });
                }
            }

            if (node.objectiveType === 'deliver' && node.children.length === 0) {
                const deliverData = node.objectiveData?.deliver;
                if (deliverData?.sourceTrader && deliverData?.itemName) {
                    contracts.push({
                        traderName: deliverData.sourceTrader,
                        itemName: deliverData.itemName,
                        sourceVillage: deliverData.sourceVillage,
                        destinationVillage: deliverData.destinationVillage,
                        contractType: 'deliver',
                    });
                }
            }

            node.children.forEach((child) => visit(child));
        };

        visit(quest);
        return contracts;
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
            onEnterWorld: () => this.worldModeController.enterWorldMode(ui.hudElements.modeIndicator, ui.worldUI.sidebar, ui.battleUI.sidebar, ui.villageUI.sidebar),
            onUpdateWorld: () => this.worldModeController.updateWorldMode(),
            onEnterBattle: (battleData: { enemies: Skeleton[]; terrainType: TerrainType }) => this.battleCoordinator.enterBattleMode(battleData.enemies, battleData.terrainType),
            onUpdateBattle: () => this.battleCoordinator.updateBattleMode(),
            onExitBattle: () => this.battleCoordinator.exitBattleMode(),
            onEnterVillage: () => {
                const villageName = this.worldMap.getVillageNameAtPlayerPosition();
                this.recordLocationEntry(villageName);
                this.villageCoordinator.enterVillageMode(this.canvas.width, this.canvas.height, villageName);
            },
            onExitVillage: () => this.villageCoordinator.exitVillageMode(),
        }).create();
    }

    private bindUi(ui: UIBundle, villageActionsController: VillageActionsController, encounterSystem: EncounterSystem): void {
        const devController = new DeveloperEventController(ui.developerUI, encounterSystem, {
            addVillageLog: (m: string, t: string = 'system') => villageActionsController.addLog(m, t),
            getEventLabel: (type: ForcedEncounterType) => this.villageCoordinator.getDeveloperEventLabel(type),
            getMapDisplayConfig: () => this.worldMap.getMapDisplayConfig(),
            setMapDisplayConfig: (config) => this.worldMap.setMapDisplayConfig(config),
        });
        new GameUiEventBinder(this.canvas, ui.hudElements, ui.worldUI, ui.battleUI, ui.villageUI, ui.developerUI, villageActionsController, devController, {
            onAttack: () => this.battleCoordinator.handleAttack(),
            onDirectionalCombatMove: (move: CombatMove) => this.battleCoordinator.handleDirectionalCombatMove(move),
            onFlee: () => this.battleCoordinator.handleFlee(),
            onWait: () => this.battleCoordinator.handleWait(), onUsePotionFromBattle: () => this.battleCoordinator.handleUsePotion(true),
            onUseManaPotionFromBattle: () => this.battleCoordinator.handleUseManaPotion(true),
            onUsePotionFromHud: () => this.battleCoordinator.handleUsePotion(false),
            onUseManaPotionFromHud: () => this.battleCoordinator.handleUseManaPotion(false),
            onUsePotionFromWorld: () => this.battleCoordinator.handleUsePotion(false),
            onEnterVillageFromWorld: () => this.tryEnterVillageFromWorldMap(),
            onConfirmVillageEntryPrompt: () => this.confirmWorldVillageEntry(),
            onDismissVillageEntryPrompt: () => this.worldModeController.dismissVillageEntryPrompt(),
            onNewCharacter: () => this.startNewCharacter(),
            onAddStat: (stat) => this.hudCoordinator.handleAddStat(stat),
            onRemoveStat: (stat) => this.hudCoordinator.handleRemoveStat(stat),
            onSaveSkillChanges: () => this.hudCoordinator.handleSaveSkillChanges(),
            onGodSkillsBoost: () => {
                this.hudCoordinator.handleGodSkillsBoost();
                this.saveGameIfChanged();
            },
            onCastSpell: (spellId) => this.battleCoordinator.handleCastSpell(spellId),
            onUpgradeSpell: (spellId) => this.hudCoordinator.handleUpgradeSpell(spellId),
            onCanvasClick: (event) => this.battleCoordinator.handleCanvasClick(event, this.canvas),
            onCanvasMove: (event) => this.handleCanvasMove(event),
            onCanvasLeave: () => this.handleCanvasLeave(),
            onWorldMapWheel: (event) => this.handleWorldMapWheel(event),
            onWorldMapMiddleDragStart: (event) => this.handleWorldMapMiddleDragStart(event),
            onWorldMapKeyboardZoom: (direction) => this.handleWorldMapKeyboardZoom(direction),
            onCenterWorldMapOnPlayer: () => this.centerWorldMapOnPlayer(),
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
            quest: this.activeQuest,
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
        const parsed = this.getParsedSaveState();
        if (!parsed || !parsed.player || !parsed.worldMap || !parsed.spellLevels) {
            return;
        }

        this.worldMap.restoreState(parsed.worldMap);
        this.player.restoreState(parsed.player);
        this.magicSystem.restoreSpellLevels(parsed.spellLevels);

        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
        this.refreshHud();
    }

    private getParsedSaveState(): Partial<GameSaveState> | null {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<GameSaveState>;
            return parsed.version === 1 ? parsed : null;
        } catch {
            console.warn('Failed to parse save data, starting a new character.');
            return null;
        }
    }

    private refreshHud(): void {
        this.hudCoordinator.updateHUD();
        this.hudCoordinator.updateSelectedCell(this.worldMap.getSelectedCellInfo());
    }

    private handleCanvasMove(event: MouseEvent): void {
        if (this.isWorldMapMiddleDragActive && this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.handleWorldMapMiddleDragMove(event);
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const worldX = (event.clientX - rect.left) * scaleX;
        const worldY = (event.clientY - rect.top) * scaleY;

        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.worldMap.updateSelectedCellFromPixel(worldX, worldY);
            this.hudCoordinator.updateSelectedCell(this.worldMap.getSelectedCellInfo());
            return;
        }

        if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.battleMap.updateSelectedCellFromPixel(worldX, worldY);
            this.hudCoordinator.updateSelectedCell(this.battleMap.getSelectedCellInfo());
        }
    }

    private handleCanvasLeave(): void {
        this.stopWorldMapMiddleDrag();

        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.worldMap.clearSelectedCell();
            this.hudCoordinator.updateSelectedCell(null);
            return;
        }

        if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.battleMap.clearSelectedCell();
            this.hudCoordinator.updateSelectedCell(null);
        }
    }

    private handleWorldMapZoom(direction: 'in' | 'out'): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        const changed = direction === 'in' ? this.worldMap.zoomIn() : this.worldMap.zoomOut();
        if (!changed) {
            return;
        }

        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private handleWorldMapPan(direction: 'up' | 'down' | 'left' | 'right'): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        this.worldMap.pan(direction);
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private handleWorldMapWheel(event: WheelEvent): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        event.preventDefault();
        const changed = event.deltaY < 0 ? this.worldMap.zoomIn() : this.worldMap.zoomOut();
        if (!changed) {
            return;
        }

        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private handleWorldMapKeyboardZoom(direction: 'in' | 'out'): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        this.handleWorldMapZoom(direction);
    }

    private handleWorldMapMiddleDragStart(event: MouseEvent): void {
        if (event.button !== 1 || !this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        event.preventDefault();
        this.isWorldMapMiddleDragActive = true;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        const stopDrag = (): void => this.stopWorldMapMiddleDrag();
        window.addEventListener('mouseup', stopDrag, { once: true });
        window.addEventListener('blur', stopDrag, { once: true });
    }

    private handleWorldMapMiddleDragMove(event: MouseEvent): void {
        const deltaX = event.clientX - this.worldMapDragPointer.x;
        const deltaY = event.clientY - this.worldMapDragPointer.y;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        const changed = this.worldMap.panByPixels(deltaX, deltaY);
        if (!changed) {
            return;
        }

        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private stopWorldMapMiddleDrag(): void {
        this.isWorldMapMiddleDragActive = false;
    }

    private centerWorldMapOnPlayer(): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        this.worldMap.centerOnPlayer();
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.player.x = x;
        this.player.y = y;
    }

    private tryEnterVillageFromWorldMap(): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }

        const enteredVillage = this.worldModeController.tryEnterVillageAtCurrentPosition();
        if (enteredVillage) {
            return;
        }

        this.hudCoordinator.addBattleLog('Stand on a village tile to enter it.', 'system');
    }

    private confirmWorldVillageEntry(): void {
        if (!this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.worldModeController.dismissVillageEntryPrompt();
            return;
        }

        const enteredVillage = this.worldModeController.confirmVillageEntryFromPrompt();
        if (enteredVillage) {
            return;
        }

        this.hudCoordinator.addBattleLog('You must stand on the village tile to enter.', 'system');
    }

    private showWorldVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }): void {
        worldUI.villageEntryTitle.textContent = `You found ${villageName}.`;
        this.positionWorldVillageEntryPrompt(worldUI, anchor);
        worldUI.villageEntryPopup.classList.remove('hidden');
    }

    private hideWorldVillageEntryPrompt(worldUI: WorldUI): void {
        worldUI.villageEntryPopup.classList.add('hidden');
    }

    private positionWorldVillageEntryPrompt(worldUI: WorldUI, anchor: { x: number; y: number }): void {
        const popupWidth = worldUI.villageEntryPopup.offsetWidth || 190;
        const popupHeight = worldUI.villageEntryPopup.offsetHeight || 84;
        const horizontalPadding = 14;
        const verticalPadding = 14;
        const pointerLift = 16;
        const preferredX = anchor.x - (popupWidth / 2);
        const preferredY = anchor.y - popupHeight - pointerLift;
        const maxX = Math.max(horizontalPadding, this.canvas.width - popupWidth - horizontalPadding);
        const maxY = Math.max(verticalPadding, this.canvas.height - popupHeight - verticalPadding);
        const left = Math.max(horizontalPadding, Math.min(maxX, preferredX));
        const top = Math.max(verticalPadding, Math.min(maxY, preferredY));
        worldUI.villageEntryPopup.style.left = `${left}px`;
        worldUI.villageEntryPopup.style.top = `${top}px`;
    }

    private startNewCharacter(): void {
        window.localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }
}
