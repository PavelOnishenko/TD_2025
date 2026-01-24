/**
 * Game-specific type definitions and interfaces
 */

export type AnimationState = 'idle' | 'walk' | 'punch' | 'kick' | 'hurt' | 'death';

export interface GameConfig {
    worldWidth: number;
    worldHeight: number;
}

export interface GameOverCallback {
    (finalScore: number): void;
}
