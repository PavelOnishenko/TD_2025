import { balanceConfig } from '../../config/balanceConfig.js';

export type CombatMove =
    | 'AttackLeft'
    | 'AttackCenter'
    | 'AttackRight'
    | 'Block'
    | 'DodgeLeft'
    | 'DodgeRight';

export type CombatBuffSnapshot = {
    hasBlockAdvantage: boolean;
    hasSuccessfulDodgeMultiplier: boolean;
    successfulDodgeMultiplier: number;
};

export type CombatStatusState = {
    blockAdvantage: boolean;
    successfulDodgeMultiplier: number | null;
};

export type MoveResolution = {
    move: CombatMove;
    isAttack: boolean;
    damageDealt: number;
    logs: string[];
};

export type ExchangeResolution = {
    actor: MoveResolution;
    opponent: MoveResolution;
    actorRewards: CombatStatusState;
    opponentRewards: CombatStatusState;
    summaryLogs: string[];
};

type ExchangeParams = {
    actorName: string;
    opponentName: string;
    actorMove: CombatMove;
    opponentMove: CombatMove;
    actorBaseDamage: number;
    opponentBaseDamage: number;
    actorBuffs: CombatBuffSnapshot;
    opponentBuffs: CombatBuffSnapshot;
};

const ATTACK_DIRECTIONS: Record<'AttackLeft' | 'AttackCenter' | 'AttackRight', number> = {
    AttackLeft: 0,
    AttackCenter: 1,
    AttackRight: 2,
};

export function isAttackMove(move: CombatMove): boolean {
    return move === 'AttackLeft' || move === 'AttackCenter' || move === 'AttackRight';
}

export function getMoveLabel(move: CombatMove): string {
    switch (move) {
        case 'AttackLeft':
            return 'Attack Left';
        case 'AttackCenter':
            return 'Attack Center';
        case 'AttackRight':
            return 'Attack Right';
        case 'Block':
            return 'Block';
        case 'DodgeLeft':
            return 'Dodge Left';
        case 'DodgeRight':
            return 'Dodge Right';
        default:
            return move;
    }
}

function getAttackRelationship(actorMove: CombatMove, opponentMove: CombatMove): 'same' | 'adjacent' | 'opposite' | 'none' {
    if (!isAttackMove(actorMove) || !isAttackMove(opponentMove)) {
        return 'none';
    }

    const actorLane = ATTACK_DIRECTIONS[actorMove];
    const opponentLane = ATTACK_DIRECTIONS[opponentMove];
    const delta = Math.abs(actorLane - opponentLane);

    if (delta === 0) {
        return 'same';
    }

    if (delta === 1) {
        return 'adjacent';
    }

    return 'opposite';
}

function getAttackDamage(baseDamage: number, buffs: CombatBuffSnapshot): { damage: number; logs: string[] } {
    let damage = baseDamage;
    const logs: string[] = [];

    if (buffs.hasSuccessfulDodgeMultiplier) {
        damage = Math.round(damage * buffs.successfulDodgeMultiplier);
        logs.push(`Successful dodge bonus multiplies the attack to ${damage} damage (x${buffs.successfulDodgeMultiplier.toFixed(2)}).`);
    }

    if (buffs.hasBlockAdvantage) {
        logs.push('Block Advantage is primed and can remove the adjacent-direction penalty from this attack.');
    }

    return { damage, logs };
}

function getDodgeVulnerableMove(move: CombatMove): CombatMove | null {
    if (move === 'DodgeLeft') {
        return 'AttackLeft';
    }

    if (move === 'DodgeRight') {
        return 'AttackRight';
    }

    return null;
}

function createNoDamageResolution(move: CombatMove): MoveResolution {
    return {
        move,
        isAttack: isAttackMove(move),
        damageDealt: 0,
        logs: [],
    };
}

export function resolveDirectionalCombatExchange(params: ExchangeParams): ExchangeResolution {
    const {
        actorName,
        opponentName,
        actorMove,
        opponentMove,
        actorBaseDamage,
        opponentBaseDamage,
        actorBuffs,
        opponentBuffs,
    } = params;

    const actor = createNoDamageResolution(actorMove);
    const opponent = createNoDamageResolution(opponentMove);
    const actorRewards: CombatStatusState = { blockAdvantage: false, successfulDodgeMultiplier: null };
    const opponentRewards: CombatStatusState = { blockAdvantage: false, successfulDodgeMultiplier: null };
    const summaryLogs = [
        `${actorName} chooses ${getMoveLabel(actorMove)} while ${opponentName} chooses ${getMoveLabel(opponentMove)}.`,
    ];

    const actorDamageData = isAttackMove(actorMove) ? getAttackDamage(actorBaseDamage, actorBuffs) : { damage: 0, logs: [] };
    const opponentDamageData = isAttackMove(opponentMove) ? getAttackDamage(opponentBaseDamage, opponentBuffs) : { damage: 0, logs: [] };
    actor.logs.push(...actorDamageData.logs);
    opponent.logs.push(...opponentDamageData.logs);

    if (isAttackMove(actorMove) && isAttackMove(opponentMove)) {
        const relation = getAttackRelationship(actorMove, opponentMove);

        if (relation === 'same') {
            actor.damageDealt = actorDamageData.damage;
            opponent.damageDealt = opponentDamageData.damage;
            summaryLogs.push('Both attacks matched lanes, so both sides land full damage.');
        } else if (relation === 'adjacent') {
            actor.damageDealt = Math.round(actorDamageData.damage * (actorBuffs.hasBlockAdvantage ? 1 : balanceConfig.combat.adjacentAttackDamagePenalty));
            opponent.damageDealt = Math.round(opponentDamageData.damage * (opponentBuffs.hasBlockAdvantage ? 1 : balanceConfig.combat.adjacentAttackDamagePenalty));
            summaryLogs.push('The attacks were adjacent lanes, so both hits are reduced unless Block Advantage removes the penalty.');
            summaryLogs.push(actorBuffs.hasBlockAdvantage
                ? `${actorName}'s Block Advantage upgrades the adjacent attack to full damage.`
                : `${actorName}'s damage is reduced by adjacentAttackDamagePenalty (${balanceConfig.combat.adjacentAttackDamagePenalty}).`);
            summaryLogs.push(opponentBuffs.hasBlockAdvantage
                ? `${opponentName}'s Block Advantage upgrades the adjacent attack to full damage.`
                : `${opponentName}'s damage is reduced by adjacentAttackDamagePenalty (${balanceConfig.combat.adjacentAttackDamagePenalty}).`);
        } else {
            summaryLogs.push('The attacks came from opposite lanes, so both attacks miss.');
        }

        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    if (isAttackMove(actorMove) && opponentMove === 'Block') {
        actor.damageDealt = Math.round(actorDamageData.damage * balanceConfig.combat.blockDamageReduction);
        opponentRewards.blockAdvantage = true;
        summaryLogs.push(`${opponentName} blocks. The attack still lands, but block reduces the damage by factor ${balanceConfig.combat.blockDamageReduction}.`);
        summaryLogs.push(`${opponentName} gains Block Advantage because the block absorbed an incoming attack.`);
        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    if (actorMove === 'Block' && isAttackMove(opponentMove)) {
        opponent.damageDealt = Math.round(opponentDamageData.damage * balanceConfig.combat.blockDamageReduction);
        actorRewards.blockAdvantage = true;
        summaryLogs.push(`${actorName} blocks. The attack still lands, but block reduces the damage by factor ${balanceConfig.combat.blockDamageReduction}.`);
        summaryLogs.push(`${actorName} gains Block Advantage because the block absorbed an incoming attack.`);
        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    if (isAttackMove(actorMove) && (opponentMove === 'DodgeLeft' || opponentMove === 'DodgeRight')) {
        if (actorMove === getDodgeVulnerableMove(opponentMove)) {
            actor.damageDealt = actorDamageData.damage;
            summaryLogs.push(`${opponentName}'s ${getMoveLabel(opponentMove)} is vulnerable to ${getMoveLabel(actorMove)}, so the attack connects.`);
        } else {
            opponentRewards.successfulDodgeMultiplier = balanceConfig.combat.successfulDodgeDamageMultiplier;
            summaryLogs.push(`${opponentName} dodges successfully. ${getMoveLabel(actorMove)} misses ${getMoveLabel(opponentMove)}.`);
            summaryLogs.push(`${opponentName} gains a successful dodge damage multiplier for the next attack (x${balanceConfig.combat.successfulDodgeDamageMultiplier.toFixed(2)}).`);
        }
        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    if ((actorMove === 'DodgeLeft' || actorMove === 'DodgeRight') && isAttackMove(opponentMove)) {
        if (opponentMove === getDodgeVulnerableMove(actorMove)) {
            opponent.damageDealt = opponentDamageData.damage;
            summaryLogs.push(`${actorName}'s ${getMoveLabel(actorMove)} is vulnerable to ${getMoveLabel(opponentMove)}, so the attack connects.`);
        } else {
            actorRewards.successfulDodgeMultiplier = balanceConfig.combat.successfulDodgeDamageMultiplier;
            summaryLogs.push(`${actorName} dodges successfully. ${getMoveLabel(opponentMove)} misses ${getMoveLabel(actorMove)}.`);
            summaryLogs.push(`${actorName} gains a successful dodge damage multiplier for the next attack (x${balanceConfig.combat.successfulDodgeDamageMultiplier.toFixed(2)}).`);
        }
        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    summaryLogs.push('No attack connected in this exchange.');
    return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
}
