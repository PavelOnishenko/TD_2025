import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEntities, draw } from '../js/core/render.js';

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        set globalCompositeOperation(v) { ops.push(['globalCompositeOperation', v]); },
        set globalAlpha(v) { ops.push(['globalAlpha', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
        clearRect(x, y, w, h) { ops.push(['clearRect', x, y, w, h]); },
        beginPath() { ops.push(['beginPath']); },
        arc(x, y, r, s, e) { ops.push(['arc', x, y, r, s, e]); },
        fill() { ops.push(['fill']); },
        drawImage(img, x, y, w, h) { ops.push(['drawImage', img, x, y, w, h]); },
        save() { ops.push(['save']); },
        restore() { ops.push(['restore']); },
        setTransform(...args) { ops.push(['setTransform', ...args]); },
    };
}

test('drawEntities draws towers, enemies and projectiles', () => {
    const ctx = makeFakeCtx();
    let towerCalls = 0;
    let enemyCalls = 0;
    const assets = {};
    const towers = [
        { draw: (c, a) => { assert.equal(c, ctx); assert.equal(a, assets); towerCalls++; } },
        { draw: (c, a) => { assert.equal(c, ctx); assert.equal(a, assets); towerCalls++; } },
    ];
    const enemies = [
        { draw: (c, a) => { assert.equal(c, ctx); assert.equal(a, assets); enemyCalls++; } },
    ];
    const projectiles = [
        { x: 5, y: 6, color: 'red', anim: { time: 0, pulseOffset: 0, sparkleOffset: 0, jitterAngle: 0, vibrationStrength: 0 } },
        { x: 15, y: 26, color: 'blue', anim: { time: 0.1, pulseOffset: 0.3, sparkleOffset: 0.6, jitterAngle: 1.2, vibrationStrength: 0.25 } },
    ];
    const game = { ctx, towers, enemies, projectiles, projectileRadius: 3, assets, explosions: [] };

    drawEntities(game);

    assert.equal(towerCalls, towers.length);
    assert.equal(enemyCalls, enemies.length);
    const arcs = ctx.ops.filter(op => op[0] === 'arc');
    assert.equal(arcs.length, projectiles.length * 5);
    const [_, x, y] = arcs[0];
    assert.ok(Math.abs(x - projectiles[0].x) < 1e-6);
    assert.ok(Math.abs(y - projectiles[0].y) < 1e-6);
    const blendModes = ctx.ops.filter(op => op[0] === 'globalCompositeOperation');
    assert.equal(blendModes.length, projectiles.length);
    blendModes.forEach(([_, mode]) => assert.equal(mode, 'lighter'));
    const fillStyles = ctx.ops.filter(op => op[0] === 'fillStyle').map(op => op[1]);
    assert.ok(fillStyles.includes('#ff2f45'));
    assert.ok(fillStyles.includes('#4cb9ff'));
});

test('draw clears canvas, draws grid and entities', () => {
    const ctx = makeFakeCtx();
    let towerCalled = false;
    let enemyCalled = false;
    const tower = { draw: () => { towerCalled = true; } };
    const enemy = { draw: () => { enemyCalled = true; } };
    const projectile = { x: 25, y: 35, color: 'red', anim: { time: 0.2, pulseOffset: 0.5, sparkleOffset: 0.8, jitterAngle: 0.4, vibrationStrength: 0 } };
    const cellSprite = {};
    const game = {
        ctx,
        canvas: { width: 450, height: 800 },
        logicalW: 540,
        logicalH: 960,
        base: { x: 10, y: 20, w: 30, h: 40 },
        getAllCells: () => ([{ x: 1, y: 2, w: 3, h: 4, occupied: false }]),
        towers: [tower],
        enemies: [enemy],
        projectiles: [projectile],
        projectileRadius: 4,
        assets: { cell: cellSprite },
        explosions: [],
    };

    draw(game);

    assert.ok(ctx.ops.some(op => op[0] === 'clearRect' && op[1] === 0 && op[2] === 0 && op[3] === 450 && op[4] === 800));
    assert.ok(ctx.ops.some(op => op[0] === 'fillRect' && op[1] === 10 && op[2] === 20 && op[3] === 30 && op[4] === 40));
    assert.ok(ctx.ops.some(op => op[0] === 'drawImage' && op[1] === cellSprite));
    assert.ok(towerCalled);
    assert.ok(enemyCalled);
    const arcsAtCenter = ctx.ops.filter(op => op[0] === 'arc' && Math.abs(op[1] - 25) < 1e-6 && Math.abs(op[2] - 35) < 1e-6);
    assert.ok(arcsAtCenter.length >= 1);
    assert.ok(arcsAtCenter.some(op => op[3] > game.projectileRadius));
    assert.ok(ctx.ops.some(op => op[0] === 'globalCompositeOperation' && op[1] === 'lighter'));
});

test('drawEntities renders explosion particles', () => {
    const ctx = makeFakeCtx();
    const explosion = {
        particles: [
            { x: 12, y: 20, radius: 2, life: 0.2, maxLife: 0.4, color: 'red' },
            { x: 18, y: 26, radius: 2.5, life: 0, maxLife: 0.3, color: 'red' },
        ],
    };
    const game = {
        ctx,
        towers: [],
        enemies: [],
        projectiles: [],
        projectileRadius: 3,
        assets: {},
        explosions: [explosion],
    };

    drawEntities(game);

    const arcs = ctx.ops.filter(op => op[0] === 'arc');
    assert.equal(arcs.length, 1);
    const [_, x, y, radius] = arcs[0];
    assert.ok(Math.abs(x - 12) < 1e-6);
    assert.ok(Math.abs(y - 20) < 1e-6);
    assert.ok(radius > 0);
    assert.ok(ctx.ops.some(op => op[0] === 'save'));
    assert.ok(ctx.ops.some(op => op[0] === 'globalCompositeOperation' && op[1] === 'lighter'));
    assert.ok(ctx.ops.some(op => op[0] === 'restore'));
});
