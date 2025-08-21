import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy from '../src/Enemy.js';

test('update moves enemy based on dt and speed', () => {
    const enemy = new Enemy();
    enemy.update(0.5);
    assert.equal(enemy.x, 50);
    enemy.update(0.25);
    assert.equal(enemy.x, 75);
});

test('isOutOfBounds returns correct value', () => {
    const enemy = new Enemy();
    enemy.x = 770; // x + w = 800
    assert.equal(enemy.isOutOfBounds(800), true);
    enemy.x = 769; // x + w = 799
    assert.equal(enemy.isOutOfBounds(800), false);
});

test('draw draws enemy and health bar correctly', () => {
    const enemy = new Enemy(10);
    enemy.hp = 5; // half health
    const ctx = makeFakeCtx();
    enemy.draw(ctx);

    // body
    assert.deepEqual(ctx.ops[1], ['fillRect', 0, 365, 30, 30]);
    // health bar background
    assert.deepEqual(ctx.ops[3], ['fillRect', 0, 359, 30, 4]);
    // health bar current hp
    assert.deepEqual(ctx.ops[5], ['fillRect', 0, 359, 15, 4]);
    // border
    assert.deepEqual(ctx.ops[7], ['strokeRect', 0, 359, 30, 4]);
});

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
    };
}