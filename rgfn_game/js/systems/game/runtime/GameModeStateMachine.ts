import StateMachine from '../../../utils/StateMachine.js';

export const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
    VILLAGE: 'VILLAGE',
};

type StateBindings<TEnemy> = {
    onEnterWorld: () => void;
    onUpdateWorld: (dt: number) => void;
    onEnterBattle: (enemies: TEnemy[]) => void;
    onUpdateBattle: (dt: number) => void;
    onExitBattle: () => void;
    onEnterVillage: () => void;
    onExitVillage: () => void;
};

export default class GameModeStateMachine<TEnemy> {
    private readonly bindings: StateBindings<TEnemy>;

    constructor(bindings: StateBindings<TEnemy>) {
        this.bindings = bindings;
    }

    public create(): StateMachine {
        const machine = new StateMachine(MODES.WORLD_MAP);
        machine.addState(MODES.WORLD_MAP, {
            enter: () => this.bindings.onEnterWorld(),
            update: (dt: number) => this.bindings.onUpdateWorld(dt),
        });
        machine.addState(MODES.BATTLE, {
            enter: (enemies: TEnemy[]) => this.bindings.onEnterBattle(enemies),
            update: (dt: number) => this.bindings.onUpdateBattle(dt),
            exit: () => this.bindings.onExitBattle(),
        });
        machine.addState(MODES.VILLAGE, {
            enter: () => this.bindings.onEnterVillage(),
            update: () => {},
            exit: () => this.bindings.onExitVillage(),
        });
        return machine;
    }
}
