import type { TowerColor } from './game.js';

export interface NumericRange {
    min: number;
    max: number;
}

export interface LogicalSize {
    width: number;
    height: number;
}

export interface WorldConfig {
    logicalSize: LogicalSize;
    screenShake?: { frequency: number };
    base?: Record<string, unknown>;
    portal?: Record<string, unknown>;
    platforms?: unknown[];
    grid?: Record<string, unknown>;
}

export interface PlayerConfig {
    initialEnergy?: number;
    initialLives?: number;
    energyPerKill: number;
    energyPerWave: number;
    tankKillEnergyMultiplier?: number;
    killEnergyScaling?: Record<string, unknown>;
}

export interface EnemyGroupConfig {
    hpMultiplier: number;
    speed?: { x: number; y: number };
    groupSize?: number;
    spacing?: number;
}

export interface EnemiesConfig {
    dimensions: { width: number; height: number };
    defaultSpawn: { x: number; y: number };
    speedMultiplier?: number;
    swarm: EnemyGroupConfig;
    tank: EnemyGroupConfig;
}

export interface ProjectileConfigShape {
    colorMismatchMultiplier: number;
    rockets?: { explosionRadius?: Partial<NumericRange> };
    [key: string]: unknown;
}

export interface FormationConfig {
    definitions?: string;
    formations?: unknown[];
    defaults?: Record<string, unknown>;
    difficultyMultiplier?: number;
    endlessDifficulty?: Record<string, unknown>;
}

export interface TowerLevelConfig {
    damage: number;
    fireRate?: number;
    range: number;
    cost?: number;
}

export interface TowerConfigShape {
    levels?: TowerLevelConfig[];
    colors?: TowerColor[];
    [key: string]: unknown;
}

export interface NeonVoidConfig {
    world: WorldConfig;
    player: PlayerConfig;
    enemies: EnemiesConfig;
    projectiles: ProjectileConfigShape;
    towers: Record<string, TowerConfigShape>;
    waves: { schedule: Array<Record<string, unknown>> };
    formations?: FormationConfig;
    scoring?: Record<string, number>;
    ui?: Record<string, unknown>;
    tutorial?: Record<string, unknown>;
    audio?: Record<string, unknown>;
    effects?: Record<string, unknown>;
    [key: string]: unknown;
}

