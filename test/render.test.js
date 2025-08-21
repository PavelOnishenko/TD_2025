import test from 'node:test';
import assert from 'node:assert/strict';
import { drawHoverCell, drawEntities, draw } from '../src/render.js';

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

test('drawHoverCell does nothing when buildMode false or hoverCell null', () => {
    const ctx = makeFakeCtx();
    const cell = { x: 10, y: 20, w: 30, h: 40, occupied: false };
    const baseGame = {
        ctx,
        buildMode: true,
        hoverCell: cell,
        gold: 100,
        towerCost: 50,
    };

    drawHoverCell({ ...baseGame, buildMode: false });
    assert.equal(ctx.ops.length, 0);

    drawHoverCell({ ...baseGame, hoverCell: null });
    assert.equal(ctx.ops.length, 0);
});

test('drawHoverCell draws green highlight when affordable and placeable', () => {
    const ctx = makeFakeCtx();
    const cell = { x: 10, y: 20, w: 30, h: 40, occupied: false };
    const game = {
        ctx,
        buildMode: true,
        hoverCell: cell,
        gold: 100,
        towerCost: 50,
    };

    drawHoverCell(game);

    assert.deepEqual(ctx.ops, [
        ['fillStyle', 'rgba(0,255,0,0.3)'],
        ['fillRect', 10, 20, 30, 40],
    ]);
});

test('drawHoverCell draws red highlight when unaffordable or occupied', () => {
    const ctx = makeFakeCtx();
    const cell = { x: 0, y: 0, w: 20, h: 20, occupied: false };
    const baseGame = {
        ctx,
        buildMode: true,
        hoverCell: cell,
        gold: 30,
        towerCost: 50,
    };

    drawHoverCell(baseGame);
    assert.deepEqual(ctx.ops, [
        ['fillStyle', 'rgba(255,0,0,0.3)'],
        ['fillRect', 0, 0, 20, 20],
    ]);

    ctx.ops.length = 0;

    drawHoverCell({ ...baseGame, gold: 100, hoverCell: { ...cell, occupied: true } });
    assert.deepEqual(ctx.ops, [
        ['fillStyle', 'rgba(255,0,0,0.3)'],
        ['fillRect', 0, 0, 20, 20],
    ]);
});

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

test('draw clears canvas, draws hover cell, entities and projectiles', () => {
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
        buildMode: true,
        hoverCell: { x: 1, y: 2, w: 3, h: 4, occupied: false },
        gold: 100,
        towerCost: 50,
    };

    draw(game);

    assert.ok(ctx.ops.some(op => op[0] === 'clearRect' && op[1] === 0 && op[2] === 0 && op[3] === 800 && op[4] === 450));
    assert.ok(towerCalled);
    assert.ok(enemyCalled);
    const twoPi = Math.PI * 2;
    assert.ok(ctx.ops.some(op => op[0] === 'arc' && op[1] === 25 && op[2] === 35 && op[3] === 4 && op[4] === 0 && op[5] === twoPi));
    assert.ok(ctx.ops.some(op => op[0] === 'fillStyle' && op[1] === 'rgba(0,255,0,0.3)'));
    assert.ok(ctx.ops.some(op => op[0] === 'fillRect' && op[1] === 1 && op[2] === 2 && op[3] === 3 && op[4] === 4));
});

