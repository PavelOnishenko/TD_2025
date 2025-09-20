import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../src/Tower.js';

function makeFakeCtx() {
    const ops = [];
    return {
        ops,
        beginPath() { ops.push(['beginPath']); },
        arc(x, y, r, s, e) { ops.push(['arc', x, y, r, s, e]); },
        moveTo(x, y) { ops.push(['moveTo', x, y]); },
        lineTo(x, y) { ops.push(['lineTo', x, y]); },
        closePath() { ops.push(['closePath']); },
        set strokeStyle(v) { ops.push(['strokeStyle', v]); },
        stroke() { ops.push(['stroke']); },
        set fillStyle(v) { ops.push(['fillStyle', v]); },
        fill() { ops.push(['fill']); },
        strokeRect(x, y, w, h) { ops.push(['strokeRect', x, y, w, h]); },
        set font(v) { ops.push(['font', v]); },
        fillText(text, x, y) { ops.push(['fillText', text, x, y]); },
        drawImage(img, x, y, w, h) { ops.push(['drawImage', img, x, y, w, h]); },
    };
}

test('center returns tower midpoint', () => {
    const tower = new Tower(10, 20);
    assert.deepEqual(tower.center(), { x: 40, y: 65 });
});

test('level 2 tower has increased stats', () => {
    const tower = new Tower(0, 0, 'red', 2);
    assert.equal(tower.range, 144);
    assert.ok(Math.abs(tower.damage - 1.8) < 1e-6);
});

test('draw uses sprite when provided in assets', () => {
    const tower = new Tower(50, 60);
    const ctx = makeFakeCtx();
    const sprite = {};
    const assets = { tower_1r: sprite };

    tower.draw(ctx, assets);

    assert.ok(ctx.ops.some(op => op[0] === 'drawImage' && op[1] === sprite && op[2] === 50 && op[3] === 60));
});

test('draw falls back to vector body when sprite missing', () => {
    const tower = new Tower(50, 60);
    const ctx = makeFakeCtx();

    tower.draw(ctx);

    const fallbackStart = ctx.ops.findIndex(op => op[0] === 'moveTo');
    assert.notEqual(fallbackStart, -1);
    const moveTo = ctx.ops[fallbackStart];
    assert.deepEqual(moveTo, ['moveTo', 80, 60]);
    const lineTos = ctx.ops.filter(op => op[0] === 'lineTo');
    assert.equal(lineTos.length, 2);
});

test('higher level tower draws highlight and indicator', () => {
    const tower = new Tower(50, 60, 'blue', 2);
    const ctx = makeFakeCtx();

    tower.draw(ctx);

    assert.ok(ctx.ops.some(op => op[0] === 'strokeRect'));
    assert.ok(ctx.ops.some(op => op[0] === 'fillText' && op[1] === '2'));
});
