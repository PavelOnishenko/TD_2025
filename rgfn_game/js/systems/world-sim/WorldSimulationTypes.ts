export type WorldSimulationStage = 'movement' | 'taskAssign' | 'taskProgress' | 'conflicts' | 'villages';
export type FactionId = 'red' | 'blue';
export type FactionState = { factionId: FactionId; territoryCellIds: string[]; activeSquadIds: string[] };
export type RaidState = {
    raidId: string;
    attackerFactionId: FactionId;
    defenderFactionId: FactionId;
    fromCellId: string;
    targetCellId: string;
    status: 'moving' | 'intercepted' | 'capturing' | 'resolved';
};
export type CaptureTimerState = { attackerFactionId: FactionId; defenderPresent: boolean; progressHours: number };
export type WorldSimulationState = {
    worldTick: number;
    lastDelta: number;
    pendingEvents: string[];
    lastStageOrder: WorldSimulationStage[];
    factions: Record<FactionId, FactionState>;
    raids: RaidState[];
    captureTimers: Record<string, CaptureTimerState>;
    intercepts: string[];
};
