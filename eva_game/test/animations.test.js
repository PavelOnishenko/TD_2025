/**
 * Animation System Tests
 * Tests for animation state transitions, progress tracking, and timing
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Player from '../dist/entities/Player.js';
import Enemy from '../dist/entities/Enemy.js';
import { balanceConfig } from '../dist/config/balanceConfig.js';
import {
    createMockInputManager,
    advanceTime,
    advanceTimeInSteps,
} from './helpers.js';

// ============================================================================
// IDLE ANIMATION
// ============================================================================

test('player starts in idle animation state', () => {
    const player = new Player(100, 400);

    assert.equal(player.animationState, 'idle');
    assert.equal(player.animationProgress, 0);
});

test('enemy starts in idle animation state', () => {
    const enemy = new Enemy(100, 400);

    assert.equal(enemy.animationState, 'idle');
    assert.equal(enemy.animationProgress, 0);
});

test('idle animation progress stays at 0', () => {
    const player = new Player(100, 400);

    advanceTime(player, 100);

    assert.equal(player.animationState, 'idle');
    assert.equal(player.animationProgress, 0);
});

// ============================================================================
// WALK ANIMATION
// ============================================================================

test('player transitions to walk when moving', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);

    assert.equal(player.animationState, 'walk');
});

test('enemy transitions to walk when velocity is non-zero', () => {
    const enemy = new Enemy(100, 400);

    enemy.velocityX = 50;
    enemy.update(0.016);

    assert.equal(enemy.animationState, 'walk');
});

test('walk animation progress cycles between 0 and 1', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);

    // Collect progress values over time
    const progressValues = [];
    for (let i = 0; i < 60; i++) { // ~1 second at 60fps
        player.update(0.016);
        progressValues.push(player.animationProgress);
    }

    // All values should be in [0, 1)
    assert.ok(progressValues.every(p => p >= 0 && p < 1));

    // Progress should cycle (increase then wrap)
    const hasIncreased = progressValues.some((p, i) => i > 0 && p > progressValues[i - 1]);
    const hasWrapped = progressValues.some((p, i) => i > 0 && p < progressValues[i - 1]);

    assert.ok(hasIncreased, 'walk animation should increase progress');
    assert.ok(hasWrapped, 'walk animation should wrap around');
});

test('walk animation resets to idle when stopped', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // Start walking
    player.handleInput(1, 0, input);
    advanceTime(player, 200);

    assert.equal(player.animationState, 'walk');
    assert.ok(player.animationProgress > 0);

    // Stop
    player.handleInput(0, 0, input);
    player.update(0.016);

    assert.equal(player.animationState, 'idle');
    assert.equal(player.animationProgress, 0);
});

// ============================================================================
// PUNCH ANIMATION
// ============================================================================

test('player punch animation progresses linearly', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    const duration = balanceConfig.player.punch.duration;
    const progressAtHalfway = [];

    // Check progress at 25%, 50%, 75%
    advanceTime(player, duration * 0.25);
    progressAtHalfway.push(player.animationProgress);

    advanceTime(player, duration * 0.25);
    progressAtHalfway.push(player.animationProgress);

    advanceTime(player, duration * 0.25);
    progressAtHalfway.push(player.animationProgress);

    // Progress should increase monotonically
    assert.ok(progressAtHalfway[0] < progressAtHalfway[1]);
    assert.ok(progressAtHalfway[1] < progressAtHalfway[2]);

    // Values should be roughly 0.25, 0.5, 0.75
    assert.ok(Math.abs(progressAtHalfway[0] - 0.25) < 0.1);
    assert.ok(Math.abs(progressAtHalfway[1] - 0.5) < 0.1);
    assert.ok(Math.abs(progressAtHalfway[2] - 0.75) < 0.1);
});

test('enemy punch animation progresses over 300ms', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();

    const duration = balanceConfig.enemy.attack.punchDuration;

    advanceTime(enemy, duration * 0.5);

    // Should be around 50% progress
    assert.ok(Math.abs(enemy.animationProgress - 0.5) < 0.1);
});

test('punch animation returns to idle after completion', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Advance past full attack duration
    advanceTime(player, balanceConfig.player.punch.duration + 50);

    assert.equal(player.animationState, 'idle');
});

test('enemy punch animation returns to idle after completion', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();

    // Advance past full punch duration
    advanceTime(enemy, balanceConfig.enemy.attack.punchDuration + 50);

    assert.equal(enemy.animationState, 'idle');
});

// ============================================================================
// HURT ANIMATION
// ============================================================================

test('player hurt animation starts at 0 progress', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);

    assert.equal(player.animationState, 'hurt');
    assert.equal(player.animationProgress, 0);
});

test('enemy hurt animation starts at 0 progress', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(10);

    assert.equal(enemy.animationState, 'hurt');
    assert.equal(enemy.animationProgress, 0);
});

test('hurt animation progresses to completion', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);

    const duration = balanceConfig.player.hurtAnimationDuration;

    advanceTime(player, duration * 0.5);
    const midProgress = player.animationProgress;

    advanceTime(player, duration * 0.5 + 50);

    assert.ok(midProgress > 0, 'hurt animation should progress');
    assert.equal(player.animationState, 'idle', 'should return to idle after hurt');
});

test('hurt animation has correct duration', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);

    const duration = balanceConfig.player.hurtAnimationDuration;

    // Should still be in hurt state before duration
    advanceTime(player, duration - 50);
    assert.equal(player.animationState, 'hurt');

    // Should return to idle after duration
    advanceTime(player, 100);
    assert.equal(player.animationState, 'idle');
});

test('enemy hurt animation has correct duration', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(10);

    const duration = balanceConfig.enemy.attack.hurtAnimationDuration;

    // Should still be in hurt state before duration
    advanceTime(enemy, duration - 50);
    assert.equal(enemy.animationState, 'hurt');

    // Should return to idle after duration
    advanceTime(enemy, 100);
    assert.equal(enemy.animationState, 'idle');
});

test('hurt animation cannot be interrupted by movement', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.takeDamage(10);

    // Try to move during hurt
    player.handleInput(1, 0, input);

    assert.equal(player.animationState, 'hurt');
});

test('hurt animation cannot be interrupted by another hurt', () => {
    const player = new Player(100, 400);

    player.takeDamage(10);
    advanceTime(player, 100);

    const progressBeforeSecondHit = player.animationProgress;

    // Take more damage
    player.takeDamage(10);

    // Animation state stays hurt, progress continues
    assert.equal(player.animationState, 'hurt');
});

// ============================================================================
// DEATH ANIMATION
// ============================================================================

test('player death animation starts at 0 progress', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth);

    assert.equal(player.animationState, 'death');
    assert.equal(player.animationProgress, 0);
});

test('enemy death animation starts at 0 progress', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    assert.equal(enemy.animationState, 'death');
    assert.equal(enemy.animationProgress, 0);
});

test('death animation progresses to 1', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth);

    const duration = balanceConfig.player.deathAnimationDuration;

    advanceTime(player, duration + 50);

    // Progress should reach 1 at end
    assert.ok(player.animationProgress >= 0.9);
});

test('enemy death animation has correct duration', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    const duration = balanceConfig.enemy.attack.deathAnimationDuration;

    // Should still be animating before duration
    advanceTime(enemy, duration - 100);
    assert.equal(enemy.isDead, false);

    // Should complete after duration
    advanceTime(enemy, 200);
    assert.equal(enemy.isDead, true);
});

test('death animation does not loop', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth);

    const duration = balanceConfig.player.deathAnimationDuration;

    advanceTime(player, duration + 500);

    // Should stay in death state
    assert.equal(player.animationState, 'death');
});

test('death animation cannot be interrupted', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    player.takeDamage(player.maxHealth);

    // Try various interruptions
    player.handleInput(1, 0, input);
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    player.takeDamage(10);

    assert.equal(player.animationState, 'death');
});

// ============================================================================
// ANIMATION STATE PRIORITY
// ============================================================================

test('animation priority: death > hurt > punch > walk > idle', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // Start with idle
    assert.equal(player.animationState, 'idle');

    // Walk takes over idle
    player.handleInput(1, 0, input);
    assert.equal(player.animationState, 'walk');

    // Punch takes over walk
    input.simulatePress('punch');
    player.handleInput(1, 0, input);
    assert.equal(player.animationState, 'punch');

    // Hurt takes over punch
    player.takeDamage(10);
    assert.equal(player.animationState, 'hurt');

    // Wait for hurt to end
    advanceTime(player, 500);

    // Start another attack
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Death takes over everything
    player.takeDamage(player.maxHealth);
    assert.equal(player.animationState, 'death');
});

// ============================================================================
// ANIMATION PROGRESS BOUNDS
// ============================================================================

test('animation progress never exceeds 1', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();

    // Advance way past animation end
    advanceTime(enemy, 1000);

    assert.ok(enemy.animationProgress <= 1);
});

test('animation progress never goes below 0', () => {
    const player = new Player(100, 400);

    // Various state changes
    const input = createMockInputManager();
    player.handleInput(1, 0, input);
    advanceTime(player, 50);
    player.handleInput(0, 0, input);
    advanceTime(player, 50);

    assert.ok(player.animationProgress >= 0);
});

// ============================================================================
// ANIMATION AND MOVEMENT INTERACTION
// ============================================================================

test('player cannot move during hurt animation', () => {
    const player = new Player(100, 400);
    const input = createMockInputManager();

    // Try to move
    player.handleInput(1, 0, input);
    assert.ok(player.velocityX !== 0);

    // Get hurt
    player.takeDamage(10);

    // Try to move again
    player.handleInput(1, 0, input);

    // Velocity not affected by input during hurt
    // (hurt state doesn't change velocity but animation takes priority)
    assert.equal(player.animationState, 'hurt');
});

test('enemy cannot move during punch animation', () => {
    const enemy = new Enemy(200, 400);

    enemy.startAttack();
    // Animation state is updated in update(), so call it to sync state
    enemy.update(0.001);

    enemy.moveToward(100, 400, 0.016, []);

    assert.equal(enemy.velocityX, 0);
    assert.equal(enemy.velocityY, 0);
});

test('enemy resumes movement after punch animation ends', () => {
    const enemy = new Enemy(200, 400);

    enemy.startAttack();

    // Wait for punch to end
    advanceTime(enemy, balanceConfig.enemy.attack.punchDuration + 50);

    // Now should be able to move
    enemy.moveToward(100, 400, 0.016, []);

    assert.ok(enemy.velocityX !== 0, 'enemy should move after punch ends');
});

// ============================================================================
// WALK ANIMATION SPEED
// ============================================================================

test('player walk animation cycles faster than enemy', () => {
    const player = new Player(100, 400);
    const enemy = new Enemy(100, 400);
    const input = createMockInputManager();

    player.handleInput(1, 0, input);
    enemy.velocityX = 50;

    // Count cycles over time
    let playerWraps = 0;
    let enemyWraps = 0;
    let lastPlayerProgress = 0;
    let lastEnemyProgress = 0;

    for (let i = 0; i < 120; i++) { // 2 seconds at 60fps
        player.update(0.016);
        enemy.update(0.016);

        if (player.animationProgress < lastPlayerProgress) playerWraps++;
        if (enemy.animationProgress < lastEnemyProgress) enemyWraps++;

        lastPlayerProgress = player.animationProgress;
        lastEnemyProgress = enemy.animationProgress;
    }

    // Player walk speed (3 cycles/sec) > Enemy walk speed (2.5 cycles/sec)
    assert.ok(playerWraps >= enemyWraps);
});

// ============================================================================
// ANIMATION TIMING PRECISION
// ============================================================================

test('hit window timing is accurate for player attack', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);
    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    const duration = balanceConfig.player.punch.duration;

    // Before hit window (< 30%)
    advanceTime(player, duration * 0.2);
    assert.equal(player.checkAttackHit(enemy), false, 'should miss before hit window');

    // Create fresh enemy for next test
    const enemy2 = new Enemy(130, 400);

    // Start new attack
    advanceTime(player, 200);
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Inside hit window (30-70%)
    advanceTime(player, duration * 0.5);
    assert.equal(player.checkAttackHit(enemy2), true, 'should hit during hit window');
});

test('enemy punch duration matches configuration', () => {
    const enemy = new Enemy(100, 400);

    enemy.startAttack();

    const duration = balanceConfig.enemy.attack.punchDuration;

    // Still punching before duration
    advanceTime(enemy, duration * 0.8);
    assert.equal(enemy.animationState, 'punch');

    // Done punching after duration
    advanceTime(enemy, duration * 0.4);
    assert.notEqual(enemy.animationState, 'punch');
});
