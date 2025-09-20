import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../src/Tower.js';

test('center returns tower midpoint', () => {
    const tower = new Tower(10, 20);
    const c = tower.center();
    assert.deepEqual(c, { x: 40, y: 65 });
});

test('constructor sets default color to red', () => {
    const tower = new Tower(0, 0);
    assert.equal(tower.color, 'red');
});

test('constructor sets level to 1', () => {
    const tower = new Tower(0, 0);
    assert.equal(tower.level, 1);
});

test('draw renders range circle, sprite and level text', () => {
    const tower = new Tower(50, 60);
    const ctx = makeFakeCtx();
    const sprite = {};
    const assets = { tower_1r: sprite };

    tower.draw(ctx, assets);

    assert.deepEqual(ctx.ops[0], ['beginPath']);
    assert.deepEqual(ctx.ops[1], ['arc', 80, 105, tower.range, 0, Math.PI * 2]);
    assert.deepEqual(ctx.ops[2], ['strokeStyle', 'rgba(255,0,0,0.3)']);
    assert.deepEqual(ctx.ops[3], ['stroke']);
    assert.deepEqual(ctx.ops.find(op => op[0] === 'drawImage'), ['drawImage', sprite, tower.x, tower.y, tower.w, tower.h]);
    const fillTextCall = ctx.ops.find(op => op[0] === 'fillText');
    assert.deepEqual(fillTextCall, ['fillText', '1', tower.x + tower.w + 2, tower.y + 10]);
});

test('level 2 tower increases stats and draws highlight', () => {
    const tower = new Tower(50, 60, 'blue', 2);
    const ctx = makeFakeCtx();
    const sprite = {};
    const assets = { tower_2b: sprite };

    tower.draw(ctx, assets);

    assert.equal(tower.range, 144);
    assert.ok(Math.abs(tower.damage - 1.8) < 1e-6);
    const strokeRectCall = ctx.ops.find(op => op[0] === 'strokeRect');
    assert.deepEqual(strokeRectCall, ['strokeRect', tower.x - 2, tower.y - 2, tower.w + 4, tower.h + 4]);
    const arcCall = ctx.ops[1];
    assert.deepEqual(arcCall, ['arc', 80, 105, tower.range, 0, Math.PI * 2]);
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
        drawImage(img, x, y, w, h) { ops.push(['drawImage', img, x, y, w, h]); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
        set font(v) { ops.push(['font', v]); },
        fillText(text, x, y) { ops.push(['fillText', text, x, y]); },
    };
}
