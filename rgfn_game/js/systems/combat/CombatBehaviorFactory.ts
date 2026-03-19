import { CombatBehaviorProfile, CombatDirection } from '../../types/combat.js';

const DIRECTIONS: CombatDirection[] = ['left', 'center', 'right'];

type ProfileTemplate = {
    normalAttackWeight: number;
    heavyAttackWeight: number;
    counterWeight: number;
    dodgeWeight: number;
    rangedWeight: number;
    aggressiveness: number;
    caution: number;
    punishHeavyWeight: number;
    dodgeResponseWeight: number;
    preferredDirection: CombatDirection;
    directionWeights: Record<CombatDirection, number>;
};

const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {
    player: createTemplate('center', [1, 1.1, 1], [5, 3, 2, 2.5, 0], [0.6, 0.4, 0.6]),
    human: createTemplate('center', [1, 0.8, 0.9], [4, 2, 2.4, 2.8, 1.8], [0.9, 1.2, 0.9]),
    skeleton: createTemplate('center', [1.2, 0.7, 1.1], [3.6, 1.5, 2.6, 1.4, 0], [0.8, 1.5, 0.8]),
    zombie: createTemplate('center', [0.8, 1.4, 0.5], [3.2, 2.6, 0.8, 0.8, 0], [0.8, 1.4, 0.8]),
    ninja: createTemplate('left', [1.1, 0.7, 1.2], [3.2, 1.2, 1.3, 3.2, 0], [1.2, 0.7, 1.1]),
    darkKnight: createTemplate('center', [1, 1.2, 1], [3.8, 2.5, 3.1, 0.7, 0], [0.9, 1.3, 0.9]),
    dragon: createTemplate('center', [1, 1.1, 1], [4.2, 2.8, 1.6, 0.6, 0], [0.9, 1.2, 0.9]),
};

export default class CombatBehaviorFactory {
    private readonly worldProfiles: Map<string, CombatBehaviorProfile>;

    constructor() {
        this.worldProfiles = new Map();
        Object.keys(PROFILE_TEMPLATES).forEach((key) => {
            this.worldProfiles.set(key, this.createProfile(key));
        });
    }

    public getProfile(archetypeId: string): CombatBehaviorProfile {
        return this.cloneProfile(this.worldProfiles.get(archetypeId) ?? this.worldProfiles.get('skeleton')!);
    }

    private createProfile(archetypeId: string): CombatBehaviorProfile {
        const template = PROFILE_TEMPLATES[archetypeId] ?? PROFILE_TEMPLATES.skeleton;
        return {
            archetypeId,
            preferredDirection: template.preferredDirection,
            directionWeights: this.rollDirectionWeights(template.directionWeights),
            normalAttackWeight: this.rollWeight(template.normalAttackWeight),
            heavyAttackWeight: this.rollWeight(template.heavyAttackWeight),
            counterWeight: this.rollWeight(template.counterWeight),
            dodgeWeight: this.rollWeight(template.dodgeWeight),
            rangedWeight: this.rollWeight(template.rangedWeight),
            aggressiveness: this.rollScalar(template.aggressiveness),
            caution: this.rollScalar(template.caution),
            punishHeavyWeight: this.rollWeight(template.punishHeavyWeight),
            dodgeResponseWeight: this.rollWeight(template.dodgeResponseWeight),
        };
    }

    private cloneProfile(profile: CombatBehaviorProfile): CombatBehaviorProfile {
        return {
            ...profile,
            directionWeights: { ...profile.directionWeights },
        };
    }

    private rollDirectionWeights(weights: Record<CombatDirection, number>): Record<CombatDirection, number> {
        return {
            left: this.rollWeight(weights.left),
            center: this.rollWeight(weights.center),
            right: this.rollWeight(weights.right),
        };
    }

    private rollWeight(base: number): number {
        return Number(Math.max(0.1, base + ((Math.random() * 0.4) - 0.2)).toFixed(2));
    }

    private rollScalar(base: number): number {
        return Number(Math.min(2, Math.max(0.2, base + ((Math.random() * 0.3) - 0.15))).toFixed(2));
    }
}

function createTemplate(
    preferredDirection: CombatDirection,
    directions: [number, number, number],
    weights: [number, number, number, number, number],
    traits: [number, number, number],
): ProfileTemplate {
    return {
        preferredDirection,
        directionWeights: {
            left: directions[0],
            center: directions[1],
            right: directions[2],
        },
        normalAttackWeight: weights[0],
        heavyAttackWeight: weights[1],
        counterWeight: weights[2],
        dodgeWeight: weights[3],
        rangedWeight: weights[4],
        aggressiveness: traits[0],
        caution: traits[1],
        punishHeavyWeight: traits[2],
        dodgeResponseWeight: traits[1],
    };
}

export function pickWeightedDirection(weights: Record<CombatDirection, number>): CombatDirection {
    const total = DIRECTIONS.reduce((sum, direction) => sum + weights[direction], 0);
    let roll = Math.random() * total;

    for (const direction of DIRECTIONS) {
        roll -= weights[direction];
        if (roll <= 0) {
            return direction;
        }
    }

    return 'center';
}
