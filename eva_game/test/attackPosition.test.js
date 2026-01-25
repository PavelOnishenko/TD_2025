/**
 * Attack Position System Tests
 * Tests for AttackPositionManager and enemy state management
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../dist/entities/Enemy.js';
import Player from '../dist/entities/Player.js';
import AttackPositionManager from '../dist/systems/AttackPositionManager.js';
import { balanceConfig } from '../dist/config/balanceConfig.js';
import {
    createEnemyAt,
    createPlayerAt,
    advanceTime,
    getDistance,
    createRecordingContext,
} from './helpers.js';

// ============================================================================
// ATTACK POSITION MANAGER INITIALIZATION
// ============================================================================

test('AttackPositionManager initializes with no assigned enemy', () => {
    const manager = new AttackPositionManager();

    assert.equal(manager.hasAssignedEnemy(), false);
    assert.equal(manager.getAssignedEnemy(), null);
    assert.equal(manager.getAttackSide(), null);
});

// ============================================================================
// ATTACK POSITION CALCULATION
// ============================================================================

test('getAttackPosition returns correct position for left side', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);

    const position = manager.getAttackPosition(player, 'left');

    assert.equal(position.x, player.x - balanceConfig.attackPosition.distanceFromPlayer);
    assert.equal(position.y, player.y);
});

test('getAttackPosition returns correct position for right side', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);

    const position = manager.getAttackPosition(player, 'right');

    assert.equal(position.x, player.x + balanceConfig.attackPosition.distanceFromPlayer);
    assert.equal(position.y, player.y);
});

test('getAttackPosition moves with player', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);

    const position1 = manager.getAttackPosition(player, 'left');
    player.x = 600;
    const position2 = manager.getAttackPosition(player, 'left');

    assert.equal(position2.x - position1.x, 100); // Moved 100px with player
});

// ============================================================================
// SIDE DETERMINATION
// ============================================================================

test('determineSide returns left when enemy is left of player', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    const side = manager.determineSide(enemy, player);

    assert.equal(side, 'left');
});

test('determineSide returns right when enemy is right of player', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(700, 400);

    const side = manager.determineSide(enemy, player);

    assert.equal(side, 'right');
});

test('determineSide returns right when enemy is at same x as player', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(500, 400);

    const side = manager.determineSide(enemy, player);

    // When equal, >= means right side
    assert.equal(side, 'right');
});

// ============================================================================
// ENEMY ASSIGNMENT
// ============================================================================

test('assignEnemy successfully assigns first enemy', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    const result = manager.assignEnemy(enemy, player);

    assert.equal(result, true);
    assert.equal(manager.hasAssignedEnemy(), true);
    assert.equal(manager.getAssignedEnemy(), enemy);
    assert.equal(manager.getAttackSide(), 'left');
});

test('assignEnemy sets enemy state to movingToAttack', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);

    assert.equal(enemy.enemyState, 'movingToAttack');
});

test('assignEnemy sets assignedAttackPosition on enemy', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);

    assert.notEqual(enemy.assignedAttackPosition, null);
    assert.equal(enemy.assignedAttackPosition.x, player.x - balanceConfig.attackPosition.distanceFromPlayer);
});

test('assignEnemy fails when position is already occupied', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy1 = new Enemy(300, 400);
    const enemy2 = new Enemy(200, 400);

    manager.assignEnemy(enemy1, player);
    const result = manager.assignEnemy(enemy2, player);

    assert.equal(result, false);
    assert.equal(manager.getAssignedEnemy(), enemy1); // First enemy still assigned
    assert.equal(enemy2.enemyState, 'waiting'); // Second enemy not changed
});

// ============================================================================
// POSITION RELEASE
// ============================================================================

test('releasePosition clears assigned enemy', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    manager.releasePosition();

    assert.equal(manager.hasAssignedEnemy(), false);
    assert.equal(manager.getAssignedEnemy(), null);
    assert.equal(manager.getAttackSide(), null);
});

test('releasePosition clears assignedAttackPosition on enemy', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    manager.releasePosition();

    assert.equal(enemy.assignedAttackPosition, null);
});

// ============================================================================
// UPDATE BEHAVIOR
// ============================================================================

test('update assigns closest waiting enemy when no enemy assigned', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy1 = new Enemy(300, 400); // Distance 200
    const enemy2 = new Enemy(350, 400); // Distance 150 - closer
    const enemies = [enemy1, enemy2];

    manager.update(player, enemies);

    assert.equal(manager.getAssignedEnemy(), enemy2); // Closer enemy assigned
});

test('update releases position when assigned enemy dies', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    enemy.animationState = 'death'; // Enemy dies

    manager.update(player, [enemy]);

    assert.equal(manager.hasAssignedEnemy(), false);
});

test('update releases position when assigned enemy isDead', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    enemy.isDead = true;

    manager.update(player, [enemy]);

    assert.equal(manager.hasAssignedEnemy(), false);
});

test('update transitions enemy to attacking state when position reached', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const attackDistance = balanceConfig.attackPosition.distanceFromPlayer;
    // Place enemy very close to attack position
    const enemy = new Enemy(500 - attackDistance + 2, 400);

    manager.assignEnemy(enemy, player);
    manager.update(player, [enemy]);

    assert.equal(enemy.enemyState, 'attacking');
});

test('update keeps enemy in movingToAttack state when position not reached', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400); // Far from attack position

    manager.assignEnemy(enemy, player);
    manager.update(player, [enemy]);

    assert.equal(enemy.enemyState, 'movingToAttack');
});

test('update updates attack position as player moves', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    const initialPosition = enemy.assignedAttackPosition.x;

    player.x = 600; // Player moves right
    manager.update(player, [enemy]);

    assert.notEqual(enemy.assignedAttackPosition.x, initialPosition);
    assert.equal(enemy.assignedAttackPosition.x, 600 - balanceConfig.attackPosition.distanceFromPlayer);
});

test('update sets non-assigned enemies to waiting state', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy1 = new Enemy(350, 400); // Closer - will be assigned
    const enemy2 = new Enemy(300, 400);
    enemy2.enemyState = 'movingToAttack'; // Incorrectly set state

    manager.update(player, [enemy1, enemy2]);

    assert.equal(enemy2.enemyState, 'waiting');
});

test('update assigns next enemy when current enemy dies', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy1 = new Enemy(350, 400);
    const enemy2 = new Enemy(300, 400);
    const enemies = [enemy1, enemy2];

    // First update - enemy1 assigned (closer)
    manager.update(player, enemies);
    assert.equal(manager.getAssignedEnemy(), enemy1);

    // Enemy1 dies
    enemy1.animationState = 'death';

    // Second update - enemy2 should be assigned
    manager.update(player, enemies);
    assert.equal(manager.getAssignedEnemy(), enemy2);
    assert.equal(enemy2.enemyState, 'movingToAttack');
});

// ============================================================================
// ENEMY STATE BEHAVIOR
// ============================================================================

test('enemy initializes with waiting state', () => {
    const enemy = new Enemy(100, 200);

    assert.equal(enemy.enemyState, 'waiting');
});

test('enemy initializes with null assignedAttackPosition', () => {
    const enemy = new Enemy(100, 200);

    assert.equal(enemy.assignedAttackPosition, null);
});

// ============================================================================
// VISUAL INDICATORS
// ============================================================================

test('getCurrentAttackPosition returns null when no enemy assigned', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);

    const result = manager.getCurrentAttackPosition(player);

    assert.equal(result, null);
});

test('getCurrentAttackPosition returns position and enemy when assigned', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    const result = manager.getCurrentAttackPosition(player);

    assert.notEqual(result, null);
    assert.equal(result.enemy, enemy);
    assert.equal(result.x, player.x - balanceConfig.attackPosition.distanceFromPlayer);
    assert.equal(result.y, player.y);
});

test('drawIndicators does not throw when no enemy assigned', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const ctx = createRecordingContext();

    // Should not throw
    manager.drawIndicators(ctx, player);
});

test('drawIndicators draws line and circle when enemy assigned', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);
    const ctx = createRecordingContext();

    manager.assignEnemy(enemy, player);
    manager.drawIndicators(ctx, player);

    // Check that drawing operations were performed
    const hasBeginPath = ctx.ops.some(op => op[0] === 'beginPath');
    const hasMoveTo = ctx.ops.some(op => op[0] === 'moveTo');
    const hasLineTo = ctx.ops.some(op => op[0] === 'lineTo');
    const hasArc = ctx.ops.some(op => op[0] === 'arc');
    const hasStroke = ctx.ops.some(op => op[0] === 'stroke');
    const hasFill = ctx.ops.some(op => op[0] === 'fill');

    assert.ok(hasBeginPath, 'should call beginPath');
    assert.ok(hasMoveTo, 'should call moveTo for line');
    assert.ok(hasLineTo, 'should call lineTo for line');
    assert.ok(hasArc, 'should call arc for circle');
    assert.ok(hasStroke, 'should call stroke');
    assert.ok(hasFill, 'should call fill');
});

// ============================================================================
// RESET FUNCTIONALITY
// ============================================================================

test('reset clears all manager state', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);

    manager.assignEnemy(enemy, player);
    manager.reset();

    assert.equal(manager.hasAssignedEnemy(), false);
    assert.equal(manager.getAssignedEnemy(), null);
    assert.equal(manager.getAttackSide(), null);
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

test('scenario: single enemy approaches and attacks', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const attackDistance = balanceConfig.attackPosition.distanceFromPlayer;
    const enemy = new Enemy(300, 400); // Starts far away
    const enemies = [enemy];

    // Initial update - enemy assigned, moving to attack
    manager.update(player, enemies);
    assert.equal(enemy.enemyState, 'movingToAttack');

    // Move enemy to attack position
    enemy.x = player.x - attackDistance + 5;
    enemy.y = player.y;

    // Update - enemy reaches position, transitions to attacking
    manager.update(player, enemies);
    assert.equal(enemy.enemyState, 'attacking');
});

test('scenario: multiple enemies, only one attacks at a time', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy1 = new Enemy(350, 400);
    const enemy2 = new Enemy(300, 400);
    const enemy3 = new Enemy(250, 400);
    const enemies = [enemy1, enemy2, enemy3];

    // Initial update
    manager.update(player, enemies);

    // Only one enemy should be assigned
    const assignedCount = enemies.filter(e => e.enemyState !== 'waiting').length;
    assert.equal(assignedCount, 1);

    // Waiting enemies should not have attack positions
    const waitingEnemies = enemies.filter(e => e.enemyState === 'waiting');
    for (const enemy of waitingEnemies) {
        assert.equal(enemy.assignedAttackPosition, null);
    }
});

test('scenario: when active enemy dies, next enemy takes over', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const attackDistance = balanceConfig.attackPosition.distanceFromPlayer;
    const enemy1 = new Enemy(player.x - attackDistance, 400); // At attack position
    const enemy2 = new Enemy(300, 400); // Waiting
    const enemies = [enemy1, enemy2];

    // First update - enemy1 assigned
    manager.update(player, enemies);
    assert.equal(manager.getAssignedEnemy(), enemy1);
    assert.equal(enemy2.enemyState, 'waiting');

    // Enemy1 gets killed
    enemy1.takeDamage(enemy1.maxHealth);
    assert.equal(enemy1.animationState, 'death');

    // Next update - enemy2 should be assigned
    manager.update(player, enemies);
    assert.equal(manager.getAssignedEnemy(), enemy2);
    assert.equal(enemy2.enemyState, 'movingToAttack');
});

test('scenario: player moves, attack position follows', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(300, 400);
    const enemies = [enemy];

    manager.update(player, enemies);
    const initialPosition = enemy.assignedAttackPosition.x;

    // Player moves right
    player.x = 700;
    manager.update(player, enemies);

    // Attack position should have moved with player
    assert.ok(enemy.assignedAttackPosition.x > initialPosition);
});

test('scenario: attack from right side', () => {
    const manager = new AttackPositionManager();
    const player = new Player(500, 400);
    const enemy = new Enemy(700, 400); // Right of player
    const enemies = [enemy];

    manager.update(player, enemies);

    assert.equal(manager.getAttackSide(), 'right');
    assert.equal(enemy.assignedAttackPosition.x, player.x + balanceConfig.attackPosition.distanceFromPlayer);
});
