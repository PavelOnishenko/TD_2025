import { randomInt } from '../../../../engine/utils/MathUtils.js';
import type { CombatMove } from './DirectionalCombat.js';

export type MonsterDirectionalBehavior = {
    id: string;
    weight: number;
    moves: CombatMove[];
};

export type MonsterDirectionalBehaviorCodex = Record<string, MonsterDirectionalBehavior[]>;

type MonsterBehaviorGenerationConfig = {
    minBehaviorsPerMonsterType: number;
    maxBehaviorsPerMonsterType: number;
    minMovesPerBehavior: number;
    maxMovesPerBehavior: number;
    behaviorWeightMin: number;
    behaviorWeightMax: number;
    monsterMovePools: Record<string, string[]>;
};

const COMBAT_MOVES: CombatMove[] = ['AttackLeft', 'AttackCenter', 'AttackRight', 'Block', 'DodgeLeft', 'DodgeRight'];

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const sanitizeMovePool = (movePool: string[]): CombatMove[] => {
    const set = new Set(COMBAT_MOVES);
    const sanitized = movePool.filter((move): move is CombatMove => set.has(move as CombatMove));
    return sanitized.length > 0 ? sanitized : ['AttackCenter'];
};

// eslint-disable-next-line style-guide/function-length-warning
export function generateMonsterDirectionalBehaviorCodex(config: MonsterBehaviorGenerationConfig): MonsterDirectionalBehaviorCodex {
    const codex: MonsterDirectionalBehaviorCodex = {};

    Object.entries(config.monsterMovePools).forEach(([monsterType, movePool]) => {
        const sanitizedPool = sanitizeMovePool(movePool);
        const behaviorCount = randomInt(config.minBehaviorsPerMonsterType, config.maxBehaviorsPerMonsterType);
        const behaviors: MonsterDirectionalBehavior[] = [];

        for (let behaviorIndex = 0; behaviorIndex < behaviorCount; behaviorIndex++) {
            const movesCount = randomInt(config.minMovesPerBehavior, config.maxMovesPerBehavior);
            const moves: CombatMove[] = Array.from({ length: movesCount }, () => pickOne(sanitizedPool));
            const weight = randomInt(config.behaviorWeightMin, config.behaviorWeightMax);
            behaviors.push({ id: `${monsterType}-behavior-${behaviorIndex + 1}`, weight, moves });
        }

        codex[monsterType] = behaviors;
    });

    return codex;
}

export function selectWeightedBehavior(behaviors: MonsterDirectionalBehavior[]): MonsterDirectionalBehavior | null {
    const totalWeight = behaviors.reduce((sum, behavior) => sum + Math.max(0, behavior.weight), 0);
    if (totalWeight <= 0 || behaviors.length === 0) {
        return behaviors[0] ?? null;
    }

    let roll = Math.random() * totalWeight;
    for (const behavior of behaviors) {
        roll -= Math.max(0, behavior.weight);
        if (roll <= 0) {
            return behavior;
        }
    }

    return behaviors[behaviors.length - 1] ?? null;
}
