import test from 'node:test';
import assert from 'node:assert/strict';
import Tower from '../../js/entities/Tower.js';
import gameConfig from '../../js/config/gameConfig.js';

test('constructor applies defaults and derives stats', () => {
    const tower = new Tower(12, 18);

    assert.equal(tower.color, 'red');
    assert.equal(tower.level, 1);
    assert.equal(tower.range, 140 * 1.3);
    const expectedDamage = gameConfig.towers.levels?.[0]?.damage ?? 1;
    assert.ok(Math.abs(tower.damage - expectedDamage) < 1e-6);
    assert.equal(tower.getFireInterval(), gameConfig.towers.levels?.[0]?.fireInterval);
    assert.deepEqual(tower.center(), { x: 47, y: 70.5 });
});

test('updateStats scales range, damage and glow speed with level', () => {
    const tower = new Tower(0, 0, 'blue', 3);

    assert.ok(Math.abs(tower.range - 254.8) < 1e-6);
    const damageLevel3 = gameConfig.towers.levels?.[2]?.damage ?? tower.damage;
    assert.ok(Math.abs(tower.damage - damageLevel3) < 1e-6);
    assert.equal(tower.getFireInterval(), gameConfig.towers.levels?.[2]?.fireInterval);
    assert.equal(tower.glowSpeed, 2.4);
});

test('alignToCell positions tower anchor on target cell', () => {
    const tower = new Tower(0, 0);

    tower.alignToCell({ x: 100, y: 80 });

    const offset = tower.getPlacementOffset();
    assert.deepEqual({ x: tower.x + offset.x, y: tower.y + offset.y }, { x: 100, y: 80 });
});

test('draw renders sprite and level text without range circle', () => {
    const tower = new Tower(50, 60);
    tower.glowTime = 0;
    const ctx = makeFakeCtx();
    const sprite = {};
    const assets = { tower_1r: sprite };

    tower.draw(ctx, assets);

    const rangeArc = ctx.ops.find(op => op[0] === 'arc' && op[3] === tower.range);
    assert.equal(rangeArc, undefined);
    assert.deepEqual(findOp(ctx.ops, 'fillStyle'), ['fillStyle', 'red']);
    assert.deepEqual(findOp(ctx.ops, 'drawImage'), ['drawImage', sprite, tower.x, tower.y, tower.w, tower.h]);

    // Check that level indicator is drawn centered at bottom of tower
    const config = gameConfig.towers?.levelIndicator ?? {};
    const fontSize = config.fontSize ?? 16;
    const offsetX = config.offsetX ?? 0;
    const offsetY = config.offsetY ?? 4;
    const expectedX = tower.x + tower.w / 2 + offsetX;
    const expectedY = tower.y + tower.h + fontSize + offsetY;
    const fillTextOp = ctx.ops.find(op => op[0] === 'fillText' && op[1] === '1');
    assert.ok(fillTextOp, 'fillText operation should exist');
    assert.equal(fillTextOp[1], '1', 'level text should be "1"');
    assert.equal(fillTextOp[2], expectedX, 'level text x position should be centered');
    assert.equal(fillTextOp[3], expectedY, 'level text y position should be below tower');
});

test('draw uses blue styling without emitting range stroke', () => {
    const tower = new Tower(30, 30, 'blue', 2);
    tower.glowTime = 0;
    const ctx = makeFakeCtx();
    const assets = { tower_2b: {} };

    tower.draw(ctx, assets);

    assert.ok(Math.abs(tower.range - 218.4) < 1e-6);
    const damageLevel2 = gameConfig.towers.levels?.[1]?.damage ?? tower.damage;
    assert.ok(Math.abs(tower.damage - damageLevel2) < 1e-6);
    assert.deepEqual(findOp(ctx.ops, 'fillStyle'), ['fillStyle', 'blue']);

    // Verify no range circle is drawn (no arc with tower.range as radius)
    const rangeArc = ctx.ops.find(op => op[0] === 'arc' && op[3] === tower.range);
    assert.equal(rangeArc, undefined, 'should not draw range circle');
});

test('draw warns and skips sprite rendering when asset missing', () => {
    const tower = new Tower(0, 0);
    tower.glowTime = 0;
    const ctx = makeFakeCtx();
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = message => warnings.push(message);

    try {
        tower.draw(ctx, {});
    } finally {
        console.warn = originalWarn;
    }

    assert.equal(findOp(ctx.ops, 'drawImage'), undefined);
    assert.ok(warnings[0].includes('tower_1r'));
});

test('triggerFlash draws muzzle glow while active', () => {
    const tower = new Tower(10, 10);
    tower.glowTime = 0;
    const ctx = makeFakeCtx();
    const assets = { tower_1r: {} };

    tower.triggerFlash();
    tower.draw(ctx, assets);

    assert.ok(ctx.ops.some(op => op[0] === 'globalCompositeOperation' && op[1] === 'lighter'));
});

test('update decays timers and wraps glow phase', () => {
    const tower = new Tower(0, 0);
    tower.triggerFlash();
    tower.triggerPlacementFlash();
    tower.glowTime = Math.PI * 2 - 0.05;

    const initialFlash = tower.flashTimer;
    const initialPlacement = tower.placementFlashTimer;
    tower.update(0.1);

    assert.ok(tower.flashTimer < initialFlash);
    assert.ok(tower.placementFlashTimer < initialPlacement);
    assert.ok(tower.glowTime < Math.PI * 2);

    tower.update(5);
    assert.equal(tower.flashTimer, 0);
    assert.equal(tower.placementFlashTimer, 0);
});

test('hover highlight persists while hovered and clears when exiting', () => {
    const tower = new Tower(0, 0);

    tower.setHovered(true);
    tower.update(1);

    assert.equal(tower.hoverAmount, 1);

    tower.setHovered(false);
    tower.update(0.1);

    assert.equal(tower.hoverAmount, 0);
});

test('placement flash draws glow when intensity present', () => {
    const tower = new Tower(10, 20);
    tower.glowTime = 0;
    const ctx = makeFakeCtx();
    const assets = { tower_1r: {} };

    tower.triggerPlacementFlash();
    tower.draw(ctx, assets);

    assert.ok(ctx.ops.some(op => op[0] === 'globalAlpha'));
});

function makeFakeCtx() {
    const ops = [];
    const ctx = createCtxCore(ops);
    attachCtxSetters(ctx, ops);
    return ctx;
}

function createCtxCore(ops) {
    return {
        ops,
        save: () => recordOp(ops, 'save'),
        restore: () => recordOp(ops, 'restore'),
        beginPath: () => recordOp(ops, 'beginPath'),
        arc: (x, y, r, s, e) => recordOp(ops, 'arc', x, y, r, s, e),
        stroke: () => recordOp(ops, 'stroke'),
        fill: () => recordOp(ops, 'fill'),
        drawImage: (img, x, y, w, h) => recordOp(ops, 'drawImage', img, x, y, w, h),
        strokeRect: (x, y, w, h) => recordOp(ops, 'strokeRect', x, y, w, h),
        fillRect: (x, y, w, h) => recordOp(ops, 'fillRect', x, y, w, h),
        fillText: (text, x, y) => recordOp(ops, 'fillText', text, x, y),
        strokeText: (text, x, y) => recordOp(ops, 'strokeText', text, x, y),
        measureText: (text) => {
            recordOp(ops, 'measureText', text);
            return { width: text.length * 8 };
        },
        createRadialGradient: (x0, y0, r0, x1, y1, r1) => createGradient(ops, x0, y0, r0, x1, y1, r1),
    };
}

function attachCtxSetters(ctx, ops) {
    ['strokeStyle', 'fillStyle', 'font', 'globalCompositeOperation', 'globalAlpha', 'textAlign', 'textBaseline', 'lineWidth'].forEach(name => {
        Object.defineProperty(ctx, name, {
            set(value) {
                recordOp(ops, name, value);
            },
        });
    });
}

function createGradient(ops, x0, y0, r0, x1, y1, r1) {
    recordOp(ops, 'createRadialGradient', x0, y0, r0, x1, y1, r1);
    return {
        addColorStop(offset, color) {
            recordOp(ops, 'addColorStop', offset, color);
        },
    };
}

function recordOp(ops, name, ...args) {
    ops.push([name, ...args]);
}

function findOp(ops, name) {
    return ops.find(op => op[0] === name);
}
