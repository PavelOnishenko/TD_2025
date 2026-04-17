import FormationManagerRuntime from './formations/FormationManager.js';
import FormationParser from './formations/FormationParser.js';
import {
    FormationDefinition,
    FormationManagerConfig,
    FormationPlan,
    FormationShipDescriptor,
    FormationEvent,
    WaveScheduleEntry,
} from './formations/FormationTypes.js';

const DEFAULTS = { formationGap: 0.75, minimumWeight: 0 };

export type {
    FormationDefinition,
    FormationEvent,
    FormationManagerConfig,
    FormationPlan,
    FormationShipDescriptor,
};

export type FormationManager = {
    defaults: { formationGap: number; minimumWeight: number };
    formations: FormationDefinition[];
    planWave: (wave: number, options?: { totalDifficulty?: number; random?: () => number; iterationLimit?: number }) => FormationPlan | null;
    hasFormations: () => boolean;
};

export const parseFormationText = (definitions: string, defaults: FormationManagerConfig['defaults'] = {}): FormationDefinition[] => {
    const parser = new FormationParser();
    return parser.parseFormationText(definitions, { ...DEFAULTS, ...(defaults ?? {}) });
};

export const createFormationManager = (
    config: FormationManagerConfig = {},
    waveSchedule: WaveScheduleEntry[] = [],
): FormationManager | null => FormationManagerRuntime.create(config, waveSchedule);

type FormationFactory = (config?: FormationManagerConfig, waveSchedule?: WaveScheduleEntry[]) => FormationManager | null;

export default createFormationManager as FormationFactory;
