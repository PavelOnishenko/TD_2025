export type FormationDefaults = {
    formationGap: number;
    minimumWeight: number;
};

export type FormationShipDescriptor = {
    type: string;
    time?: number;
    y?: number;
    x?: number;
    color?: string;
    groupSize?: number;
    spacing?: number;
    offsets?: number[];
    colors?: string[];
};

export type FormationDefinition = {
    id: string;
    label: string;
    difficulty: number;
    probability?: string;
    probabilityFn?: (wave: number, formation: FormationDefinition) => number;
    ships: FormationShipDescriptor[];
    duration?: number;
    minWave?: number;
    gap?: number;
};

export type FormationEvent = FormationShipDescriptor & {
    time: number;
    formationId: string;
};

export type FormationPlan = {
    wave: number;
    totalDifficulty: number;
    remainingDifficulty: number;
    totalEnemies: number;
    events: FormationEvent[];
    selections: FormationDefinition[];
};

export type FormationManagerConfig = {
    definitions?: string;
    defaults?: Partial<FormationDefaults>;
    formations?: FormationDefinition[];
    endlessDifficulty?: { startWave?: number; base?: number; growth?: number; max?: number };
    difficultyMultiplier?: number;
};

export type PlanWaveOptions = {
    totalDifficulty?: number;
    random?: () => number;
    iterationLimit?: number;
};

export type WaveScheduleEntry = { difficulty?: number };
