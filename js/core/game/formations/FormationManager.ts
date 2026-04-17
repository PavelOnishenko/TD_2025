import FormationParser from './FormationParser.js';
import FormationPlanner from './FormationPlanner.js';
import {
    FormationDefaults,
    FormationDefinition,
    FormationManagerConfig,
    FormationPlan,
    PlanWaveOptions,
    WaveScheduleEntry,
} from './FormationTypes.js';
import WaveDifficultyResolver from './WaveDifficultyResolver.js';

const DEFAULTS: FormationDefaults = { formationGap: 0.75, minimumWeight: 0 };

export default class FormationManager {
    public readonly defaults: FormationDefaults;
    public readonly formations: FormationDefinition[];

    private readonly config: FormationManagerConfig;
    private readonly waveSchedule: WaveScheduleEntry[];
    private readonly planner: FormationPlanner;
    private readonly difficultyResolver: WaveDifficultyResolver;

    constructor(config: FormationManagerConfig = {}, waveSchedule: WaveScheduleEntry[] = []) {
        this.config = config;
        this.waveSchedule = waveSchedule;
        this.defaults = { ...DEFAULTS, ...(config.defaults ?? {}) };
        const parser = new FormationParser();
        const parsedFormations = parser.parseFormationText(config.definitions ?? '', this.defaults);
        this.formations = Array.isArray(config.formations) && config.formations.length
            ? parser.normalizeFormations(config.formations, this.defaults)
            : parsedFormations;
        this.planner = new FormationPlanner();
        this.difficultyResolver = new WaveDifficultyResolver();
    }

    public static create(config: FormationManagerConfig = {}, waveSchedule: WaveScheduleEntry[] = []): FormationManager | null {
        const manager = new FormationManager(config, waveSchedule);
        return manager.hasFormations() ? manager : null;
    }

    public hasFormations = (): boolean => this.formations.length > 0;

    public planWave(wave: number, options: PlanWaveOptions = {}): FormationPlan | null {
        const totalDifficulty = Number.isFinite(options.totalDifficulty)
            ? (options.totalDifficulty as number)
            : this.difficultyResolver.resolveWaveDifficulty(this.config, this.waveSchedule, wave);
        return this.planner.planWave(wave, this.formations, this.defaults, totalDifficulty, options);
    }

}
