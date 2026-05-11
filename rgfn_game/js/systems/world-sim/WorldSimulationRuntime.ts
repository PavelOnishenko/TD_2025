import { FactionId, FactionState, WorldSimulationStage, WorldSimulationState } from './WorldSimulationTypes.js';
export type { WorldSimulationState } from './WorldSimulationTypes.js';

type PartialState = Partial<WorldSimulationState> | null | undefined;

const PIPELINE: WorldSimulationStage[] = ['movement', 'taskAssign', 'taskProgress', 'conflicts', 'villages'];
const CAPTURE_HOURS_REQUIRED = 24;

const createDefaultFactions = (): Record<FactionId, FactionState> => ({
    red: { factionId: 'red', territoryCellIds: ['0,0'], activeSquadIds: ['red-1'] },
    blue: { factionId: 'blue', territoryCellIds: ['2,0'], activeSquadIds: ['blue-1'] },
});

const createDefaultState = (): WorldSimulationState => ({
    worldTick: 0,
    lastDelta: 0,
    pendingEvents: [],
    lastStageOrder: [],
    factions: createDefaultFactions(),
    raids: [],
    captureTimers: {},
    intercepts: [],
});

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
    return events.filter((item) => typeof item === 'string').map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 64);
};

const sanitizeStageOrder = (stages: unknown): WorldSimulationStage[] => {
    if (!Array.isArray(stages)) {
        return [];
    }
    return stages.filter((stage): stage is WorldSimulationStage => PIPELINE.includes(stage as WorldSimulationStage));
};

const toCell = (cellId: string): [number, number] => cellId.split(',').map((n) => Number.parseInt(n, 10)) as [number, number];
const dist = (a: string, b: string): number => {
    const [ax, ay] = toCell(a);
    const [bx, by] = toCell(b);
    return Math.abs(ax - bx) + Math.abs(ay - by);
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

    public readonly getState = (): WorldSimulationState => JSON.parse(JSON.stringify(this.state));

    public restoreState(nextState?: PartialState): void {
        if (!nextState || typeof nextState !== 'object') {
            return;
        }
        this.state.worldTick = Math.floor(ensureNonNegativeFinite(nextState.worldTick));
        this.state.lastDelta = ensureNonNegativeFinite(nextState.lastDelta);
        this.state.pendingEvents = sanitizePendingEvents(nextState.pendingEvents);
        this.state.lastStageOrder = sanitizeStageOrder(nextState.lastStageOrder);
        if (nextState.factions?.red && nextState.factions?.blue) {
            this.state.factions = nextState.factions as Record<FactionId, FactionState>;
        }
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
        this.runStageSideEffects(stage, deltaMinutes);
    }

    private runStageSideEffects(stage: WorldSimulationStage, deltaMinutes: number): void {
        if (stage === 'taskAssign') {
            this.assignRaidToNearestEnemyCell();
        }
        if (stage === 'conflicts') {
            this.resolveInterceptsAndConflicts();
        }
        if (stage === 'villages') {
            this.processCaptures(deltaMinutes / 60);
        }
    }

    private assignRaidToNearestEnemyCell(): void {
        if (this.state.raids.some((raid) => raid.status !== 'resolved')) {
            return;
        }
        const redOrigin = this.state.factions.red.territoryCellIds[0];
        const blueCells = this.state.factions.blue.territoryCellIds;
        const nearest = blueCells.reduce((acc, cell) => (dist(redOrigin, cell) < dist(redOrigin, acc) ? cell : acc), blueCells[0]);
        this.state.raids.push({
            raidId: `raid-${this.state.worldTick}`,
            attackerFactionId: 'red',
            defenderFactionId: 'blue',
            fromCellId: redOrigin,
            targetCellId: nearest,
            status: 'moving',
        });
    }

    private resolveInterceptsAndConflicts(): void {
        this.state.intercepts = [];
        for (const raid of this.state.raids) {
            if (raid.status !== 'moving') {
                continue;
            }
            if (this.state.factions.blue.activeSquadIds.length > 0) {
                raid.status = 'intercepted';
                this.state.intercepts.push(`${raid.raidId}:blue-intercept`);
                this.enqueueEvent(`conflict:intercept:${raid.raidId}`);
                raid.status = 'capturing';
                const existing = this.state.captureTimers[raid.targetCellId];
                this.state.captureTimers[raid.targetCellId] = existing ?? { attackerFactionId: 'red', defenderPresent: false, progressHours: 0 };
            }
        }
    }

    private processCaptures(deltaHours: number): void {
        Object.entries(this.state.captureTimers).forEach(([cellId, timer]) => {
            if (timer.defenderPresent) {
                timer.progressHours = 0;
                return;
            }
            timer.progressHours += deltaHours;
            this.enqueueEvent(`capture:${cellId}:${timer.progressHours.toFixed(2)}h`);
            if (timer.progressHours >= CAPTURE_HOURS_REQUIRED) {
                this.state.factions.blue.territoryCellIds = this.state.factions.blue.territoryCellIds.filter((cell) => cell !== cellId);
                if (!this.state.factions.red.territoryCellIds.includes(cellId)) {
                    this.state.factions.red.territoryCellIds.push(cellId);
                }
                delete this.state.captureTimers[cellId];
                this.enqueueEvent(`capture:resolved:${cellId}:red`);
            }
        });
    }

    private enqueueEvent(eventLabel: string): void {
        this.state.pendingEvents.push(eventLabel);
        if (this.state.pendingEvents.length > 64) {
            this.state.pendingEvents = this.state.pendingEvents.slice(-64);
        }
    }
}
