/**
 * Balance configuration for Eva game
 * This file contains all gameplay balance parameters that affect difficulty and feel
 */

export interface BalanceConfig {
    player: {
        speed: number;
        attack: {
            duration: number;           // ms - how long the attack animation lasts
            cooldown: number;           // ms - time between attacks
            range: number;              // pixels - distance from player center to attack hit area center
            hitArea: {
                radius: number;         // pixels - radius of circular hit detection area
                offsetX: number;        // pixels - additional X offset from attack range (for fine-tuning)
                offsetY: number;        // pixels - Y offset from player center
            };
            damage: number;             // damage dealt to enemies
            knockbackForce: number;     // force applied to enemies when hit
        };
        invulnerabilityDuration: number; // ms - how long player is invulnerable after being hit
    };
    enemy: {
        speed: number;
        health: number;
        attack: {
            range: number;              // pixels - distance at which enemy can attack player
            cooldown: number;           // ms - time between enemy attacks
            damage: number;             // damage dealt to player
            punchDuration: number;      // ms - animation duration
        };
        separation: {
            distance: number;           // pixels - minimum distance enemies try to maintain from each other
            strength: number;           // multiplier for separation force
        };
    };
    world: {
        width: number;
        height: number;
    };
}

export const balanceConfig: BalanceConfig = {
    player: {
        speed: 200,
        attack: {
            duration: 300,              // ms attack animation
            cooldown: 200,              // ms between attacks
            range: 20,                  // pixels from player center
            hitArea: {
                radius: 10,             // pixel radius for hit detection
                offsetX: 0,             // additional X offset
                offsetY: 0,             // centered on player Y position
            },
            damage: 20,                 // damage per hit
            knockbackForce: 100,        // knockback force
        },
        invulnerabilityDuration: 1000,  // ms of invulnerability after hit
    },
    enemy: {
        speed: 80,
        health: 100,
        attack: {
            range: 20,                  // pixels attack range
            cooldown: 1500,             // seconds between attacks
            damage: 10,                 // damage per hit
            punchDuration: 300,         // ms punch animation
        },
        separation: {
            distance: 70,               // pixels minimum separation
            strength: 1.2,              // separation force multiplier
        },
    },
    world: {
        width: 800,
        height: 600,
    },
};
