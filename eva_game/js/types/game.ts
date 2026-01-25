/**
 * Game-specific type definitions and interfaces
 */

export type AnimationState = 'idle' | 'walk' | 'punch' | 'kick' | 'hurt' | 'death';

/**
 * Enemy behavior state for attack position system
 * - movingToWaitingPoint: Enemy just spawned and is moving to visible waiting area
 * - waiting: Enemy is at waiting point, waiting for an attack position to become available
 * - movingToAttack: Enemy is moving toward their assigned attack position
 * - attacking: Enemy is at attack position and actively attacking the player
 */
export type EnemyState = 'movingToWaitingPoint' | 'waiting' | 'movingToAttack' | 'attacking';

export interface GameConfig {
    worldWidth: number;
    worldHeight: number;
}

export interface GameOverCallback {
    (finalScore: number): void;
}
