import BattleMap from './BattleMap.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { BattleActionIntent } from '../../types/combat.js';
import {
    clearRoundState,
    CombatParticipant,
    ensureCombatState,
    getAttackRange,
    getCombatDamage,
    getLaneBetween,
    isHostileIntent,
    isRangedCombatant,
} from './CombatParticipantUtils.js';

export type CombatResolution = {
    logs: Array<{ message: string; type: string }>;
    interruptedHeavy: boolean;
    targetDefeated: boolean;
};

export default class CombatResolver {
    public resolve(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
        battleMap: BattleMap,
    ): CombatResolution {
        const defenderState = ensureCombatState(defender);
        const logs: Array<{ message: string; type: string }> = [];

        if (attackerIntent.type === 'move' || attackerIntent.type === 'wait') {
            return { logs, interruptedHeavy: false, targetDefeated: false };
        }
        if (attackerIntent.type === 'heavy') {
            return this.prepareHeavy(attacker, attackerIntent, logs);
        }
        if (attackerIntent.type === 'counter') {
            defenderState.counterStanceActive = defenderState.counterStanceActive;
            ensureCombatState(attacker).counterStanceActive = true;
            logs.push({ message: `${attacker.name} adopts a counterattack stance.`, type: 'system' });
            return { logs, interruptedHeavy: false, targetDefeated: false };
        }
        if (attackerIntent.type === 'dodge') {
            ensureCombatState(attacker).dodgeDirection = attackerIntent.direction;
            logs.push({ message: `${attacker.name} dodges ${attackerIntent.direction}.`, type: 'system' });
            return { logs, interruptedHeavy: false, targetDefeated: false };
        }

        if (!battleMap.isInAttackRange(attacker, defender, getAttackRange(attacker))) {
            logs.push({ message: `${attacker.name} cannot find an opening.`, type: 'system' });
            return { logs, interruptedHeavy: false, targetDefeated: false };
        }

        if (this.shouldCounter(attacker, defender, attackerIntent, battleMap)) {
            const counterDamage = getCombatDamage(defender) + 2;
            attacker.takeDamage(counterDamage);
            ensureCombatState(defender).counterStanceActive = false;
            logs.push({ message: `${defender.name} counters and deals ${counterDamage} damage!`, type: 'damage' });
            return {
                logs,
                interruptedHeavy: Boolean(ensureCombatState(attacker).preparedHeavyAttack),
                targetDefeated: attacker.isDead(),
            };
        }

        const attackDamage = this.getAttackDamage(attacker, attackerIntent);
        const outcome = this.resolveHit(attacker, defender, attackerIntent, defenderIntent, attackDamage);
        logs.push(...outcome.logs);
        return {
            logs,
            interruptedHeavy: outcome.interruptedHeavy,
            targetDefeated: defender.isDead(),
        };
    }

    public finalizeRound(player: Player, enemies: Skeleton[]): void {
        clearRoundState(player);
        enemies.forEach((enemy) => clearRoundState(enemy));
    }

    private prepareHeavy(attacker: CombatParticipant, intent: BattleActionIntent, logs: Array<{ message: string; type: string }>): CombatResolution {
        ensureCombatState(attacker).preparedHeavyAttack = {
            direction: intent.direction ?? 'center',
            targetId: intent.targetId,
            targetName: 'target',
        };
        logs.push({ message: `${attacker.name} prepares a heavy strike from the ${intent.direction}.`, type: 'system' });
        return { logs, interruptedHeavy: false, targetDefeated: false };
    }

    private shouldCounter(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        battleMap: BattleMap,
    ): boolean {
        const defenderState = ensureCombatState(defender);
        const qualifying = ['attack', 'heavy-release'].includes(attackerIntent.type);
        return qualifying && defenderState.counterStanceActive && battleMap.isInMeleeRange(defender, attacker);
    }

    private resolveHit(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
        damage: number,
    ): { logs: Array<{ message: string; type: string }>; interruptedHeavy: boolean } {
        const logs: Array<{ message: string; type: string }> = [];
        const defenderState = ensureCombatState(defender);
        const hitResult = this.getHitMultiplier(attacker, defender, attackerIntent, defenderIntent);
        const finalDamage = Math.max(0, Math.round(damage * hitResult.multiplier));

        if (hitResult.multiplier <= 0) {
            logs.push({ message: hitResult.message, type: 'system' });
            return { logs, interruptedHeavy: false };
        }

        defender.takeDamage(finalDamage);
        logs.push({ message: `${attacker.name} ${this.describeAttack(attackerIntent)} for ${finalDamage} damage!`, type: 'damage' });

        const interruptedHeavy = Boolean(defenderState.preparedHeavyAttack && isHostileIntent(attackerIntent));
        if (interruptedHeavy) {
            defenderState.preparedHeavyAttack = null;
            logs.push({ message: `${defender.name}'s heavy attack is interrupted!`, type: 'system' });
        }

        return { logs, interruptedHeavy };
    }

    private getHitMultiplier(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
    ): { multiplier: number; message: string } {
        const dodgeDirection = ensureCombatState(defender).dodgeDirection;
        if (!dodgeDirection) {
            return { multiplier: this.getDirectionalMultiplier(attacker, defender, attackerIntent), message: '' };
        }
        if (attackerIntent.type === 'shoot') {
            return this.getRangedDodgeMultiplier(attackerIntent.direction, dodgeDirection);
        }
        if (attackerIntent.direction === dodgeDirection) {
            return { multiplier: 0, message: `${defender.name} slips ${dodgeDirection} and avoids the blow!` };
        }
        if (attackerIntent.direction === 'center') {
            return { multiplier: 0.5, message: `${defender.name} partially avoids the attack.` };
        }
        return { multiplier: this.getDirectionalMultiplier(attacker, defender, attackerIntent), message: '' };
    }

    private getDirectionalMultiplier(attacker: CombatParticipant, defender: CombatParticipant, intent: BattleActionIntent): number {
        const lane = getLaneBetween(attacker, defender);
        if (intent.direction === null || intent.direction === lane) {
            return 1;
        }
        return intent.type === 'heavy-release' ? 0.7 : 0.8;
    }

    private getRangedDodgeMultiplier(shotDirection: string | null, dodgeDirection: string): { multiplier: number; message: string } {
        if (shotDirection === dodgeDirection) {
            return { multiplier: 1.2, message: 'The shot anticipated the dodge.' };
        }
        if (shotDirection === 'center') {
            return { multiplier: 0.5, message: 'The straight shot clips the moving target.' };
        }
        return { multiplier: 0, message: 'The shot misses after the dodge.' };
    }

    private getAttackDamage(attacker: CombatParticipant, intent: BattleActionIntent): number {
        const base = getCombatDamage(attacker);
        if (intent.type === 'heavy-release') {
            return Math.round((base * 1.8) + 1);
        }
        if (intent.type === 'shoot' && isRangedCombatant(attacker)) {
            return Math.max(1, base);
        }
        return base;
    }

    private describeAttack(intent: BattleActionIntent): string {
        if (intent.type === 'shoot') {
            return intent.direction === 'center' ? 'shoots straight' : `fires with ${intent.direction} lead`;
        }
        if (intent.type === 'heavy-release') {
            return `unleashes a heavy ${intent.direction} strike`;
        }
        return `attacks ${intent.direction}`;
    }
}
