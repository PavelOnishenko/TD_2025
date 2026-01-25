/**
 * Test helpers for Eva game
 * Provides utilities for mocking, stubbing, and creating test instances
 */

import { balanceConfig } from '../dist/config/balanceConfig.js';

/**
 * Creates a stub canvas 2D context with no-op methods
 */
function createContextStub() {
    return {
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        setLineDash: () => {},
        set fillStyle(_) {},
        set strokeStyle(_) {},
        set globalCompositeOperation(_) {},
        set globalAlpha(_) {},
        set lineWidth(_) {},
        set lineCap(_) {},
    };
}

/**
 * Creates a fake canvas element for testing
 */
export function makeFakeCanvas({ width = 1200, height = 800 } = {}) {
    return {
        width,
        height,
        getContext: () => createContextStub(),
    };
}

/**
 * Creates a drawing context that records all operations for verification
 */
export function createRecordingContext() {
    const ops = [];
    const record = (name, ...args) => ops.push([name, ...args]);
    const noop = () => {};

    return {
        ops,
        fillRect: (...args) => record('fillRect', ...args),
        clearRect: (...args) => record('clearRect', ...args),
        beginPath: () => record('beginPath'),
        arc: (...args) => record('arc', ...args),
        fill: () => record('fill'),
        stroke: () => record('stroke'),
        strokeRect: (...args) => record('strokeRect', ...args),
        drawImage: (...args) => record('drawImage', ...args),
        fillText: (...args) => record('fillText', ...args),
        save: () => record('save'),
        restore: () => record('restore'),
        setTransform: (...args) => record('setTransform', ...args),
        moveTo: (...args) => record('moveTo', ...args),
        lineTo: (...args) => record('lineTo', ...args),
        quadraticCurveTo: (...args) => record('quadraticCurveTo', ...args),
        translate: (...args) => record('translate', ...args),
        scale: (...args) => record('scale', ...args),
        rotate: (...args) => record('rotate', ...args),
        setLineDash: (...args) => record('setLineDash', ...args),
        set fillStyle(value) { record('fillStyle', value); },
        set strokeStyle(value) { record('strokeStyle', value); },
        set globalCompositeOperation(value) { record('globalCompositeOperation', value); },
        set globalAlpha(value) { record('globalAlpha', value); },
        set lineWidth(value) { record('lineWidth', value); },
        set lineCap(value) { record('lineCap', value); },
    };
}

/**
 * Creates a mock InputManager for testing player input
 */
export function createMockInputManager() {
    const pressedActions = new Set();
    const axisValues = { horizontal: 0, vertical: 0 };

    return {
        wasActionPressed(action) {
            const pressed = pressedActions.has(action);
            pressedActions.delete(action); // Consume the press
            return pressed;
        },
        isActionDown(action) {
            return pressedActions.has(action);
        },
        getAxis(axis) {
            return axisValues[axis] || 0;
        },
        // Test helpers
        simulatePress(action) {
            pressedActions.add(action);
        },
        setAxis(axis, value) {
            axisValues[axis] = value;
        },
        update() {
            // Clear consumed presses
        },
    };
}

/**
 * Runs a callback with Math.random replaced by a deterministic sequence
 */
export function withMockedRandom(sequence, callback) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => sequence[index++ % sequence.length];
    try {
        return callback();
    } finally {
        Math.random = originalRandom;
    }
}

/**
 * Temporarily replaces a method on an object
 */
export function withReplacedMethod(target, key, replacement, run) {
    const original = target[key];
    target[key] = replacement;
    try {
        return run();
    } finally {
        target[key] = original;
    }
}

/**
 * Creates an enemy at a specific position with optional config overrides
 */
export function createEnemyAt(Enemy, x, y, color = '#ff6b6b') {
    return new Enemy(x, y, color);
}

/**
 * Creates a player at a specific position
 */
export function createPlayerAt(Player, x, y) {
    return new Player(x, y);
}

/**
 * Helper to advance time for an entity (simulates deltaTime updates)
 */
export function advanceTime(entity, deltaTimeMs) {
    const deltaTimeSec = deltaTimeMs / 1000;
    entity.update(deltaTimeSec);
}

/**
 * Advances time in small increments for more accurate simulation
 */
export function advanceTimeInSteps(entity, totalTimeMs, stepMs = 16) {
    const steps = Math.ceil(totalTimeMs / stepMs);
    const stepSec = stepMs / 1000;
    for (let i = 0; i < steps; i++) {
        entity.update(stepSec);
    }
}

/**
 * Sets up an attack scenario between player and enemy at specified positions
 */
export function setupCombatScenario(Player, Enemy, {
    playerX = 100,
    playerY = 400,
    enemyX = 130,
    enemyY = 400,
    playerFacingRight = true,
    enemyFacingRight = false,
} = {}) {
    const player = new Player(playerX, playerY);
    player.facingRight = playerFacingRight;

    const enemy = new Enemy(enemyX, enemyY);
    enemy.facingRight = enemyFacingRight;

    return { player, enemy };
}

/**
 * Simulates a full attack sequence and returns hit results
 */
export function simulateAttack(attacker, target, checkHitFn, durationMs) {
    const hits = [];
    const stepMs = 16; // ~60fps
    const steps = Math.ceil(durationMs / stepMs);
    const stepSec = stepMs / 1000;

    for (let i = 0; i < steps; i++) {
        attacker.update(stepSec);
        if (checkHitFn(attacker, target)) {
            hits.push({
                time: i * stepMs,
                progress: attacker.animationProgress,
            });
        }
    }

    return hits;
}

/**
 * Gets configuration values for testing
 */
export function getConfig() {
    return balanceConfig;
}

/**
 * Calculates expected position after movement
 */
export function calculateExpectedPosition(startX, startY, velocityX, velocityY, deltaTimeSec) {
    return {
        x: startX + velocityX * deltaTimeSec,
        y: startY + velocityY * deltaTimeSec,
    };
}

/**
 * Creates multiple enemies at positions around a center point
 */
export function createEnemyGroup(Enemy, centerX, centerY, count, spacing = 50) {
    const enemies = [];
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const x = centerX + Math.cos(angle) * spacing;
        const y = centerY + Math.sin(angle) * spacing;
        enemies.push(new Enemy(x, y));
    }
    return enemies;
}

/**
 * Calculates distance between two entities
 */
export function getDistance(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
