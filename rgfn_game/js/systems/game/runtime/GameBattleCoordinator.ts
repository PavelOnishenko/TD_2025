import InputManager from '../../../../../engine/systems/InputManager.js';
import StateMachine from '../../../utils/StateMachine.js';
import { Direction } from '../../../types/game.js';
import Skeleton from '../../../entities/Skeleton.js';
import { BattleSplash } from '../../../ui/BattleSplash.js';
import BattleMap from '../../combat/BattleMap.js';
import TurnManager from '../../combat/TurnManager.js';
import Player from '../../../entities/Player.js';
import BattlePlayerActionController from '../BattlePlayerActionController.js';
import BattleCommandController from '../BattleCommandController.js';
import BattleTurnController from '../BattleTurnController.js';
import { BattleUI, HudElements, VillageUI } from '../GameUiTypes.js';
import { MODES } from './GameModeStateMachine.js';

type Callbacks = {
    onClearBattleLog: () => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onDescribeEncounter: (enemies: Skeleton[]) => string;
    onGameOver: () => void;
};

type Controllers = {
    battlePlayerActionController: BattlePlayerActionController;
    battleCommandController: BattleCommandController;
    battleTurnController: BattleTurnController;
};

export default class GameBattleCoordinator {
    private readonly input: InputManager;
    private readonly stateMachine: StateMachine;
    private readonly player: Player;
    private readonly battleMap: BattleMap;
    private readonly turnManager: TurnManager;
    private readonly battleSplash: BattleSplash;
    private readonly hudElements: HudElements;
    private readonly battleUI: BattleUI;
    private readonly villageUI: VillageUI;
    private readonly callbacks: Callbacks;
    private readonly controllers: Controllers;
    private turnTransitioning = false;
    private currentEnemies: Skeleton[] = [];

    constructor(
        input: InputManager,
        stateMachine: StateMachine,
        deps: {
            player: Player;
            battleMap: BattleMap;
            turnManager: TurnManager;
            battleSplash: BattleSplash;
            hudElements: HudElements;
            battleUI: BattleUI;
            villageUI: VillageUI;
        },
        controllers: Controllers,
        callbacks: Callbacks,
    ) {
        this.input = input;
        this.stateMachine = stateMachine;
        this.player = deps.player;
        this.battleMap = deps.battleMap;
        this.turnManager = deps.turnManager;
        this.battleSplash = deps.battleSplash;
        this.hudElements = deps.hudElements;
        this.battleUI = deps.battleUI;
        this.villageUI = deps.villageUI;
        this.controllers = controllers;
        this.callbacks = callbacks;
    }

    public enterBattleMode(enemies: Skeleton[]): void {
        this.hudElements.modeIndicator.textContent = 'Battle!';
        this.battleUI.sidebar.classList.remove('hidden');
        this.villageUI.sidebar.classList.add('hidden');
        this.currentEnemies = enemies;
        this.controllers.battlePlayerActionController.setSelectedEnemy(null);
        this.battleSplash.showBattleStart(enemies.length, () => this.startBattle(enemies));
    }

    public updateBattleMode(): void {
        this.controllers.battlePlayerActionController.updateBattleMode(() => this.getPressedDirection());
    }

    public handleCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
        if (!this.stateMachine.isInState(MODES.BATTLE) || this.turnTransitioning) {
            return;
        }
        this.controllers.battlePlayerActionController.handleCanvasClick(event, canvas);
    }

    public processTurn(): void {
        this.controllers.battleTurnController.processTurn();
    }

    public handleAttack(): void {
        if (this.turnTransitioning) {
            return;
        }
        this.controllers.battleCommandController.handleAttack();
    }

    public handleFlee(): void {
        if (this.turnTransitioning) {
            return;
        }
        this.controllers.battleCommandController.handleFlee();
    }

    public handleWait(): void {
        if (this.turnTransitioning) {
            return;
        }
        this.controllers.battleCommandController.handleWait();
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        if (this.turnTransitioning && this.stateMachine.isInState(MODES.BATTLE)) {
            return;
        }
        this.controllers.battleCommandController.handleUsePotion(fromBattleControls);
    }

    public onPlayerTurnTransitionStart(): void {
        this.turnTransitioning = true;
    }

    public onPlayerTurnReady(): void {
        this.turnTransitioning = false;
        this.turnManager.waitingForPlayer = true;
        this.controllers.battlePlayerActionController.updateBattleUI();
    }

    public endBattle(result: 'victory' | 'defeat' | 'fled'): void {
        if (result === 'fled') {
            this.stateMachine.transition(MODES.WORLD_MAP);
            return;
        }
        if (result === 'defeat') {
            this.callbacks.onAddBattleLog('Game Over!', 'system');
            this.battleSplash.showBattleEnd('defeat', () => this.callbacks.onGameOver());
            return;
        }
        this.callbacks.onAddBattleLog('Victory!', 'system');
        this.battleSplash.showBattleEnd('victory', () => this.stateMachine.transition(MODES.WORLD_MAP));
    }

    public exitBattleMode(): void {
        this.currentEnemies = [];
    }

    public getCurrentEnemies(): Skeleton[] {
        return this.currentEnemies;
    }

    public getSelectedEnemy(): Skeleton | null {
        return this.controllers.battlePlayerActionController.getSelectedEnemy();
    }

    private startBattle(enemies: Skeleton[]): void {
        this.battleMap.setup(this.player, this.currentEnemies);
        this.turnManager.initializeTurns([this.player, ...this.currentEnemies]);
        this.turnTransitioning = false;
        this.callbacks.onClearBattleLog();
        this.callbacks.onAddBattleLog(`Encountered ${this.callbacks.onDescribeEncounter(enemies)}!`, 'system');
        this.callbacks.onUpdateHUD();
        this.processTurn();
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
}
