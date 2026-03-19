import BattleMap from './BattleMap.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { BattleActionIntent, CombatDirection, CombatIntentType, CombatBehaviorProfile } from '../../types/combat.js';
import { ensureCombatState, getAttackRange, isRangedCombatant } from './CombatParticipantUtils.js';
import { pickWeightedDirection } from './CombatBehaviorFactory.js';

type WeightedIntent = {
    type: CombatIntentType;
    direction: CombatDirection | null;
    weight: number;
};

export default class CombatAi {
    public chooseIntent(enemy: Skeleton, player: Player, battleMap: BattleMap, playerIntent: BattleActionIntent | null): BattleActionIntent {
        const state = ensureCombatState(enemy);
        if (state.preparedHeavyAttack) {
            return this.createIntent('heavy-release', state.preparedHeavyAttack.direction, enemy, player);
        }

        if (!battleMap.isInAttackRange(enemy, player, getAttackRange(enemy))) {
            return this.createIntent('move', null, enemy, player);
        }

        const profile = enemy.getCombatBehaviorProfile();
        const direction = this.pickDirection(profile);
        const intents = this.createWeightedIntents(profile, playerIntent, direction, isRangedCombatant(enemy));
        const choice = this.pickIntent(intents);
        return this.createIntent(choice.type, choice.direction, enemy, player);
    }

    private createWeightedIntents(
        profile: CombatBehaviorProfile,
        playerIntent: BattleActionIntent | null,
        direction: CombatDirection,
        ranged: boolean,
    ): WeightedIntent[] {
        const punishingHeavy = playerIntent?.type === 'heavy' || playerIntent?.type === 'heavy-release';
        const intents: WeightedIntent[] = [
            { type: 'attack', direction, weight: profile.normalAttackWeight * profile.aggressiveness },
            { type: 'heavy', direction, weight: profile.heavyAttackWeight * profile.aggressiveness },
            { type: 'counter', direction: null, weight: profile.counterWeight * (punishingHeavy ? profile.punishHeavyWeight : 1) },
            { type: 'dodge', direction, weight: profile.dodgeWeight * (punishingHeavy ? profile.dodgeResponseWeight : profile.caution) },
            { type: 'shoot', direction, weight: ranged ? profile.rangedWeight * profile.aggressiveness : 0 },
        ];
        return intents.filter((intent) => intent.weight > 0.1);
    }

    private pickDirection(profile: CombatBehaviorProfile): CombatDirection {
        return pickWeightedDirection(profile.directionWeights);
    }

    private pickIntent(intents: WeightedIntent[]): WeightedIntent {
        const total = intents.reduce((sum, intent) => sum + intent.weight, 0);
        let roll = Math.random() * total;

        for (const intent of intents) {
            roll -= intent.weight;
            if (roll <= 0) {
                return intent;
            }
        }

        return intents[0];
    }

    private createIntent(
        type: CombatIntentType,
        direction: CombatDirection | null,
        enemy: Skeleton,
        player: Player,
    ): BattleActionIntent {
        return {
            type,
            direction,
            targetId: player.id,
            source: 'enemy',
        };
    }
}
