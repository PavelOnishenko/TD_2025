import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy, { TankEnemy, SwarmEnemy } from '../src/Enemy.js';

test('update moves enemy based on dt and both speed components', () => {
    const enemy = new Enemy(3, 'red', 0, 100, 120, 80);
    enemy.update(0.5);
    assert.equal(enemy.x, 60);
    assert.equal(enemy.y, 140);
    enemy.update(0.25);
    assert.equal(enemy.x, 90);
    assert.equal(enemy.y, 160);
});

test('isOutOfBounds returns correct value', () => {
    const enemy = new Enemy(3, 'red', 0, 800, 0, 0);
    assert.equal(enemy.isOutOfBounds(800), true);
    enemy.y = 799;
    assert.equal(enemy.isOutOfBounds(800), false);
});

test('draw uses sprites and health bar proportions', () => {
    const enemy = new Enemy(10, 'blue', 0, 50, 0, 0);
    enemy.hp = 5; // half health
    const ctx = makeFakeCtx();
    const assets = { swarm_b: {} };

    enemy.draw(ctx, assets);

    assert.deepEqual(ctx.ops[0], ['drawImage', assets.swarm_b, 0, 50, 30, 30]);
    assert.deepEqual(ctx.ops[1], ['fillStyle', 'red']);
    assert.deepEqual(ctx.ops[2], ['fillRect', 0, 44, 30, 4]);
    assert.deepEqual(ctx.ops[3], ['fillStyle', 'green']);
    assert.deepEqual(ctx.ops[4], ['fillRect', 0, 44, 15, 4]);
    assert.deepEqual(ctx.ops[5], ['strokeStyle', 'black']);
    assert.deepEqual(ctx.ops[6], ['strokeRect', 0, 44, 30, 4]);
});

test('tank enemy has more hp and slower advance than swarm', () => {
    const tank = new TankEnemy();
    const swarm = new SwarmEnemy();
    assert.ok(tank.maxHp > swarm.maxHp);
    assert.ok(tank.speedY < swarm.speedY);
});

test('swarm enemy has less hp and moves faster than tank', () => {
    const swarm = new SwarmEnemy();
    const tank = new TankEnemy();
    assert.ok(swarm.maxHp < tank.maxHp);
    assert.ok(swarm.speedY > tank.speedY);
});

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        drawImage(img, x, y, w, h) { ops.push(['drawImage', img, x, y, w, h]); },
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
    };
}
