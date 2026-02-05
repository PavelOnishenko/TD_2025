/**
 * Player Tests
 * Tests for player initialization, movement, input handling, and attack mechanics
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Player from '../dist/entities/Player.js';
import { balanceConfig } from '../dist/config/balanceConfig.js';
import {
    createMockInputManager,
    advanceTime,
    advanceTimeInSteps,
} from './helpers.js';

// ============================================================================
// PLAYER INITIALIZATION
// ============================================================================

test('player initializes with correct default values', () => {
    const player = new Player(100, 400);

    assert.equal(player.x, 100);
    assert.equal(player.y, 400);
    assert.equal(player.health, balanceConfig.player.maxHealth);
    assert.equal(player.maxHealth, balanceConfig.player.maxHealth);
    assert.equal(player.width, balanceConfig.player.width);
    assert.equal(player.height, balanceConfig.player.height);
    assert.equal(player.facingRight, true);
    assert.equal(player.animationState, 'idle');
    assert.equal(player.isAttacking, false);
});

test('player starts with configured punch damage', () => {
    const player = new Player(100, 400);

    assert.equal(player.attackDamage, balanceConfig.player.punch.damage);
});

test('player starts with zero velocity', () => {
    const player = new Player(100, 400);

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, 0);
});

// ============================================================================
// MOVEMENT INPUT
// ============================================================================

test('player moves right when horizontal input is positive', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input); // Right input

    assert.equal(player.velocityX, balanceConfig.player.speed);
    assert.equal(player.velocityY, 0);
});

test('player moves left when horizontal input is negative', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(-1, 0, input); // Left input

    assert.equal(player.velocityX, -balanceConfig.player.speed);
    assert.equal(player.velocityY, 0);
});

test('player moves down when vertical input is positive', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(0, 1, input); // Down input

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, balanceConfig.player.speed);
});

test('player moves up when vertical input is negative', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(0, -1, input); // Up input

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, -balanceConfig.player.speed);
});

test('player moves diagonally with combined input', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 1, input); // Down-right input

    assert.equal(player.velocityX, balanceConfig.player.speed);
    assert.equal(player.velocityY, balanceConfig.player.speed);
});

test('player stops when no input', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // First move
    player.handleInput(1, 0, input);
    assert.equal(player.velocityX, balanceConfig.player.speed);

    // Then stop
    player.handleInput(0, 0, input);
    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, 0);
});

test('player position updates based on velocity', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);
    player.update(0.5); // 500ms

    const expectedX = 100 + balanceConfig.player.speed * 0.5;
    assert.equal(player.x, expectedX);
});

// ============================================================================
// FACING DIRECTION
// ============================================================================

test('player faces right when moving right', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);

    assert.equal(player.facingRight, true);
});

test('player faces left when moving left', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(-1, 0, input);

    assert.equal(player.facingRight, false);
});

test('player maintains facing direction when only moving vertically', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // First face left
    player.handleInput(-1, 0, input);
    assert.equal(player.facingRight, false);

    // Then move only vertically - should maintain facing
    player.handleInput(0, 1, input);
    assert.equal(player.facingRight, false);
});

test('player maintains facing direction when stopped', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // Face left
    player.handleInput(-1, 0, input);
    assert.equal(player.facingRight, false);

    // Stop
    player.handleInput(0, 0, input);
    assert.equal(player.facingRight, false);
});

// ============================================================================
// ATTACK INPUT
// ============================================================================

test('player starts punch when punch action is pressed', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    assert.equal(player.isAttacking, true);
    assert.equal(player.animationState, 'punch');
});

test('player cannot move while attacking', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // First, initiate the attack (with no movement)
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    assert.equal(player.isAttacking, true);

    // Now try to move while attacking - should be blocked
    player.handleInput(1, 1, input);

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, 0);
});

test('punch duration lasts correct time', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    assert.equal(player.isAttacking, true);

    // Advance time past attack duration (100ms)
    advanceTime(player, 150);

    assert.equal(player.isAttacking, false);
});

test('punch has cooldown preventing rapid attacks', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // First attack
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Wait for attack to end but not cooldown
    advanceTime(player, 150);
    assert.equal(player.isAttacking, false);

    // Try to attack again - should fail due to cooldown
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    assert.equal(player.isAttacking, false);
});

test('player can punch again after cooldown expires', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // First attack
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Wait for full cooldown (200ms total)
    advanceTime(player, 250);

    // Should be able to attack again
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    assert.equal(player.isAttacking, true);
});

test('player can move again after punch ends', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Wait for attack to end
    advanceTime(player, 150);

    // Should be able to move
    player.handleInput(1, 0, input);

    assert.equal(player.velocityX, balanceConfig.player.speed);
});

// ============================================================================
// DAMAGE AND HEALTH
// ============================================================================

test('player takes damage', () => {
    const player = new Player(100, 400);
    const initialHealth = player.health;

    player.takeDamage(50);

    assert.equal(player.health, initialHealth - 50);
});

test('player health does not go below zero', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth + 100);

    assert.equal(player.health, 0);
});

test('player enters hurt state when damaged', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);

    assert.equal(player.animationState, 'hurt');
});

test('player hurt animation has correct duration', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);

    // Advance past hurt animation (400ms)
    advanceTime(player, 450);

    assert.equal(player.animationState, 'idle');
});

test('player enters death state when health reaches zero', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth);

    assert.equal(player.animationState, 'death');
    assert.equal(player.health, 0);
});

test('player stops moving on death', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 1, input); // Moving

    player.takeDamage(player.maxHealth);

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, 0);
});

// ============================================================================
// ANIMATION STATES
// ============================================================================

test('idle animation when stationary', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(0, 0, input);

    assert.equal(player.animationState, 'idle');
});

test('walk animation when moving', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);

    assert.equal(player.animationState, 'walk');
});

test('punch animation takes priority over walk', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(1, 0, input);

    assert.equal(player.animationState, 'punch');
});

test('hurt animation takes priority over punch', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    player.takeDamage(10);

    assert.equal(player.animationState, 'hurt');
});

test('death animation takes priority over all', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(1, 1, input);

    player.takeDamage(player.maxHealth);

    assert.equal(player.animationState, 'death');
});

test('animation state returns to idle after hurt animation completes', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);
    assert.equal(player.animationState, 'hurt');

    advanceTime(player, 450);
    assert.equal(player.animationState, 'idle');
});

test('animation state returns to idle after punch animation completes', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    assert.equal(player.animationState, 'punch');

    advanceTime(player, 150);
    assert.equal(player.animationState, 'idle');
});

// ============================================================================
// ANIMATION PROGRESS
// ============================================================================

test('animation progress increases during punch', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    const initialProgress = player.animationProgress;

    advanceTime(player, 50);

    assert.ok(player.animationProgress > initialProgress);
});

test('animation progress cycles during walk', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);

    const progressValues = [];
    for (let i = 0; i < 10; i++) {
        player.update(0.05);
        progressValues.push(player.animationProgress);
    }

    // Progress should change over time
    const allSame = progressValues.every(p => p === progressValues[0]);
    assert.ok(!allSame, 'walk animation progress should cycle');

    // Progress should stay within 0-1
    assert.ok(progressValues.every(p => p >= 0 && p <= 1));
});

test('animation progress resets on idle', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // Walk to build up progress
    player.handleInput(1, 0, input);
    advanceTime(player, 100);

    // Stop
    player.handleInput(0, 0, input);
    player.update(0.016);

    assert.equal(player.animationProgress, 0);
});

// ============================================================================
// JUMPING
// ============================================================================

test('player enters jump state when jump action is pressed', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('jump');
    player.handleInput(0, 0, input);

    assert.equal(player.isInAir, true);
    assert.equal(player.animationState, 'jump');
});

test('player follows a fixed forward jump trajectory', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();
    const startX = player.x;
    const startY = player.y;

    input.simulatePress('jump');
    player.handleInput(1, 0, input);

    advanceTimeInSteps(player, balanceConfig.player.jump.duration);

    assert.equal(player.isInAir, false);
    assert.ok(Math.abs(player.x - (startX + balanceConfig.player.jump.distance)) < 0.5);
    assert.equal(player.y, startY);
});

test('player ignores movement input while airborne', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('jump');
    player.handleInput(0, 0, input);

    player.handleInput(1, 1, input);

    assert.equal(player.velocityX, 0);
    assert.equal(player.velocityY, 0);
});
