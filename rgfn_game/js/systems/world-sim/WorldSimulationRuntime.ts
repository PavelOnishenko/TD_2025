export type WorldSimulationStage = 'movement' | 'taskAssign' | 'taskProgress' | 'conflicts' | 'villages';

export type WorldSimulationState = { worldTick: number; lastDelta: number; pendingEvents: string[]; lastStageOrder: WorldSimulationStage[] };

type PartialState = Partial<WorldSimulationState> | null | undefined;

const PIPELINE: WorldSimulationStage[] = ['movement', 'taskAssign', 'taskProgress', 'conflicts', 'villages'];

const createDefaultState = (): WorldSimulationState => ({ worldTick: 0, lastDelta: 0, pendingEvents: [], lastStageOrder: [] });

const ensureNonNegativeFinite = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return numeric;
};

const sanitizePendingEvents = (events: unknown): string[] => {
    if (!Array.isArray(events)) {
        return [];
    }
    return events
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 64);
};

const sanitizeStageOrder = (stages: unknown): WorldSimulationStage[] => {
    if (!Array.isArray(stages)) {
        return [];
    }
    return stages.filter((stage): stage is WorldSimulationStage => PIPELINE.includes(stage as WorldSimulationStage));
};

export default class WorldSimulationRuntime {
    private state: WorldSimulationState = createDefaultState();

    public initialize(initialState?: PartialState): void {
        this.state = createDefaultState();
        this.restoreState(initialState);
    }

    public tick(deltaMinutes: number): WorldSimulationState {
        const safeDelta = ensureNonNegativeFinite(deltaMinutes);
        this.state.worldTick += 1;
        this.state.lastDelta = safeDelta;
        this.state.lastStageOrder = [];

        for (const stage of PIPELINE) {
            this.runStage(stage, safeDelta);
        }

        return this.getState();
    }

    public readonly getState = (): WorldSimulationState => ({
        worldTick: this.state.worldTick,
        lastDelta: this.state.lastDelta,
        pendingEvents: [...this.state.pendingEvents],
        lastStageOrder: [...this.state.lastStageOrder],
    });

    public restoreState(nextState?: PartialState): void {
        if (!nextState || typeof nextState !== 'object') {
            return;
        }

        this.state.worldTick = Math.floor(ensureNonNegativeFinite(nextState.worldTick));
        this.state.lastDelta = ensureNonNegativeFinite(nextState.lastDelta);
        this.state.pendingEvents = sanitizePendingEvents(nextState.pendingEvents);
        this.state.lastStageOrder = sanitizeStageOrder(nextState.lastStageOrder);
    }

    private runStage(stage: WorldSimulationStage, deltaMinutes: number): void {
        this.state.lastStageOrder.push(stage);
        const eventByStage: Record<WorldSimulationStage, string> = {
            movement: `movement:${deltaMinutes.toFixed(2)}`,
            taskAssign: `taskAssign:tick-${this.state.worldTick}`,
            taskProgress: `taskProgress:${deltaMinutes.toFixed(2)}`,
            conflicts: `conflicts:scan-${this.state.worldTick}`,
            villages: `villages:update-${this.state.worldTick}`,
        };
        this.enqueueEvent(eventByStage[stage]);
    }

    private enqueueEvent(eventLabel: string): void {
        this.state.pendingEvents.push(eventLabel);
        if (this.state.pendingEvents.length > 64) {
            this.state.pendingEvents = this.state.pendingEvents.slice(-64);
        }
    }
}
