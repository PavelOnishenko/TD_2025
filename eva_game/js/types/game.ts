/**
 * Game-specific type definitions and interfaces
 */

export type AnimationState =
    | 'idle'
    | 'walk'
    | 'punch'
    | 'kick'
    | 'jump'
    | 'fly'
    | 'land'
    | 'hurt'
    | 'death'
    | 'taunt';

/**
 * Enemy behavior state for attack position system
 * - movingToWaitingPoint: Enemy just spawned and is moving to visible waiting area
 * - strafing: Enemy is at waiting area, moving randomly around the attack point waiting for their turn
 * - taunting: Enemy is performing a taunt animation before continuing to strafe
 * - movingToAttack: Enemy is moving toward their assigned attack position
 * - attacking: Enemy is at attack position and actively attacking the player
 */
export type EnemyState = 'movingToWaitingPoint' | 'strafing' | 'taunting' | 'movingToAttack' | 'attacking';

export interface GameConfig {
    worldWidth: number;
    worldHeight: number;
}

export interface GameOverCallback {
    (finalScore: number): void;
}
