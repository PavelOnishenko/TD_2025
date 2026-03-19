import BattleMap from './BattleMap.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import { BattleActionIntent, CombatDirection } from '../../types/combat.js';
import {
    clearRoundState,
    CombatParticipant,
    ensureCombatState,
    getAttackRange,
    getCombatDamage,
    getPassiveAvoidChance,
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
        const logs = this.createOpeningLogs(attacker, defender, attackerIntent, defenderIntent);
        if (this.isPassiveIntent(attackerIntent.type)) {
            return { logs: logs.concat(this.resolvePassiveIntent(attacker, attackerIntent)), interruptedHeavy: false, targetDefeated: false };
        }
        if (!battleMap.isInAttackRange(attacker, defender, getAttackRange(attacker))) {
            logs.push({ message: `[RANGE] ${attacker.name} is out of range and cannot resolve ${this.describeIntent(attackerIntent)}.`, type: 'system' });
            return { logs, interruptedHeavy: false, targetDefeated: false };
        }
        const counterResolution = this.tryCounter(attacker, defender, attackerIntent, defenderIntent, battleMap);
        if (counterResolution?.prevented) {
            return { logs: logs.concat(counterResolution.logs), interruptedHeavy: false, targetDefeated: attacker.isDead() };
        }
        if (counterResolution) {
            logs.push(...counterResolution.logs);
        }
        const hitResolution = this.resolveHit(attacker, defender, attackerIntent, defenderIntent);
        return {
            logs: logs.concat(hitResolution.logs),
            interruptedHeavy: hitResolution.interruptedHeavy,
            targetDefeated: defender.isDead(),
        };
    }

    public finalizeRound(player: Player, enemies: Skeleton[]): void {
        clearRoundState(player);
        enemies.forEach((enemy) => clearRoundState(enemy));
    }

    private isPassiveIntent(type: BattleActionIntent['type']): boolean {
        return ['move', 'wait', 'heavy', 'counter', 'dodge', 'item'].includes(type);
    }

    private resolvePassiveIntent(actor: CombatParticipant, intent: BattleActionIntent): Array<{ message: string; type: string }> {
        if (intent.type === 'heavy') {
            ensureCombatState(actor).preparedHeavyAttack = {
                direction: intent.direction ?? 'center',
                targetId: intent.targetId,
                targetName: 'target',
            };
            return [{ message: `[WIND-UP] ${actor.name} spends the round preparing a heavy ${intent.direction} strike.`, type: 'system' }];
        }
        if (intent.type === 'counter') {
            ensureCombatState(actor).counterStanceActive = true;
            return [{ message: `[STANCE] ${actor.name} enters counterattack stance and waits for a punishable hit.`, type: 'system' }];
        }
        if (intent.type === 'dodge') {
            ensureCombatState(actor).dodgeDirection = intent.direction;
            return [{ message: `[DODGE] ${actor.name} commits to a ${intent.direction} dodge path.`, type: 'system' }];
        }
        if (intent.type === 'move') {
            return [{ message: `[MOVE] ${actor.name} spends the round repositioning instead of striking.`, type: 'system' }];
        }
        if (intent.type === 'item') {
            return [{ message: `[ITEM] ${actor.name} spends the round using an item.`, type: 'system' }];
        }
        return [{ message: `[WAIT] ${actor.name} holds position and reads the fight.`, type: 'system' }];
    }

    private createOpeningLogs(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
    ): Array<{ message: string; type: string }> {
        return [
            { message: `[DECISION] ${attacker.name} selected ${this.describeIntent(attackerIntent)}.`, type: 'system' },
            { message: `[READ] ${defender.name} is showing ${this.describeDefenderState(defender, defenderIntent)}.`, type: 'system' },
        ];
    }

    private tryCounter(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
        battleMap: BattleMap,
    ): { prevented: boolean; logs: Array<{ message: string; type: string }> } | null {
        if (!this.isCounterActive(defender, defenderIntent)) {
            return null;
        }
        if (!battleMap.isInMeleeRange(defender, attacker)) {
            return { prevented: false, logs: [{ message: `[COUNTER] ${defender.name} cannot counter because the exchange is not in melee range.`, type: 'system' }] };
        }
        const preventChance = this.getCounterPreventChance(attackerIntent.type);
        if (preventChance <= 0) {
            return { prevented: false, logs: [{ message: `[COUNTER] ${defender.name} tries to counter, but ${this.describeIntent(attackerIntent)} powers through.`, type: 'system' }] };
        }
        const roll = Math.random();
        const counterDamage = getCombatDamage(defender) + balanceConfig.combat.counterDamageBonus;
        if (roll <= preventChance) {
            attacker.takeDamage(counterDamage);
            return {
                prevented: true,
                logs: [
                    { message: `[COUNTER] ${defender.name} rolls ${roll.toFixed(2)} against ${preventChance.toFixed(2)} and cleanly intercepts the attack.`, type: 'system' },
                    { message: `[COUNTER] ${defender.name} prevents the strike and returns ${counterDamage} damage.`, type: 'damage' },
                ],
            };
        }
        return {
            prevented: false,
            logs: [{ message: `[COUNTER] ${defender.name} rolls ${roll.toFixed(2)} against ${preventChance.toFixed(2)} and fails to stop the attack.`, type: 'system' }],
        };
    }

    private resolveHit(
        attacker: CombatParticipant,
        defender: CombatParticipant,
        attackerIntent: BattleActionIntent,
        defenderIntent: BattleActionIntent | null,
    ): { logs: Array<{ message: string; type: string }>; interruptedHeavy: boolean } {
        const logs: Array<{ message: string; type: string }> = [];
        const dodgeDirection = this.getDeclaredDodge(defender, defenderIntent);
        const directionalHit = this.resolveDirectionalHit(attackerIntent.direction, dodgeDirection, attackerIntent.type === 'shoot');
        logs.push({ message: directionalHit.message, type: 'system' });
        if (!directionalHit.hit) {
            return { logs, interruptedHeavy: false };
        }
        const avoidResolution = this.resolvePassiveAvoid(defender, attackerIntent.type);
        logs.push(avoidResolution.message);
        if (avoidResolution.avoided) {
            return { logs, interruptedHeavy: false };
        }
        const damage = this.getAttackDamage(attacker, attackerIntent.type);
        defender.takeDamage(damage);
        logs.push({ message: `[HIT] ${attacker.name} lands ${this.describeIntent(attackerIntent)} for ${damage} damage.`, type: 'damage' });
        const interruptedHeavy = attackerIntent.type === 'attack' && Boolean(ensureCombatState(defender).preparedHeavyAttack);
        if (interruptedHeavy) {
            ensureCombatState(defender).preparedHeavyAttack = null;
            logs.push({ message: `[INTERRUPT] ${defender.name}'s prepared heavy strike is broken by the normal hit.`, type: 'system' });
        }
        return { logs, interruptedHeavy };
    }

    private getDeclaredDodge(defender: CombatParticipant, defenderIntent: BattleActionIntent | null): CombatDirection | null {
        if (defenderIntent?.type === 'dodge') {
            return defenderIntent.direction;
        }
        return ensureCombatState(defender).dodgeDirection;
    }

    private resolveDirectionalHit(
        attackDirection: CombatDirection | null,
        dodgeDirection: CombatDirection | null,
        ranged: boolean,
    ): { hit: boolean; message: string } {
        if (attackDirection === 'left') {
            return {
                hit: dodgeDirection === 'left',
                message: dodgeDirection === 'left'
                    ? `[DIRECTION] Left read succeeds because the defender dodged left.`
                    : `[DIRECTION] Left attack misses because the defender did not dodge left.`,
            };
        }
        if (attackDirection === 'right') {
            return {
                hit: dodgeDirection === 'right',
                message: dodgeDirection === 'right'
                    ? `[DIRECTION] Right read succeeds because the defender dodged right.`
                    : `[DIRECTION] Right attack misses because the defender did not dodge right.`,
            };
        }
        const noSideDodge = dodgeDirection === null;
        const message = ranged
            ? (noSideDodge ? `[DIRECTION] Straight shot connects because no side dodge was declared.` : `[DIRECTION] Straight shot misses because the target committed to a side dodge.`)
            : (noSideDodge ? `[DIRECTION] Center line connects because the defender stayed central.` : `[DIRECTION] Center line misses because the defender committed to a side dodge.`);
        return { hit: noSideDodge, message };
    }

    private resolvePassiveAvoid(defender: CombatParticipant, attackType: BattleActionIntent['type']): { avoided: boolean; message: { message: string; type: string } } {
        const baseChance = getPassiveAvoidChance(defender);
        const reduction = attackType === 'fast' ? balanceConfig.combat.fastAttackDodgeReduction : 0;
        const effectiveChance = Math.max(0, baseChance - reduction);
        if (effectiveChance <= 0) {
            return { avoided: false, message: { message: `[AVOID] ${defender.name} has no remaining passive dodge chance after modifiers.`, type: 'system' } };
        }
        const roll = Math.random();
        if (roll < effectiveChance) {
            return {
                avoided: true,
                message: { message: `[AVOID] ${defender.name} rolls ${roll.toFixed(2)} under ${effectiveChance.toFixed(2)} and slips the hit.`, type: 'system' },
            };
        }
        return {
            avoided: false,
            message: { message: `[AVOID] ${defender.name} rolls ${roll.toFixed(2)} against ${effectiveChance.toFixed(2)} and fails to passively avoid the hit.`, type: 'system' },
        };
    }

    private isCounterActive(defender: CombatParticipant, defenderIntent: BattleActionIntent | null): boolean {
        return defenderIntent?.type === 'counter' || ensureCombatState(defender).counterStanceActive;
    }

    private getCounterPreventChance(type: BattleActionIntent['type']): number {
        if (type === 'attack') {
            return balanceConfig.combat.counterPreventChance.attack;
        }
        if (type === 'fast') {
            return balanceConfig.combat.counterPreventChance.fast;
        }
        return balanceConfig.combat.counterPreventChance.heavyRelease;
    }

    private getAttackDamage(attacker: CombatParticipant, type: BattleActionIntent['type']): number {
        const base = getCombatDamage(attacker);
        if (type === 'fast') {
            return Math.max(1, Math.round(base * balanceConfig.combat.fastAttackDamageMultiplier));
        }
        if (type === 'heavy-release') {
            return Math.round((base * balanceConfig.combat.heavyDamageMultiplier) + balanceConfig.combat.heavyDamageBonus);
        }
        if (type === 'shoot' && isRangedCombatant(attacker)) {
            return Math.max(1, base);
        }
        return base;
    }

    private describeIntent(intent: BattleActionIntent): string {
        if (intent.type === 'shoot') {
            return intent.direction === 'center' ? 'Shoot Straight' : `Shoot ${intent.direction}`;
        }
        if (intent.type === 'heavy-release') {
            return `Heavy Release ${intent.direction}`;
        }
        if (intent.direction) {
            return `${intent.type.toUpperCase()} ${intent.direction.toUpperCase()}`;
        }
        return intent.type.toUpperCase();
    }

    private describeDefenderState(defender: CombatParticipant, defenderIntent: BattleActionIntent | null): string {
        if (defenderIntent) {
            return this.describeIntent(defenderIntent);
        }
        const state = ensureCombatState(defender);
        if (state.preparedHeavyAttack) {
            return `prepared heavy ${state.preparedHeavyAttack.direction}`;
        }
        if (state.counterStanceActive) {
            return 'stored counter stance';
        }
        if (state.dodgeDirection) {
            return `stored dodge ${state.dodgeDirection}`;
        }
        return 'no declared reaction';
    }
}
