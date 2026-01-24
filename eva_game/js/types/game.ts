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

/**
 * Attack position - optimal positions for enemies to attack the player from
 * Only one enemy can occupy each position at a time
 */
export interface AttackPosition {
    x: number;
    y: number;
    side: 'left' | 'right';
    occupied: boolean;
    occupiedBy: number | null;  // Enemy ID that occupies this position
}
