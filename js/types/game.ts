// Core game types for Neon Void

// Tower Types
export type TowerType = 'basic' | 'rapid' | 'heavy' | 'splash';
export type TowerColor = 'red' | 'blue' | 'green';
export type TowerLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Enemy Types
export type EnemyType = 'tank' | 'fast' | 'boss';

// Game State
export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

// Position and Bounds
export interface Position {
    x: number;
    y: number;
}

export interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

// Grid Cell
export interface GridCell {
    x: number;
    y: number;
    row: 'top' | 'bottom';
    occupied: boolean;
}

// Tower Configuration
export interface TowerConfig {
    type: TowerType;
    level: TowerLevel;
    color: TowerColor;
    damage: number;
    fireRate: number;
    range: number;
    cost: number;
}

// Enemy Configuration
export interface EnemyConfig {
    type: EnemyType;
    health: number;
    speed: number;
    energyReward: number;
    scoreValue: number;
}

// Projectile Configuration
export interface ProjectileConfig {
    speed: number;
    damage: number;
    color: string;
    size: number;
}
