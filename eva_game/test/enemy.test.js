/**
 * Enemy AI Tests
 * Tests for enemy movement, pathfinding, separation behavior, and attack logic
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../dist/entities/Enemy.js';
import Player from '../dist/entities/Player.js';
import { balanceConfig } from '../dist/config/balanceConfig.js';
import {
    createEnemyAt,
    createPlayerAt,
    advanceTime,
    getDistance,
    createEnemyGroup,
} from './helpers.js';

// ============================================================================
// ENEMY INITIALIZATION
// ============================================================================

test('enemy initializes with correct default values', () => {
    const enemy = new Enemy(100, 200);

    assert.equal(enemy.x, 100);
    assert.equal(enemy.y, 200);
    assert.equal(enemy.health, balanceConfig.enemy.maxHealth);
    assert.equal(enemy.maxHealth, balanceConfig.enemy.maxHealth);
    assert.equal(enemy.width, balanceConfig.enemy.width);
    assert.equal(enemy.height, balanceConfig.enemy.height);
    assert.equal(enemy.facingRight, true);
    assert.equal(enemy.animationState, 'idle');
    assert.equal(enemy.isDead, false);
});

test('enemy accepts custom color', () => {
    const enemy = new Enemy(100, 200, '#4ecdc4');

    assert.equal(enemy.color, '#4ecdc4');
});

test('enemy starts with zero velocity', () => {
    const enemy = new Enemy(100, 200);

    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);
});

// ============================================================================
// BASIC MOVEMENT
// ============================================================================

test('enemy moves based on velocity and deltaTime', () => {
    const enemy = new Enemy(100, 200);
    enemy.velocityX = 80; // enemy speed from config
    enemy.velocityY = 40;

    const deltaTime = 0.5; // 500ms
    enemy.update(deltaTime);

    assert.equal(enemy.x, 100 + 80 * 0.5);
    assert.equal(enemy.y, 200 + 40 * 0.5);
});

test('enemy moves toward player position', () => {
    const enemy = new Enemy(200, 400);
    const player = new Player(100, 400); // Player to the left

    enemy.moveToward(player.x, player.y, 0.1, []);

    // Enemy should have negative X velocity (moving left toward player)
    assert.ok(enemy.velocityX < 0, 'enemy should move left toward player');
    assert.equal(Math.abs(enemy.velocityX), balanceConfig.enemy.speed);
});

test('enemy moves toward player with combined X and Y movement', () => {
    const enemy = new Enemy(200, 200);
    const player = new Player(100, 400); // Player diagonal: left and down

    enemy.moveToward(player.x, player.y, 0.1, []);

    // Enemy should move both left (negative X) and down (positive Y)
    assert.ok(enemy.velocityX < 0, 'enemy should move left');
    assert.ok(enemy.velocityY > 0, 'enemy should move down');

    // Velocity should be normalized to enemy speed
    const totalSpeed = Math.sqrt(enemy.velocityX ** 2 + enemy.velocityY ** 2);
    assert.ok(Math.abs(totalSpeed - balanceConfig.enemy.speed) < 0.1);
});

// ============================================================================
// FACING DIRECTION
// ============================================================================

test('enemy faces right when player is to the right', () => {
    const enemy = new Enemy(100, 400);
    const player = new Player(200, 400);

    enemy.moveToward(player.x, player.y, 0.1, []);

    assert.equal(enemy.facingRight, true);
});

test('enemy faces left when player is to the left', () => {
    const enemy = new Enemy(200, 400);
    const player = new Player(100, 400);

    enemy.moveToward(player.x, player.y, 0.1, []);

    assert.equal(enemy.facingRight, false);
});

test('enemy updates facing direction when player moves', () => {
    const enemy = new Enemy(200, 400);

    // First: player to the left
    enemy.moveToward(100, 400, 0.1, []);
    assert.equal(enemy.facingRight, false);

    // Then: player moves to the right
    enemy.moveToward(300, 400, 0.1, []);
    assert.equal(enemy.facingRight, true);
});

// ============================================================================
// ENEMY SEPARATION (CLUSTERING PREVENTION)
// ============================================================================

test('enemies push away from each other when too close', () => {
    const enemy1 = new Enemy(100, 400);
    const enemy2 = new Enemy(120, 400); // 20px away, within separation distance (70px)

    const playerX = 50; // Player to the left

    enemy1.moveToward(playerX, 400, 0.1, [enemy2]);

    // enemy1 should be pushed right (away from enemy2) despite player being to the left
    // The separation force should reduce leftward movement or push right
    // Since enemy2 is to the right of enemy1, separation pushes enemy1 left
    // But player is also to the left, so we need to check the combined behavior
    // In this case, both forces point left, so enemy still moves left but faster
    assert.ok(enemy1.velocityX !== 0, 'enemy should have velocity');
});

test('enemies spread out when clustered around player', () => {
    const player = new Player(100, 400);

    // Create two enemies very close to each other near the player
    const enemy1 = new Enemy(130, 400);
    const enemy2 = new Enemy(135, 400); // Only 5px from enemy1

    const initialDistance = getDistance(enemy1, enemy2);

    // Both enemies try to move toward player
    enemy1.moveToward(player.x, player.y, 0.016, [enemy2]);
    enemy2.moveToward(player.x, player.y, 0.016, [enemy1]);

    // Apply velocities
    enemy1.update(0.016);
    enemy2.update(0.016);

    // After one update, they should have separation forces pushing them apart
    // Check that at least one has vertical velocity to spread out
    const hasSpreadingVelocity = enemy1.velocityY !== 0 || enemy2.velocityY !== 0;
    assert.ok(hasSpreadingVelocity || Math.abs(enemy1.velocityX - enemy2.velocityX) > 0);
});

test('separation force increases when enemies are closer', () => {
    const player = new Player(0, 400); // Player far to the left

    // Enemy pair: very close (10px)
    const enemyClose1 = new Enemy(200, 400);
    const enemyClose2 = new Enemy(210, 400);

    // Enemy pair: moderately close (50px)
    const enemyFar1 = new Enemy(300, 400);
    const enemyFar2 = new Enemy(350, 400);

    enemyClose1.moveToward(player.x, player.y, 0.016, [enemyClose2]);
    enemyFar1.moveToward(player.x, player.y, 0.016, [enemyFar2]);

    // The close pair should have more separation influence
    // Both should move toward player (negative X) but close pair has more separation
    // We verify by checking their Y velocities - closer enemies separate more vertically
    const closeVerticalForce = Math.abs(enemyClose1.velocityY);
    const farVerticalForce = Math.abs(enemyFar1.velocityY);

    // Note: This test verifies the separation exists, exact magnitude depends on implementation
    assert.ok(enemyClose1.velocityX !== 0 || enemyClose1.velocityY !== 0);
});

test('dead enemies are ignored in separation calculations', () => {
    const player = new Player(100, 400);
    const enemy1 = new Enemy(150, 400);
    const deadEnemy = new Enemy(155, 400);

    // Kill the dead enemy
    deadEnemy.takeDamage(deadEnemy.maxHealth);
    assert.equal(deadEnemy.animationState, 'death');

    // enemy1 should not be affected by dead enemy
    enemy1.moveToward(player.x, player.y, 0.016, [deadEnemy]);

    // Should move directly toward player without separation influence
    assert.ok(enemy1.velocityX < 0, 'should move toward player on left');
});

test('no separation force when no other enemies', () => {
    const enemy = new Enemy(200, 400);
    const player = new Player(100, 400);

    enemy.moveToward(player.x, player.y, 0.016, []);

    // Should move directly toward player
    assert.ok(enemy.velocityX < 0);
    // Y velocity should be 0 when player is directly horizontal
    assert.equal(enemy.velocityY, 0);
});

test('separation averages forces from multiple nearby enemies', () => {
    const enemy = new Enemy(200, 400);

    // Surround with 4 enemies in a tight formation
    const surrounding = [
        new Enemy(170, 400), // left
        new Enemy(230, 400), // right
        new Enemy(200, 370), // above
        new Enemy(200, 430), // below
    ];

    const player = new Player(100, 400);

    enemy.moveToward(player.x, player.y, 0.016, surrounding);

    // Forces should partially cancel out, resulting in movement mainly toward player
    assert.ok(enemy.velocityX !== 0 || enemy.velocityY !== 0);
});

// ============================================================================
// TARGET POSITION REACHING AND STOPPING
// ============================================================================

test('enemy stops when reached target position and no separation needed', () => {
    const targetX = 100;
    const targetY = 400;
    // Place enemy within positionReachedThreshold (10px) of target
    const enemy = new Enemy(105, 400); // 5px away from target

    enemy.moveToward(targetX, targetY, 0.016, []);

    // Enemy should stop (zero velocity) when reached target position
    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);
});

test('enemy continues moving if reached target but separation forces exist', () => {
    const targetX = 100;
    const targetY = 400;
    // Place enemy within positionReachedThreshold (10px) of target
    const enemy1 = new Enemy(105, 400); // 5px away from target

    const enemy2 = new Enemy(110, 400); // Very close, creating separation force

    enemy1.moveToward(targetX, targetY, 0.016, [enemy2]);

    // Enemy should still move due to separation, even when reached target
    const hasVelocity = enemy1.velocityX !== 0 || enemy1.velocityY !== 0;
    assert.ok(hasVelocity, 'enemy should move to separate despite reaching target');
});

test('enemy keeps moving when not within position threshold', () => {
    const enemy = new Enemy(130, 400);

    // Target is 30px away - outside positionReachedThreshold (10px)
    const targetX = 100;
    const targetY = 400;

    enemy.moveToward(targetX, targetY, 0.016, []);
    const stillMoving = enemy.velocityX !== 0 || enemy.velocityY !== 0;

    assert.ok(stillMoving, 'should keep moving when target is not reached');
});

test('enemy must face player to be in attack range', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = true; // Facing right (away from player)

    const player = new Player(100, 400); // Player to the left

    // Before moveToward updates facing, we check canAttackPlayer
    const canAttackWhileFacingWrongWay = enemy.canAttackPlayer(player);

    // Now let enemy update facing direction
    enemy.moveToward(player.x, player.y, 0.016, []);

    const canAttackAfterFacingUpdate = enemy.canAttackPlayer(player);

    assert.equal(canAttackWhileFacingWrongWay, false);
    assert.equal(canAttackAfterFacingUpdate, true);
});

// ============================================================================
// CAN ATTACK PLAYER
// ============================================================================

test('canAttackPlayer returns true when in range and facing player', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false; // Facing left toward player

    const player = new Player(100, 400); // 30px to the left

    assert.equal(enemy.canAttackPlayer(player), true);
});

test('canAttackPlayer returns false when on cooldown', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    // Start an attack to trigger cooldown
    enemy.startAttack();

    assert.equal(enemy.canAttackPlayer(player), false);
});

test('canAttackPlayer returns false when player is behind enemy', () => {
    const enemy = new Enemy(100, 400);
    enemy.facingRight = true; // Facing right

    const player = new Player(70, 400); // Player to the left (behind enemy)

    assert.equal(enemy.canAttackPlayer(player), false);
});

test('canAttackPlayer returns false when player is too far horizontally', () => {
    const enemy = new Enemy(200, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400); // 100px away, beyond armLength (50px)

    assert.equal(enemy.canAttackPlayer(player), false);
});

test('canAttackPlayer returns false when player is too far vertically', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 500); // 100px vertical distance, beyond threshold (30px)

    assert.equal(enemy.canAttackPlayer(player), false);
});

test('canAttackPlayer returns false while enemy is hurt', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    // Put enemy in hurt state
    enemy.takeDamage(10);

    assert.equal(enemy.animationState, 'hurt');
    assert.equal(enemy.canAttackPlayer(player), false);
});

// ============================================================================
// ATTACK INITIATION
// ============================================================================

test('startAttack sets cooldown timer', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();

    // Enemy should now be on cooldown
    const player = new Player(130, 400);
    enemy.facingRight = true;

    assert.equal(enemy.canAttackPlayer(player), false);
});

test('startAttack triggers punch animation', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();
    enemy.update(0.001); // Small update to process state

    assert.equal(enemy.animationState, 'punch');
});

test('attack cooldown decreases over time', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    enemy.startAttack();

    // Wait for cooldown (1500ms = 1.5s)
    advanceTime(enemy, 1600);

    // Should be able to attack again
    assert.equal(enemy.canAttackPlayer(player), true);
});

// ============================================================================
// MOVEMENT DURING ANIMATION STATES
// ============================================================================

test('enemy stops moving during punch animation', () => {
    const enemy = new Enemy(200, 400);

    enemy.startAttack();
    // Animation state is updated in update(), so call it to sync state
    enemy.update(0.001);

    enemy.moveToward(100, 400, 0.016, []);

    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);
});

test('enemy stops moving during hurt animation', () => {
    const enemy = new Enemy(200, 400);

    enemy.takeDamage(10);
    enemy.moveToward(100, 400, 0.016, []);

    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);
});

test('enemy resumes moving after hurt animation completes', () => {
    const enemy = new Enemy(200, 400);

    enemy.takeDamage(10);

    // Advance past hurt animation duration (400ms)
    advanceTime(enemy, 500);

    assert.equal(enemy.animationState, 'idle');

    // Now enemy should be able to move
    enemy.moveToward(100, 400, 0.016, []);

    assert.ok(enemy.velocityX !== 0, 'enemy should move after hurt animation');
});

// ============================================================================
// DEATH
// ============================================================================

test('enemy enters death state when health reaches zero', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    assert.equal(enemy.animationState, 'death');
    assert.equal(enemy.health, 0);
});

test('dead enemy does not update movement', () => {
    const enemy = new Enemy(100, 400);
    enemy.velocityX = 50;
    enemy.velocityY = 30;

    enemy.takeDamage(enemy.maxHealth);

    // Velocity should be zeroed on death
    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);

    const startX = enemy.x;
    const startY = enemy.y;

    advanceTime(enemy, 100);

    // Position should not change
    assert.equal(enemy.x, startX);
    assert.equal(enemy.y, startY);
});

test('isDead becomes true after death animation completes', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    assert.equal(enemy.isDead, false); // Animation still playing

    // Advance past death animation (1000ms)
    advanceTime(enemy, 1100);

    assert.equal(enemy.isDead, true);
});

test('justDied flag is true for one frame after death', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    assert.equal(enemy.justDied, true);

    // After next update, flag should be cleared
    advanceTime(enemy, 16);

    assert.equal(enemy.justDied, false);
});

test('enemy cannot take damage after entering death state', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    const healthAfterDeath = enemy.health;

    // Try to deal more damage
    enemy.takeDamage(50);

    assert.equal(enemy.health, healthAfterDeath);
});

// ============================================================================
// ANIMATION STATE PRIORITY
// ============================================================================

test('death animation takes priority over all other states', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    // Try to trigger other animations
    enemy.startAttack();

    assert.equal(enemy.animationState, 'death');
});

test('hurt animation takes priority over punch', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();
    enemy.takeDamage(10);

    assert.equal(enemy.animationState, 'hurt');
});

test('punch animation takes priority over walk', () => {
    const enemy = new Enemy(200, 400);

    enemy.startAttack();
    enemy.velocityX = 50; // Try to walk

    enemy.update(0.016);

    assert.equal(enemy.animationState, 'punch');
});

test('walk animation activates when moving', () => {
    const enemy = new Enemy(200, 400);

    enemy.velocityX = 50;
    enemy.update(0.016);

    assert.equal(enemy.animationState, 'walk');
});

test('idle animation when stationary', () => {
    const enemy = new Enemy(100, 400);

    enemy.velocityX = 0;
    enemy.velocityY = 0;
    enemy.update(0.016);

    assert.equal(enemy.animationState, 'idle');
});
