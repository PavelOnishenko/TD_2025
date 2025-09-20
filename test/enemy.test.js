import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy, { TankEnemy, SwarmEnemy } from '../src/Enemy.js';

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        drawImage(img, x, y, w, h) { ops.push(['drawImage', img, x, y, w, h]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
    };
}

test('update moves enemy using both speed axes', () => {
    const enemy = new Enemy(3, 'red', 0, 100, 40, 80);
    enemy.update(0.5);
    assert.equal(enemy.x, 20);
    assert.equal(enemy.y, 140);
});

test('isOutOfBounds returns correct value', () => {
    const enemy = new Enemy(3, 'red', 0, 800, 0, 10);
    assert.equal(enemy.isOutOfBounds(800), true);
    enemy.y = 799;
    assert.equal(enemy.isOutOfBounds(800), false);
});

test('draw falls back to colored rectangle when sprite missing', () => {
    const enemy = new Enemy(10, 'blue', 0, 50);
    enemy.hp = 5;
    const ctx = makeFakeCtx();

    enemy.draw(ctx);

    assert.deepEqual(ctx.ops[0], ['fillStyle', 'blue']);
    assert.deepEqual(ctx.ops[1], ['fillRect', 0, 50, 30, 30]);
    assert.ok(ctx.ops.some(op => op[0] === 'strokeRect' && op[2] === 44));
});

test('draw uses sprite when provided', () => {
    const enemy = new Enemy(10, 'red', 5, 15);
    const ctx = makeFakeCtx();
    const sprite = {};
    enemy.draw(ctx, { swarm_r: sprite });

    assert.ok(ctx.ops.some(op => op[0] === 'drawImage' && op[1] === sprite));
});

test('tank and swarm enemies expose differing stats', () => {
    const tank = new TankEnemy();
    const swarm = new SwarmEnemy();
    assert.ok(tank.maxHp > swarm.maxHp);
    assert.ok(tank.speed < swarm.speed);
});
