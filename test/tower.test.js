import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../src/Tower.js';

test('center returns tower midpoint', () => {
    const tower = new Tower(10, 20);
    const c = tower.center();
    assert.deepEqual(c, { x: 30, y: 40 });
});

test('constructor sets default color to red', () => {
    const tower = new Tower(0, 0);
    assert.equal(tower.color, 'red');
});

test('constructor sets level to 1', () => {
    const tower = new Tower(0, 0);
    assert.equal(tower.level, 1);
});

test('draw draws range and tower body correctly', () => {
    const tower = new Tower(50, 60);
    const ctx = makeFakeCtx();
    tower.draw(ctx);
    assert.deepEqual(ctx.ops[0], ['beginPath']);
    assert.deepEqual(ctx.ops[1], ['arc', 70, 80, 120, 0, Math.PI * 2]);
    assert.deepEqual(ctx.ops[2], ['strokeStyle', 'rgba(255,0,0,0.3)']);
    assert.deepEqual(ctx.ops[3], ['stroke']);
    assert.deepEqual(ctx.ops[4], ['fillStyle', 'red']);
    assert.deepEqual(ctx.ops[5], ['fillRect', 50, 60, 40, 40]);
});

test('level 2 tower has increased range and damage', () => {
    const tower = new Tower(0, 0, 'red', 2);
    assert.equal(tower.range, 144);
    assert.ok(Math.abs(tower.damage - 1.8) < 1e-6);
});

test('draw shows tower level and highlight for upgrades', () => {
    const tower = new Tower(50, 60, 'red', 2);
    const ctx = makeFakeCtx();
    tower.draw(ctx);
    assert.ok(ctx.ops.some(op => op[0] === 'strokeRect' && op[1] === 48 && op[2] === 58 && op[3] === 44 && op[4] === 44));
    assert.ok(ctx.ops.some(op => op[0] === 'fillText' && op[1] === '2'));
});

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        beginPath() { ops.push(['beginPath']); },
        arc(x, y, r, s, e) { ops.push(['arc', x, y, r, s, e]); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        stroke() { ops.push(['stroke']); },
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
        set font(v) { ops.push(['font', v]); },
        fillText(t, x, y) { ops.push(['fillText', t, x, y]); },
    };
}

