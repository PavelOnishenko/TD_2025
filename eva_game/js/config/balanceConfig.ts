/**
 * Balance Configuration for Eva Game
 * Centralized location for all game balance parameters
 */

export const balanceConfig = {
    // ============ PLAYER STATS ============
    player: {
        maxHealth: 100,
        attackDamage: 25,
        speed: 200,
        attackDuration: 300,       // ms
        attackCooldown: 200,       // ms
        attackRange: 50,           // pixels
        invulnerabilityDuration: 1000, // ms after taking damage

        // Visual properties
        width: 40,
        height: 60,
    },

    // ============ ENEMY STATS ============
    enemy: {
        // HP values for different difficulty levels
        // At 25 player damage per hit:
        // - 75 HP = 3 hits to kill
        // - 100 HP = 4 hits to kill (default)
        // - 125 HP = 5 hits to kill
        maxHealth: 100,

        // Movement and combat
        speed: 80,
        attackRange: 40,
        attackCooldown: 1500,      // ms
        attackDamage: 10,

        // Animation timings
        punchDuration: 300,        // ms
        deathAnimationDuration: 1000, // ms

        // AI behavior
        separationDistance: 70,    // Minimum distance between enemies
        separationStrength: 1.2,   // How strongly enemies push away from each other

        // Visual properties
        width: 35,
        height: 55,
    },

    // ============ SPAWN SETTINGS ============
    spawn: {
        // Initial spawn settings
        initialEnemyCount: 3,

        // Wave spawning
        waveSize: 2,
        spawnDelay: 3000,          // ms between spawns

        // Spawn boundaries
        minDistanceFromPlayer: 200,
        maxDistanceFromPlayer: 400,
    },

    // ============ GAME SETTINGS ============
    game: {
        // Canvas size
        canvasWidth: 800,
        canvasHeight: 600,

        // Camera bounds
        worldWidth: 1200,
        worldHeight: 800,
    }
};

/**
 * Preset configurations for different difficulty levels
 */
export const difficultyPresets = {
    easy: {
        enemyHealth: 75,      // 3 hits to kill
        enemyDamage: 5,
        enemySpeed: 60,
    },
    normal: {
        enemyHealth: 100,     // 4 hits to kill
        enemyDamage: 10,
        enemySpeed: 80,
    },
    hard: {
        enemyHealth: 125,     // 5 hits to kill
        enemyDamage: 15,
        enemySpeed: 100,
    }
};
