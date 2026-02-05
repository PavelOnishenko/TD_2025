/**
 * Combat System Tests
 * Tests for hit detection, damage application, attack ranges, and hit windows
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Player from '../dist/entities/Player.js';
import Enemy from '../dist/entities/Enemy.js';
import { balanceConfig } from '../dist/config/balanceConfig.js';
import {
    createMockInputManager,
    advanceTime,
    setupCombatScenario,
} from './helpers.js';

// ============================================================================
// PLAYER ATTACK HIT DETECTION
// ============================================================================

test('player attack hits enemy in range facing correct direction', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400); // 30px to the right, within armLength (60px)

    // Start attack and advance to hit window (30%-70% progress)
    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Advance to middle of attack (50% progress)
    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, true);
});

test('player attack misses enemy behind player', () => {
    const player = new Player(100, 400);
    player.facingRight = true; // Facing right

    const enemy = new Enemy(70, 400); // 30px to the left (behind player)

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, false);
});

test('player attack misses enemy too far away', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(200, 400); // 100px away, beyond armLength (60px)

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, false);
});

test('player attack misses enemy outside vertical threshold', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 500); // Horizontally in range, but 100px vertical distance

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, false);
});

test('player attack hits enemy within vertical threshold', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 420); // 20px vertical offset, within threshold (30px)

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, true);
});

// ============================================================================
// PLAYER ATTACK HIT WINDOW
// ============================================================================

test('player attack misses at start of animation (before hit window)', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Don't advance time - still at 0% progress
    player.update(0.001); // Tiny update to register attack

    const hit = player.checkAttackHit(enemy);

    // Hit window starts at 30%, so should miss at 0%
    assert.equal(hit, false);
});

test('player attack misses at end of animation (after hit window)', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Advance past hit window (>70% progress)
    advanceTime(player, 90); // Near end of 100ms attack

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, false);
});

test('player attack hits during middle of animation (within hit window)', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    // Advance to middle of attack (50% progress)
    advanceTime(player, 50);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, true);
});

// ============================================================================
// PLAYER ATTACK HIT TRACKING (NO DOUBLE HITS)
// ============================================================================

test('player cannot hit same enemy twice in one attack', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 40); // Within hit window

    const firstHit = player.checkAttackHit(enemy);
    const secondHit = player.checkAttackHit(enemy);

    assert.equal(firstHit, true);
    assert.equal(secondHit, false);
});

test('player can hit multiple different enemies in one attack', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy1 = new Enemy(130, 400);
    const enemy2 = new Enemy(140, 410);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);

    advanceTime(player, 50);

    const hit1 = player.checkAttackHit(enemy1);
    const hit2 = player.checkAttackHit(enemy2);

    assert.equal(hit1, true);
    assert.equal(hit2, true);
});

test('player hit tracking resets for new attack', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);
    const input = createMockInputManager();

    // First attack
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    const firstAttackHit = player.checkAttackHit(enemy);

    // Wait for cooldown
    advanceTime(player, 200);

    // Second attack
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    const secondAttackHit = player.checkAttackHit(enemy);

    assert.equal(firstAttackHit, true);
    assert.equal(secondAttackHit, true);
});

// ============================================================================
// ENEMY ATTACK HIT DETECTION
// ============================================================================

test('enemy attack hits player in range facing correct direction', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false; // Facing left toward player

    const player = new Player(100, 400); // 30px to the left, within armLength (50px)

    enemy.startAttack();

    // Advance to middle of punch animation (50% of 300ms = 150ms)
    advanceTime(enemy, 150);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, true);
});

test('enemy attack misses player behind enemy', () => {
    const enemy = new Enemy(100, 400);
    enemy.facingRight = true; // Facing right

    const player = new Player(70, 400); // 30px to the left (behind enemy)

    enemy.startAttack();
    advanceTime(enemy, 150);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

test('enemy attack misses player too far away', () => {
    const enemy = new Enemy(200, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400); // 100px away, beyond armLength (50px)

    enemy.startAttack();
    advanceTime(enemy, 150);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

test('enemy attack misses player outside vertical threshold', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 500); // 100px vertical distance

    enemy.startAttack();
    advanceTime(enemy, 150);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

// ============================================================================
// ENEMY ATTACK HIT WINDOW
// ============================================================================

test('enemy attack misses at start of animation (before hit window)', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    enemy.startAttack();

    // Only advance a tiny bit - still before hit window
    advanceTime(enemy, 30); // ~10% of 300ms

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

test('enemy attack misses at end of animation (after hit window)', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    enemy.startAttack();

    // Advance past hit window (>70% of 300ms = >210ms)
    advanceTime(enemy, 250);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

test('enemy attack hits during middle of animation', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    enemy.startAttack();

    // Middle of animation (50% of 300ms = 150ms)
    advanceTime(enemy, 150);

    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, true);
});

// ============================================================================
// ENEMY ATTACK HIT TRACKING (NO DOUBLE HITS)
// ============================================================================

test('enemy cannot hit player twice in one attack', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    enemy.startAttack();
    advanceTime(enemy, 120); // Within hit window

    const firstHit = enemy.checkAttackHit(player);

    advanceTime(enemy, 30); // Still within hit window

    const secondHit = enemy.checkAttackHit(player);

    assert.equal(firstHit, true);
    assert.equal(secondHit, false);
});

test('enemy hit tracking resets for new attack', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    // First attack
    enemy.startAttack();
    advanceTime(enemy, 150);
    const firstAttackHit = enemy.checkAttackHit(player);

    // Wait for full cooldown (1500ms)
    advanceTime(enemy, 1500);

    // Second attack
    enemy.startAttack();
    advanceTime(enemy, 150);
    const secondAttackHit = enemy.checkAttackHit(player);

    assert.equal(firstAttackHit, true);
    assert.equal(secondAttackHit, true);
});

// ============================================================================
// DAMAGE APPLICATION
// ============================================================================

test('player deals correct damage to enemy', () => {
    const player = new Player(100, 400);
    const enemy = new Enemy(130, 400);
    const initialHealth = enemy.health;

    enemy.takeDamage(player.attackDamage);

    assert.equal(enemy.health, initialHealth - balanceConfig.player.punch.damage);
});

test('enemy deals correct damage to player', () => {
    const player = new Player(100, 400);
    const initialHealth = player.health;

    player.takeDamage(balanceConfig.enemy.attack.damage);

    assert.equal(player.health, initialHealth - balanceConfig.enemy.attack.damage);
});

test('enemy dies when health reaches zero', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);

    assert.equal(enemy.health, 0);
    assert.equal(enemy.animationState, 'death');
});

test('player enters death state when health reaches zero', () => {
    const player = new Player(100, 400);

    player.takeDamage(player.maxHealth);

    assert.equal(player.health, 0);
    assert.equal(player.animationState, 'death');
});

test('multiple hits accumulate damage', () => {
    const player = new Player(100, 400);
    const enemy = new Enemy(100, 400);
    const damage = 10;

    enemy.takeDamage(damage);
    enemy.takeDamage(damage);
    enemy.takeDamage(damage);

    assert.equal(enemy.health, enemy.maxHealth - damage * 3);
});

// ============================================================================
// COMBAT STATE INTERACTIONS
// ============================================================================

test('enemy cannot be hit while already in death state', () => {
    const enemy = new Enemy(100, 400);

    enemy.takeDamage(enemy.maxHealth);
    assert.equal(enemy.animationState, 'death');

    const healthAfterDeath = enemy.health;
    enemy.takeDamage(50);

    assert.equal(enemy.health, healthAfterDeath);
});

test('enemy cannot attack while in hurt state', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    // Put enemy in hurt state
    enemy.takeDamage(10);
    assert.equal(enemy.animationState, 'hurt');

    // Try to attack
    assert.equal(enemy.canAttackPlayer(player), false);
});

test('player attack returns false when not attacking', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);

    const hit = player.checkAttackHit(enemy);

    assert.equal(hit, false);
});

test('enemy attack returns false when not in punch animation', () => {
    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const player = new Player(100, 400);

    // Don't start attack
    const hit = enemy.checkAttackHit(player);

    assert.equal(hit, false);
});

// ============================================================================
// ATTACK RANGE CALCULATIONS
// ============================================================================

test('player attack range respects armLength configuration', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const armLength = balanceConfig.player.punch.reach;

    // Just within range
    const enemyInRange = new Enemy(100 + armLength - 1, 400);

    // Just outside range
    const enemyOutOfRange = new Enemy(100 + armLength + 1, 400);

    const input = createMockInputManager();
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);

    assert.equal(player.checkAttackHit(enemyInRange), true);
    assert.equal(player.checkAttackHit(enemyOutOfRange), false);
});

test('enemy attack range respects armLength configuration', () => {
    const enemy = new Enemy(100, 400);
    enemy.facingRight = true;

    const armLength = balanceConfig.enemy.attack.armLength;

    // Just within range
    const playerInRange = new Player(100 + armLength - 1, 400);

    // Just outside range
    const playerOutOfRange = new Player(100 + armLength + 1, 400);

    enemy.startAttack();
    advanceTime(enemy, 150);

    // Reset enemy for second test
    const enemy2 = new Enemy(100, 400);
    enemy2.facingRight = true;
    enemy2.startAttack();
    advanceTime(enemy2, 150);

    assert.equal(enemy.checkAttackHit(playerInRange), true);
    assert.equal(enemy2.checkAttackHit(playerOutOfRange), false);
});

test('vertical threshold is symmetric above and below', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const threshold = balanceConfig.player.punch.verticalThreshold;

    const enemyAbove = new Enemy(130, 400 - threshold + 5); // Within threshold above
    const enemyBelow = new Enemy(130, 400 + threshold - 5); // Within threshold below
    const enemyTooHigh = new Enemy(130, 400 - threshold - 10); // Outside threshold above
    const enemyTooLow = new Enemy(130, 400 + threshold + 10); // Outside threshold below

    const input = createMockInputManager();

    // Test enemy above
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    assert.equal(player.checkAttackHit(enemyAbove), true);

    // Reset and test enemy below
    advanceTime(player, 200);
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    assert.equal(player.checkAttackHit(enemyBelow), true);

    // Reset and test enemy too high
    advanceTime(player, 200);
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    assert.equal(player.checkAttackHit(enemyTooHigh), false);

    // Reset and test enemy too low
    advanceTime(player, 200);
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);
    assert.equal(player.checkAttackHit(enemyTooLow), false);
});

// ============================================================================
// COMBAT SCENARIOS
// ============================================================================

test('player can hit enemy and enemy can hit player in quick succession', () => {
    const player = new Player(100, 400);
    player.facingRight = true;

    const enemy = new Enemy(130, 400);
    enemy.facingRight = false;

    const input = createMockInputManager();

    // Player attacks first
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);

    const playerHitsEnemy = player.checkAttackHit(enemy);
    assert.equal(playerHitsEnemy, true);

    // Enemy attacks
    enemy.startAttack();
    advanceTime(enemy, 150);

    const enemyHitsPlayer = enemy.checkAttackHit(player);
    assert.equal(enemyHitsPlayer, true);
});

test('attacks work correctly when combatants are facing each other', () => {
    // Player on left facing right
    const player = new Player(100, 400);
    player.facingRight = true;

    // Enemy on right facing left
    const enemy = new Enemy(140, 400);
    enemy.facingRight = false;

    const input = createMockInputManager();

    // Both start attacks
    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    enemy.startAttack();

    // Advance both
    advanceTime(player, 50);
    advanceTime(enemy, 150);

    // Both should be able to hit
    assert.equal(player.checkAttackHit(enemy), true);

    // Create fresh enemy for second test since first was already hit
    const enemy2 = new Enemy(140, 400);
    enemy2.facingRight = false;
    enemy2.startAttack();
    advanceTime(enemy2, 150);

    assert.equal(enemy2.checkAttackHit(player), true);
});

test('attacks fail when combatants are facing same direction', () => {
    // Both facing right - enemy to the RIGHT of player (facing away from player)
    const player = new Player(100, 400);
    player.facingRight = true; // Facing right

    const enemy = new Enemy(130, 400); // To the right of player
    enemy.facingRight = true; // Facing right (away from player who is to the left)

    const input = createMockInputManager();

    input.simulatePress('punch');
    player.handleInput(0, 0, input);
    advanceTime(player, 50);

    enemy.startAttack();
    enemy.update(0.001); // Sync animation state
    advanceTime(enemy, 150);

    // Player CAN hit enemy in front of them
    // But enemy can't hit player behind them (facing away)
    assert.equal(enemy.checkAttackHit(player), false);

    // For player hitting enemy behind scenario, create new setup
    const player2 = new Player(100, 400);
    player2.facingRight = false; // Facing left

    const enemy2 = new Enemy(130, 400); // Enemy to the right (behind player who faces left)

    input.simulatePress('punch');
    player2.handleInput(0, 0, input);
    advanceTime(player2, 50);

    // Player can't hit enemy behind them (player faces left, enemy is to the right)
    assert.equal(player2.checkAttackHit(enemy2), false);
});
