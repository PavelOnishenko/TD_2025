import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { BattleActionIntent, CombatDirection, CombatantCombatState, createCombatState } from '../../types/combat.js';

export type CombatParticipant = Player | Skeleton;

export function ensureCombatState(actor: CombatParticipant): CombatantCombatState {
    const actorWithState = actor as CombatParticipant & { combatState?: CombatantCombatState };
    if (!actorWithState.combatState) {
        actorWithState.combatState = createCombatState();
    }
    return actorWithState.combatState;
}

export function clearRoundState(actor: CombatParticipant): void {
    const state = ensureCombatState(actor);
    state.counterStanceActive = false;
    state.dodgeDirection = null;
}

export function resetEncounterCombatState(actor: CombatParticipant): void {
    const state = ensureCombatState(actor);
    state.preparedHeavyAttack = null;
    clearRoundState(actor);
}

export function getCombatDamage(actor: CombatParticipant): number {
    if (actor instanceof Player) {
        return actor.getPhysicalDamageWithBuff();
    }
    return actor.damage;
}

export function getAttackRange(actor: CombatParticipant): number {
    const rangedActor = actor as CombatParticipant & { getAttackRange?: () => number };
    return rangedActor.getAttackRange ? rangedActor.getAttackRange() : 1;
}

export function isRangedCombatant(actor: CombatParticipant): boolean {
    return getAttackRange(actor) > 1;
}

export function getParticipantId(actor: CombatParticipant): number | null {
    return typeof actor.id === 'number' ? actor.id : null;
}

export function getLaneBetween(attacker: CombatParticipant, defender: CombatParticipant): CombatDirection {
    const delta = (attacker.gridCol ?? 0) - (defender.gridCol ?? 0);
    if (delta < 0) {
        return 'left';
    }
    if (delta > 0) {
        return 'right';
    }
    return 'center';
}

export function isHostileIntent(intent: BattleActionIntent | null): boolean {
    return Boolean(intent && ['attack', 'heavy-release', 'shoot'].includes(intent.type));
}
