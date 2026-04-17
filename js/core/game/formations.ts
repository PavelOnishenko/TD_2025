import createFormationManagerJs, {
    createFormationManager as createFormationManagerUntyped,
    parseFormationText as parseFormationTextUntyped,
} from './formations.js';

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
    ships: FormationShipDescriptor[];
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

export type FormationManager = {
    defaults: { formationGap: number; minimumWeight: number };
    formations: FormationDefinition[];
    planWave: (wave: number, options?: { totalDifficulty?: number; random?: () => number; iterationLimit?: number }) => FormationPlan | null;
    hasFormations?: () => boolean;
};

export type FormationManagerConfig = {
    definitions?: string;
    defaults?: Partial<{ formationGap: number; minimumWeight: number }>;
    formations?: FormationDefinition[];
    endlessDifficulty?: { startWave?: number; base?: number; growth?: number; max?: number };
    difficultyMultiplier?: number;
};

export const parseFormationText = (definitions: string, defaults: FormationManagerConfig['defaults'] = {}) =>
    parseFormationTextUntyped(definitions, defaults) as FormationDefinition[];

export const createFormationManager = (
    config: FormationManagerConfig = {},
    waveSchedule: Array<{ difficulty?: number }> = []
) => createFormationManagerUntyped(config, waveSchedule) as FormationManager | null;

type FormationFactory = (config?: FormationManagerConfig, waveSchedule?: Array<{ difficulty?: number }>) => FormationManager | null;

export default createFormationManagerJs as FormationFactory;
