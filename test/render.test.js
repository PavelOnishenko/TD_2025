import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEntities, draw } from '../src/render.js';

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
        clearRect(x, y, w, h) { ops.push(['clearRect', x, y, w, h]); },
        beginPath() { ops.push(['beginPath']); },
        arc(x, y, r, s, e) { ops.push(['arc', x, y, r, s, e]); },
        fill() { ops.push(['fill']); },
    };
}

test('drawEntities draws towers, enemies and projectiles', () => {
    const ctx = makeFakeCtx();
    let towerCalls = 0;
    let enemyCalls = 0;
    const towers = [
        { draw: c => { assert.equal(c, ctx); towerCalls++; } },
        { draw: c => { assert.equal(c, ctx); towerCalls++; } },
    ];
    const enemies = [
        { draw: c => { assert.equal(c, ctx); enemyCalls++; } },
    ];
    const projectiles = [
        { x: 5, y: 6 },
        { x: 15, y: 26 },
    ];
    const game = { ctx, towers, enemies, projectiles, projectileRadius: 3 };

    drawEntities(game);

    assert.equal(towerCalls, towers.length);
    assert.equal(enemyCalls, enemies.length);
    const twoPi = Math.PI * 2;
    assert.deepEqual(
        ctx.ops.filter(op => op[0] === 'arc'),
        [
            ['arc', 5, 6, 3, 0, twoPi],
            ['arc', 15, 26, 3, 0, twoPi],
        ],
    );
});

test('draw clears canvas, draws entities and projectiles', () => {
    const ctx = makeFakeCtx();
    let towerCalled = false;
    let enemyCalled = false;
    const tower = { draw: () => { towerCalled = true; } };
    const enemy = { draw: () => { enemyCalled = true; } };
    const projectile = { x: 25, y: 35 };
    const game = {
        ctx,
        canvas: { width: 800, height: 450 },
        base: { x: 0, y: 0, w: 0, h: 0 },
        grid: [],
        towers: [tower],
        enemies: [enemy],
        projectiles: [projectile],
        projectileRadius: 4,
    };

    draw(game);

    assert.ok(ctx.ops.some(op => op[0] === 'clearRect' && op[1] === 0 && op[2] === 0 && op[3] === 800 && op[4] === 450));
    assert.ok(towerCalled);
    assert.ok(enemyCalled);
    const twoPi = Math.PI * 2;
    assert.ok(ctx.ops.some(op => op[0] === 'arc' && op[1] === 25 && op[2] === 35 && op[3] === 4 && op[4] === 0 && op[5] === twoPi));
});

