import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { balanceConfig } from '../../config/balanceConfig.js';

type BattleTurnControllerCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onBattleEnd: (result: 'victory' | 'defeat') => void;
    onPlayerTurnReady: () => void;
};

export default class BattleTurnController {
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private player: Player;
    private callbacks: BattleTurnControllerCallbacks;

    constructor(battleMap: BattleMap, turnManager: TurnManager, player: Player, callbacks: BattleTurnControllerCallbacks) {
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.player = player;
        this.callbacks = callbacks;
    }

    public processTurn(): void {
        const currentEntity = this.turnManager.getCurrentEntity();
        if (!currentEntity) {
            this.callbacks.onBattleEnd('victory');
            return;
        }

        if (!this.turnManager.hasActiveCombatants()) {
            this.callbacks.onBattleEnd(this.player.isDead() ? 'defeat' : 'victory');
            return;
        }

        if (this.turnManager.isPlayerTurn()) {
            const playerEffectMessages = this.player.consumePlayerTurnEffects();
            playerEffectMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
            setTimeout(() => {
                this.callbacks.onPlayerTurnReady();
                this.callbacks.onEnableBattleButtons(true);
            }, timingConfig.battle.turnStartInputDelay);
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.executeEnemyTurn(currentEntity as Skeleton);
    }

    private executeEnemyTurn(enemy: Skeleton): void {
        setTimeout(() => {
            if (enemy.shouldSkipTurnFromSlow()) {
                const effectMessages = enemy.consumeTurnEffects();
                effectMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
                this.turnManager.nextTurn();
                setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
                return;
            }

            const effectMessages = enemy.consumeTurnEffects();
            effectMessages
                .filter((message) => !message.includes('skips this turn'))
                .forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));

            const attackRange = this.getEnemyAttackRange(enemy);
            const inRange = this.battleMap.isInAttackRange(enemy, this.player, attackRange);

            if (inRange) {
                this.performEnemyAttack(enemy);
                if (this.player.isDead()) {
                    this.callbacks.onAddBattleLog('You have been defeated!', 'system');
                    setTimeout(() => this.callbacks.onBattleEnd('defeat'), timingConfig.battle.defeatEndDelay);
                    return;
                }
            } else {
                this.battleMap.moveEntityToward(enemy, this.player);
                this.callbacks.onAddBattleLog(`${enemy.name} moves closer...`, 'enemy');
            }

            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
        }, timingConfig.battle.enemyActionStartDelay);
    }


    private getEnemyAttackRange(enemy: Skeleton): number {
        const rangedEnemy = enemy as Skeleton & { getAttackRange?: () => number };
        return rangedEnemy.getAttackRange ? rangedEnemy.getAttackRange() : 1;
    }

    private performEnemyAttack(enemy: Skeleton): void {
        const caster = enemy as Skeleton & { canUseMagic?: () => boolean; getMagicManaCost?: () => number; getMagicDamage?: () => number; spendMana?: (amount: number) => void };
        if (caster.canUseMagic && caster.canUseMagic() && Math.random() < 0.35) {
            const magicDamage = caster.getMagicDamage ? caster.getMagicDamage() : enemy.damage;
            const manaCost = caster.getMagicManaCost ? caster.getMagicManaCost() : 0;
            if (caster.spendMana) {
                caster.spendMana(manaCost);
            }
            this.player.takeMagicDamage(magicDamage);
            this.callbacks.onAddBattleLog(`${enemy.name} casts a spell for ${magicDamage} damage!`, 'enemy');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onAddBattleLog(`${enemy.name} attacks!`, 'enemy');
        if (Math.random() < this.player.avoidChance) {
            this.callbacks.onAddBattleLog('You swiftly evade the hit!', 'system');
            return;
        }

        const damageBeforeArmor = enemy.getAttackDamage();
        const damageAfterArmor = damageBeforeArmor <= 0 ? 0 : Math.max(balanceConfig.combat.minDamageAfterArmor, damageBeforeArmor - this.player.armor);
        this.player.takeDamage(damageBeforeArmor);

        if (damageBeforeArmor > enemy.damage) {
            this.callbacks.onAddBattleLog(`${enemy.name} lands a devastating strike!`, 'enemy');
        }

        if (this.player.armor > 0 && damageAfterArmor < damageBeforeArmor) {
            this.callbacks.onAddBattleLog(`Player takes ${damageAfterArmor} damage (${damageBeforeArmor - damageAfterArmor} blocked by armor)!`, 'damage');
        } else {
            this.callbacks.onAddBattleLog(`Player takes ${damageAfterArmor} damage!`, 'damage');
        }

        this.callbacks.onUpdateHUD();
    }
}
