/**
 * Balance configuration for Eva game
 * Centralized location for all game balance parameters
 */

export const balanceConfig = {
  player: {
    maxHealth: 1000,

    // Visual properties (from other branch)
    width: 40,
    height: 60,
    scale: 1.8,  // Visual scale of the stick figure (1.0 = default size)

    // master structure
    speed: 400,
    attack: {
      duration: 100,
      cooldown: 200,
      armLength: 60,          // horizontal range of punch (like arm length)
      verticalThreshold: 30,  // vertical offset tolerance
      damage: 25,
      knockbackForce: 100,
      hurtAnimationDuration: 400,
      deathAnimationDuration: 1000,
    },
  },

  enemy: {
    maxHealth: 100,

    // Visual properties (from other branch)
    width: 35,
    height: 55,
    scale: 1.8,  // Visual scale of the stick figure (1.0 = default size)

    speed: 160,
    attack: {
      armLength: 50,          // horizontal range of punch (like arm length)
      verticalThreshold: 30,  // vertical offset tolerance
      cooldown: 1500,
      damage: 10,
      punchDuration: 300,
      hurtAnimationDuration: 400,
      deathAnimationDuration: 1000,
    },
    separation: {
      distance: 70,
      strength: 1.2,
    },
  }, 

  // Spawn settings (from other branch)
  spawn: {
    initialEnemyCount: 1,
    waveSize: 2,
    spawnDelay: 3000,
    minDistanceFromPlayer: 200,
    maxDistanceFromPlayer: 400,
  },

  // Canvas size (from other branch)
  game: {
    canvasWidth: 800,
    canvasHeight: 600,
  },

  // Restored from our branch for more movement space
  world: {
    width: 1200,
    height: 800,
  },

  // Split-screen layout for beat 'em up style
  layout: {
    backgroundHeight: 320,
    roadHeight: 480,
    // Topmost Y coordinate on the road where player's feet collider can go
    // This is the road boundary for player movement (defaults to backgroundHeight)
    roadBoundaryTopY: 340,
  },

  // Collision settings for beat 'em up depth
  collision: {
    feetColliderHeight: 15,  // Only bottom 15px acts as ground collider
  },

  // Attack position settings
  attackPosition: {
    distanceFromPlayer: 45,  // Distance from player center to attack position (arm's length)
    positionReachedThreshold: 5,  // How close enemy needs to be to consider position reached
    indicatorRadius: 12,  // Radius of the position indicator circle
    indicatorColor: 'rgba(255, 100, 100, 0.6)',  // Color of the position indicator
    lineColor: 'rgba(255, 100, 100, 0.4)',  // Color of the line from enemy to position
    lineWidth: 2,  // Width of the indicator line
    attackPointThreshold: 8
  },

  // Waiting point settings - where enemies go after spawning to be visible
  waitingPoint: {
    distanceFromSpawn: 300,  // Distance to move left from spawn point to reach waiting area
    positionReachedThreshold: 75,  // How close enemy needs to be to consider waiting point reached
    verticalSpread: 40,  // Vertical spread for waiting points to avoid stacking
  },

  // Strafing settings - enemies move randomly around waiting point
  strafing: {
    radius: 100,  // Radius of circular area around waiting point where strafing enemies move
    positionReachedThreshold: 20,  // How close enemy needs to be to strafing target to pick a new point
    indicatorRadius: 8,  // Radius of the strafing target indicator circle
    indicatorColor: 'rgba(255, 200, 100, 0.6)',  // Color of the strafing position indicator (orange-ish)
    lineColor: 'rgba(255, 200, 100, 0.4)',  // Color of the line from enemy to strafing position
    lineWidth: 2,  // Width of the indicator line
    tauntChance: 0.3,  // Chance (0-1) to taunt when reaching a strafing point
    tauntDuration: 800,  // Duration of taunt animation in milliseconds
  },
};
