import test from 'node:test';
import assert from 'node:assert/strict';
import Enemy, { TankEnemy, SwarmEnemy } from '../../js/entities/Enemy.js';
import * as effects from '../../js/systems/effects.js';

test('update moves enemy based on dt and both speed components', () => {
    const enemy = new Enemy(3, 'red', 0, 100, 120, 80);

    enemy.update(0.5);

    assert.strictEqual(enemy.x, 60);
    assert.strictEqual(enemy.y, 140);

    enemy.update(0.25);

    assert.strictEqual(enemy.x, 90);
    assert.strictEqual(enemy.y, 160);
});

test('isOutOfBounds only flags positions beyond the bottom edge', () => {
    const enemy = new Enemy(3, 'red', 0, 800, 0, 0);

    const isOffscreen = enemy.isOutOfBounds(800);

    assert.strictEqual(isOffscreen, true);

    enemy.y = 799;

    const isStillVisible = enemy.isOutOfBounds(800);

    assert.strictEqual(isStillVisible, false);
});

test('draw renders sprite and health bar proportions', () => {
    const restoreGlow = test.mock.method(effects, 'drawEnemyEngineGlow', () => {});
    const enemy = new Enemy(10, 'blue', 0, 50, 0, 0);
    enemy.hp = 5;
    const ctx = createDrawingContext();
    const assets = { swarm_b: {} };

    try {
        enemy.draw(ctx, assets);
    } finally {
        restoreGlow.mock.restore();
    }

    assert.deepStrictEqual(ctx.ops[0], ['drawImage', assets.swarm_b, 0, 50, 80, 80]);
    assert.deepStrictEqual(ctx.ops[1], ['fillStyle', 'red']);
    assert.deepStrictEqual(ctx.ops[2], ['fillRect', 0, 44, 80, 4]);
    assert.deepStrictEqual(ctx.ops[3], ['fillStyle', 'green']);
    assert.deepStrictEqual(ctx.ops[4], ['fillRect', 0, 44, 40, 4]);
    assert.deepStrictEqual(ctx.ops[5], ['strokeStyle', 'black']);
    assert.deepStrictEqual(ctx.ops[6], ['strokeRect', 0, 44, 80, 4]);
});

test('setEngineFlamePlacement updates only provided numeric values', () => {
    const enemy = new Enemy(10, 'red', 5, 5, 0, 0);

    enemy.setEngineFlamePlacement({ anchorX: 10, offsetY: 3, angleDegrees: 90, anchorY: null });

    assert.strictEqual(enemy.engineFlame.anchor.x, 10);
    assert.strictEqual(enemy.engineFlame.anchor.y, 40);
    assert.strictEqual(enemy.engineFlame.offset.x, 0);
    assert.strictEqual(enemy.engineFlame.offset.y, 3);
    assert.strictEqual(enemy.engineFlame.angle, Math.PI / 2);
});

test('canRenderGlow verifies presence of drawing APIs', () => {
    const enemy = new Enemy(5, 'red', 0, 0, 0, 0);
    const validCtx = createGlowCapableContext();

    const canRenderWithFullApi = enemy.canRenderGlow(validCtx);

    assert.strictEqual(canRenderWithFullApi, true);

    delete validCtx.scale;

    const canRenderWithMissingApi = enemy.canRenderGlow(validCtx);

    assert.strictEqual(canRenderWithMissingApi, false);
});

test('getGlowPalette returns palette for color and fallback otherwise', () => {
    const redEnemy = new Enemy(5, 'red', 0, 0, 0, 0);
    const unknownEnemy = new Enemy(5, 'purple', 0, 0, 0, 0);

    const redPalette = redEnemy.getGlowPalette();
    const fallbackPalette = unknownEnemy.getGlowPalette();

    assert.strictEqual(redPalette.core, 'rgba(255, 243, 232, 1)');
    assert.strictEqual(fallbackPalette.core, 'rgba(255, 248, 220, 1)');
});

test('tank enemy has more hp and slower advance than swarm', () => {
    const tank = new TankEnemy();
    const swarm = new SwarmEnemy();

    assert.ok(tank.maxHp > swarm.maxHp);
    assert.ok(tank.speedX < swarm.speedX);
});

test('swarm enemy has less hp and moves faster than tank', () => {
    const swarm = new SwarmEnemy();
    const tank = new TankEnemy();

    assert.ok(swarm.maxHp < tank.maxHp);
    assert.ok(swarm.speedX > tank.speedX);
});

test('horizontal flight keeps vertical speed at zero', () => {
    const swarm = new SwarmEnemy();
    const tank = new TankEnemy();

    assert.strictEqual(swarm.speedY, 0);
    assert.strictEqual(tank.speedY, 0);
});

function createDrawingContext() {
    const ops = [];
    const noop = () => {};
    const record = (name, ...args) => ops.push([name, ...args]);
    return {
        ops,
        drawImage: (...args) => record('drawImage', ...args),
        set fillStyle(value) { record('fillStyle', value); },
        fillRect: (...args) => record('fillRect', ...args),
        set strokeStyle(value) { record('strokeStyle', value); },
        strokeRect: (...args) => record('strokeRect', ...args),
        save: noop, restore: noop, beginPath: noop, arc: noop, moveTo: noop,
        quadraticCurveTo: noop, translate: noop, scale: noop, rotate: noop,
        set globalCompositeOperation(_) {}, set globalAlpha(_) {},
        createRadialGradient: () => ({ addColorStop: noop }),
        createLinearGradient: () => ({ addColorStop: noop }),
    };
}

function createGlowCapableContext() {
    return {
        save() {},
        restore() {},
        beginPath() {},
        arc() {},
        moveTo() {},
        quadraticCurveTo() {},
        fill() {},
        translate() {},
        scale() {},
        createRadialGradient() { return { addColorStop() {} }; },
        createLinearGradient() { return { addColorStop() {} }; },
    };
}
