/**
 * Balance configuration for Eva game
 * Centralized location for all game balance parameters
 */

export interface BalanceConfig {
  player: {
    maxHealth: number;
    width: number;
    height: number;

    speed: number;
    attack: {
      duration: number;           // ms
      cooldown: number;           // ms
      armLength: number;          // pixels - horizontal range in facing direction
      verticalThreshold: number;  // pixels - vertical offset up/down where hits still land
      damage: number;             // damage dealt to enemies
      knockbackForce: number;     // force applied to enemies when hit
    };
    invulnerabilityDuration: number; // ms
  };

  enemy: {
    maxHealth: number;

    width: number;
    height: number;

    speed: number;
    attack: {
      armLength: number;          // pixels - horizontal range in facing direction
      verticalThreshold: number;  // pixels - vertical offset up/down where hits still land
      cooldown: number;           // ms
      damage: number;             // damage dealt to player
      punchDuration: number;      // ms
      deathAnimationDuration: number; // ms
    };
    separation: {
      distance: number;           // pixels
      strength: number;           // multiplier
    };
  };

  spawn: {
    initialEnemyCount: number;
    waveSize: number;
    spawnDelay: number;            // ms
    minDistanceFromPlayer: number;
    maxDistanceFromPlayer: number;
  };

  game: {
    canvasWidth: number;
    canvasHeight: number;
  };

  world: {
    width: number;
    height: number;
  };

  // Split-screen layout for beat 'em up style
  layout: {
    backgroundHeight: number;  // Height of top background/wall area
    roadHeight: number;        // Height of bottom playable road area
  };

  // Collision settings for beat 'em up depth
  collision: {
    feetColliderHeight: number;  // Height of feet collider (pixels from bottom)
  };
}

export const balanceConfig: BalanceConfig = {
  player: {
    maxHealth: 100,

    // Visual properties (from other branch)
    width: 40,
    height: 60,

    // master structure
    speed: 200,
    attack: {
      duration: 300,
      cooldown: 200,
      armLength: 60,          // horizontal range of punch (like arm length)
      verticalThreshold: 30,  // vertical offset tolerance
      damage: 25,
      knockbackForce: 100,
    },
    invulnerabilityDuration: 1000,
  },

  enemy: {
    maxHealth: 100,

    // Visual properties (from other branch)
    width: 35,
    height: 55,

    speed: 80,
    attack: {
      armLength: 50,          // horizontal range of punch (like arm length)
      verticalThreshold: 30,  // vertical offset tolerance
      cooldown: 1500,
      damage: 10,
      punchDuration: 300,
      deathAnimationDuration: 1000,
    },
    separation: {
      distance: 70,
      strength: 1.2,
    },
  },

  // Spawn settings (from other branch)
  spawn: {
    initialEnemyCount: 3,
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
  },

  // Collision settings for beat 'em up depth
  collision: {
    feetColliderHeight: 15,  // Only bottom 15px acts as ground collider
  },
};

/**
 * Preset configurations for different difficulty levels
 * (from other branch)
 */
export const difficultyPresets = {
  easy: {
    enemyHealth: 75,
    enemyDamage: 5,
    enemySpeed: 60,
  },
  normal: {
    enemyHealth: 100,
    enemyDamage: 10,
    enemySpeed: 80,
  },
  hard: {
    enemyHealth: 125,
    enemyDamage: 15,
    enemySpeed: 100,
  },
};
