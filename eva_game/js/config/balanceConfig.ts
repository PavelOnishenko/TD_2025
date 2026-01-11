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
      range: number;              // pixels
      hitArea: {
        radius: number;           // pixels
        offsetX: number;          // pixels
        offsetY: number;          // pixels
      };
      damage: number;             // damage dealt to enemies
      knockbackForce: number;     // force applied to enemies when hit
    };
    invulnerabilityDuration: number; // ms
  };

  enemy: {
    // Keep both to avoid breaking either branch usage:
    // - master used `health`
    // - other branch introduced `maxHealth`
    health: number;
    maxHealth: number;

    width: number;
    height: number;

    speed: number;
    attack: {
      range: number;              // pixels
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

  // IMPORTANT: keep from master (requested)
  world: {
    width: number;
    height: number;
  };

  // Split-screen layout for beat 'em up style
  layout: {
    backgroundHeight: number;  // Height of top background/wall area
    roadHeight: number;        // Height of bottom playable road area
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
      range: 50,  // Restored from our branch (was 20, too short)
      hitArea: {
        radius: 10,
        offsetX: 0,
        offsetY: 0,
      },
      // 25 matches the "4 hits @ 100 HP" balance (100/25 = 4)
      damage: 25,
      knockbackForce: 100,
    },
    invulnerabilityDuration: 1000,
  },

  enemy: {
    // Keep both names in sync
    health: 100,
    maxHealth: 100,

    // Visual properties (from other branch)
    width: 35,
    height: 55,

    speed: 80,
    attack: {
      range: 40,  // Restored from our branch (was 20, too short)
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
    backgroundHeight: 320,  // Top 40% - non-playable background/wall
    roadHeight: 480,        // Bottom 60% - playable road area
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
