import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import StateMachine from '../../utils/StateMachine.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import MagicSystem, { BaseSpellId } from '../magic/MagicSystem.js';

type BattleCommandCallbacks = {
    onUpdateHUD: () => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onProcessTurn: () => void;
    onEndBattle: (result: 'victory' | 'fled') => void;
    onPlayerTurnTransitionStart: () => void;
    onPlayerTurnReady: () => void;
    getSelectedEnemy: () => Skeleton | null;
    setSelectedEnemy: (enemy: Skeleton | null) => void;
};

export default class BattleCommandController {
    private stateMachine: StateMachine;
    private player: Player;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private callbacks: BattleCommandCallbacks;
    private magicSystem: MagicSystem;

    constructor(stateMachine: StateMachine, player: Player, battleMap: BattleMap, turnManager: TurnManager, magicSystem: MagicSystem, callbacks: BattleCommandCallbacks) {
        this.stateMachine = stateMachine;
        this.player = player;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.magicSystem = magicSystem;
        this.callbacks = callbacks;
    }

    public handleAttack(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        if (enemies.length === 0) {
            this.callbacks.onEndBattle('victory');
            return;
        }

        const target = this.resolveAttackTarget(enemies);
        if (!target) {
            this.callbacks.onAddBattleLog('No enemy in range! Move closer first.', 'system');
            this.callbacks.onPlayerTurnReady();
            this.turnManager.waitingForPlayer = true;
            this.callbacks.onEnableBattleButtons(true);
            return;
        }

        this.performAttack(target);
        this.callbacks.onUpdateHUD();
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleCastSpell(spellId: BaseSpellId): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        const target = spellId === 'rage' ? this.player : this.resolveAttackTarget(enemies);
        if (!target) {
            this.callbacks.onAddBattleLog('No valid spell target selected.', 'system');
            return;
        }

        const result = this.magicSystem.castSpell(spellId, target);
        if (!result.ok) {
            this.callbacks.onAddBattleLog(result.message, 'system');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.callbacks.onAddBattleLog(result.message, 'player');

        if (target instanceof Skeleton && target.isDead()) {
            this.performKillRewards(target);
        }

        this.callbacks.onUpdateHUD();
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleFlee(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        if (!this.battleMap.isEntityOnEdge(this.player)) {
            this.callbacks.onAddBattleLog('You can only flee when standing on the battle map edge.', 'system');
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;

        if (Math.random() < balanceConfig.combat.fleeChance) {
            this.callbacks.onAddBattleLog('You fled from battle!', 'system');
            setTimeout(() => this.callbacks.onEndBattle('fled'), timingConfig.battle.fleeSuccessDelay);
            return;
        }

        this.callbacks.onAddBattleLog('Failed to flee!', 'system');
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.fleeFailedDelay);
    }

    public handleWait(): void { /* unchanged */
        if (!this.canUseBattleTurnInput()) return;
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.callbacks.onAddBattleLog('You waited.', 'player');
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.waitActionDelay);
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) return;
        if (inBattle && !this.canUseBattleTurnInput()) return;

        if (!this.player.useHealingPotion()) {
            this.callbacks.onAddBattleLog('No healing potions in inventory.', 'system');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onAddBattleLog('You drink a healing potion (+5 HP).', inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();

        if (!inBattle) return;

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    private canUseBattleTurnInput(): boolean { return this.turnManager.isPlayerTurn() && this.turnManager.waitingForPlayer; }

    private resolveAttackTarget(enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        const attackRange = this.player.getAttackRange();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, attackRange)) return selectedEnemy;
        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, attackRange)) ?? null;
    }

    private performAttack(target: Skeleton): void {
        this.callbacks.onAddBattleLog('You attack!', 'player');
        if (target.shouldAvoidHit()) {
            this.callbacks.onAddBattleLog(`${target.name} dodges the hit!`, 'enemy');
            return;
        }

        const damage = this.player.getPhysicalDamageWithBuff();
        target.takeDamage(damage);
        this.callbacks.onAddBattleLog(`${target.name} takes ${damage} damage!`, 'damage');

        if (target.isDead()) {
            this.performKillRewards(target);
        }
    }

    private performKillRewards(target: Skeleton): void {
        this.callbacks.onAddBattleLog(`${target.name} defeated!`, 'system');
        if (target.xpValue && target.xpValue > 0) {
            const leveledUp = this.player.addXp(target.xpValue);
            this.callbacks.onAddBattleLog(`Gained ${target.xpValue} XP!`, 'system');
            if (leveledUp) {
                this.callbacks.onAddBattleLog(`LEVEL UP! Now level ${this.player.level}!`, 'system');
                this.callbacks.onAddBattleLog(`Gained ${balanceConfig.leveling.skillPointsPerLevel} skill points! HP and mana fully restored!`, 'system');
            }
        }

        if (this.callbacks.getSelectedEnemy() === target) {
            this.callbacks.setSelectedEnemy(null);
        }
    }
}
