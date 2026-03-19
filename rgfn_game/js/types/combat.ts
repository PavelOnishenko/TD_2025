export type CombatDirection = 'left' | 'center' | 'right';

export type CombatIntentType =
    | 'attack'
    | 'heavy'
    | 'heavy-release'
    | 'counter'
    | 'dodge'
    | 'shoot'
    | 'move'
    | 'wait'
    | 'spell'
    | 'item';

export type CombatUiActionId =
    | 'attack-left'
    | 'attack-center'
    | 'attack-right'
    | 'heavy-left'
    | 'heavy-center'
    | 'heavy-right'
    | 'counter-stance'
    | 'dodge-left'
    | 'dodge-right'
    | 'shoot-straight'
    | 'shoot-lead-left'
    | 'shoot-lead-right';

export type PreparedHeavyAttack = {
    direction: CombatDirection;
    targetId: number | null;
    targetName: string;
};

export type CombatantCombatState = {
    preparedHeavyAttack: PreparedHeavyAttack | null;
    counterStanceActive: boolean;
    dodgeDirection: CombatDirection | null;
};

export type BattleActionIntent = {
    type: CombatIntentType;
    direction: CombatDirection | null;
    targetId: number | null;
    source: 'player' | 'enemy' | 'system';
};

export type CombatBehaviorProfile = {
    archetypeId: string;
    preferredDirection: CombatDirection;
    directionWeights: Record<CombatDirection, number>;
    normalAttackWeight: number;
    heavyAttackWeight: number;
    counterWeight: number;
    dodgeWeight: number;
    rangedWeight: number;
    aggressiveness: number;
    caution: number;
    punishHeavyWeight: number;
    dodgeResponseWeight: number;
};

export type CombatUiActionDefinition = {
    id: CombatUiActionId;
    label: string;
    type: CombatIntentType;
    direction: CombatDirection | null;
    requiresRangedWeapon?: boolean;
};

export const DEFAULT_COMBAT_STATE: CombatantCombatState = {
    preparedHeavyAttack: null,
    counterStanceActive: false,
    dodgeDirection: null,
};

export const PLAYER_COMBAT_ACTIONS: CombatUiActionDefinition[] = [
    { id: 'attack-left', label: 'Attack Left', type: 'attack', direction: 'left' },
    { id: 'attack-center', label: 'Attack Center', type: 'attack', direction: 'center' },
    { id: 'attack-right', label: 'Attack Right', type: 'attack', direction: 'right' },
    { id: 'heavy-left', label: 'Heavy Left', type: 'heavy', direction: 'left' },
    { id: 'heavy-center', label: 'Heavy Center', type: 'heavy', direction: 'center' },
    { id: 'heavy-right', label: 'Heavy Right', type: 'heavy', direction: 'right' },
    { id: 'counter-stance', label: 'Counter Stance', type: 'counter', direction: null },
    { id: 'dodge-left', label: 'Dodge Left', type: 'dodge', direction: 'left' },
    { id: 'dodge-right', label: 'Dodge Right', type: 'dodge', direction: 'right' },
    { id: 'shoot-straight', label: 'Shoot Straight', type: 'shoot', direction: 'center', requiresRangedWeapon: true },
    { id: 'shoot-lead-left', label: 'Shoot Lead Left', type: 'shoot', direction: 'left', requiresRangedWeapon: true },
    { id: 'shoot-lead-right', label: 'Shoot Lead Right', type: 'shoot', direction: 'right', requiresRangedWeapon: true },
];

export function createCombatState(): CombatantCombatState {
    return {
        preparedHeavyAttack: null,
        counterStanceActive: false,
        dodgeDirection: null,
    };
}
