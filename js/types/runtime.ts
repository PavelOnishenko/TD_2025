import type { TowerColor, TowerLevel } from './game.js';

export type EnemyKind = 'swarm' | 'tank' | string;
export type UiLanguage = 'en' | 'ru' | string;

export interface Point {
    x: number;
    y: number;
}

export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface CellLike extends Point {
    row?: 'top' | 'bottom' | string;
    occupied?: boolean;
    tower?: TowerLike | null;
    highlight?: number;
    hover?: number;
    mergeHint?: number;
}

export interface TowerLike extends Point {
    id?: number;
    color: TowerColor | string;
    level: TowerLevel | number;
    damage?: number;
    range?: number;
    lastShot?: number;
    cell?: CellLike | null;
    mergeHint?: number;
    center?: () => Point;
    getFireInterval?: () => number;
    alignToCell?: (cell: CellLike) => void;
}

export interface EnemyLike extends Point {
    w: number;
    h: number;
    hp?: number;
    maxHp?: number;
    color?: TowerColor | string;
    spriteKey?: EnemyKind;
    takeDamage?: (damage: number) => boolean | void;
    isDead?: () => boolean;
    update?: (dt: number) => void;
    isOutOfBounds?: (limit: number) => boolean;
}

export interface ProjectileLike extends Point {
    vx: number;
    vy: number;
    color?: TowerColor | string;
    damage?: number;
    towerLevel?: TowerLevel | number;
    sourceTowerId?: number;
    type?: string;
    radius?: number;
    explosionRadius?: number;
    life?: number;
    elapsed?: number;
    anim?: { time?: number };
}

export interface ScoreManagerLike {
    getCurrentScore: () => number;
    getBestScore: () => number;
    setScore?: (score: number) => void;
    setBestScore?: (score: number) => void;
    addScore?: (delta: number) => number;
}

export interface TutorialLike {
    handleWaveStarted?: () => void;
    handleWaveCompleted?: (wave: number) => void;
    handleWavePreparation?: (wave: number) => void;
    handleEnergyGained?: (amount: number) => void;
    handleEnemyKilled?: (details: { match: boolean }) => void;
}

export interface GameRuntimeState {
    enemies: EnemyLike[];
    towers: TowerLike[];
    projectiles: ProjectileLike[];
    energy: number;
    wave: number;
    lives: number;
    waveInProgress?: boolean;
    worldBounds?: WorldBounds;
    scoreManager?: ScoreManagerLike;
    tutorial?: TutorialLike | null;
    language?: UiLanguage;
}

