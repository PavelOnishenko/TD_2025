import TurnManager from '../combat/TurnManager.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import BattleCommandController from './BattleCommandController.js';

type BattleTurnControllerCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onBattleEnd: (result: 'victory' | 'defeat') => void;
    onPlayerTurnReady: () => void;
};

export default class BattleTurnController {
    private readonly turnManager: TurnManager;
    private readonly player: Player;
    private readonly battleCommandController: BattleCommandController;
    private readonly callbacks: BattleTurnControllerCallbacks;

    constructor(turnManager: TurnManager, player: Player, battleCommandController: BattleCommandController, callbacks: BattleTurnControllerCallbacks) {
        this.turnManager = turnManager;
        this.player = player;
        this.battleCommandController = battleCommandController;
        this.callbacks = callbacks;
    }

    public processTurn(): void {
        if (!this.turnManager.hasActiveCombatants()) {
            this.callbacks.onBattleEnd(this.player.isDead() ? 'defeat' : 'victory');
            return;
        }
        if (this.turnManager.isPlayerTurn()) {
            this.handlePlayerPhase();
            return;
        }
        this.callbacks.onEnableBattleButtons(false);
        this.executeEnemyPhase();
    }

    private handlePlayerPhase(): void {
        const playerEffectMessages = this.player.consumePlayerTurnEffects();
        playerEffectMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.battleCommandController.finishEnemyRound();
        if (this.battleCommandController.triggerPreparedPlayerAction()) {
            return;
        }
        setTimeout(() => {
            this.callbacks.onPlayerTurnReady();
            this.callbacks.onEnableBattleButtons(true);
        }, timingConfig.battle.turnStartInputDelay);
    }

    private executeEnemyPhase(): void {
        const enemy = this.turnManager.getCurrentEntity() as Skeleton | null;
        if (!enemy) {
            this.callbacks.onBattleEnd('victory');
            return;
        }
        setTimeout(() => {
            const skippingFromSlow = enemy.shouldSkipTurnFromSlow();
            const effectMessages = enemy.consumeTurnEffects();
            effectMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
            if (skippingFromSlow) {
                this.advanceTurnAfterEnemy();
                return;
            }
            const outcome = this.battleCommandController.resolveEnemyTurn(enemy);
            if (outcome === 'defeat') {
                setTimeout(() => this.callbacks.onBattleEnd('defeat'), timingConfig.battle.defeatEndDelay);
                return;
            }
            if (outcome === 'victory') {
                this.callbacks.onBattleEnd('victory');
                return;
            }
            this.advanceTurnAfterEnemy();
        }, timingConfig.battle.enemyActionStartDelay);
    }

    private advanceTurnAfterEnemy(): void {
        this.turnManager.nextTurn();
        setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
    }
}
