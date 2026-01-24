/**
 * Game-specific type definitions and interfaces
 */

export type AnimationState = 'idle' | 'walk' | 'punch' | 'kick' | 'hurt' | 'death';

/**
 * Enemy behavior state for attack position system
 * - attacking: Enemy is at attack position and actively attacking the player
 * - movingToAttack: Enemy is moving toward their assigned attack position
 * - waiting: Enemy is waiting for an attack position to become available
 */
export type EnemyState = 'attacking' | 'movingToAttack' | 'waiting';

export interface GameConfig {
    worldWidth: number;
    worldHeight: number;
}

export interface GameOverCallback {
    (finalScore: number): void;
}
