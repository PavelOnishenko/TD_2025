import test from 'node:test';
import assert from 'node:assert/strict';
import {
    clamp,
    clamp01,
    lerp,
    distance,
    angleBetween,
    randomRange,
    randomInt,
    easeOutCubic,
    easeInOutQuad,
} from '../../../engine/utils/MathUtils.js';

test('clamp returns value when within range', () => {
    const result = clamp(5, 0, 10);

    assert.equal(result, 5);
});

test('clamp returns min when value is below range', () => {
    const result = clamp(-5, 0, 10);

    assert.equal(result, 0);
});

test('clamp returns max when value is above range', () => {
    const result = clamp(15, 0, 10);

    assert.equal(result, 10);
});

test('clamp returns value when equal to min', () => {
    const result = clamp(0, 0, 10);

    assert.equal(result, 0);
});

test('clamp returns value when equal to max', () => {
    const result = clamp(10, 0, 10);

    assert.equal(result, 10);
});

test('clamp01 returns value when within 0-1 range', () => {
    const result = clamp01(0.5);

    assert.equal(result, 0.5);
});

test('clamp01 returns 0 when value is negative', () => {
    const result = clamp01(-0.5);

    assert.equal(result, 0);
});

test('clamp01 returns 1 when value is above 1', () => {
    const result = clamp01(1.5);

    assert.equal(result, 1);
});

test('lerp returns start when t is 0', () => {
    const result = lerp(10, 20, 0);

    assert.equal(result, 10);
});

test('lerp returns end when t is 1', () => {
    const result = lerp(10, 20, 1);

    assert.equal(result, 20);
});

test('lerp returns midpoint when t is 0.5', () => {
    const result = lerp(10, 20, 0.5);

    assert.equal(result, 15);
});

test('lerp interpolates correctly for arbitrary t', () => {
    const result = lerp(0, 100, 0.25);

    assert.equal(result, 25);
});

test('distance returns 0 for same point', () => {
    const result = distance(5, 5, 5, 5);

    assert.equal(result, 0);
});

test('distance calculates horizontal distance', () => {
    const result = distance(0, 0, 3, 0);

    assert.equal(result, 3);
});

test('distance calculates vertical distance', () => {
    const result = distance(0, 0, 0, 4);

    assert.equal(result, 4);
});

test('distance calculates diagonal distance', () => {
    const result = distance(0, 0, 3, 4);

    assert.equal(result, 5);
});

test('angleBetween returns 0 for point directly to the right', () => {
    const result = angleBetween(0, 0, 1, 0);

    assert.equal(result, 0);
});

test('angleBetween returns PI for point directly to the left', () => {
    const result = angleBetween(0, 0, -1, 0);

    assert.ok(Math.abs(result - Math.PI) < 1e-10);
});

test('angleBetween returns PI/2 for point directly below', () => {
    const result = angleBetween(0, 0, 0, 1);

    assert.ok(Math.abs(result - Math.PI / 2) < 1e-10);
});

test('angleBetween returns -PI/2 for point directly above', () => {
    const result = angleBetween(0, 0, 0, -1);

    assert.ok(Math.abs(result + Math.PI / 2) < 1e-10);
});

test('randomRange returns value within range', () => {
    for (let i = 0; i < 100; i++) {
        const result = randomRange(10, 20);

        assert.ok(result >= 10 && result <= 20);
    }
});

test('randomRange returns min when min equals max', () => {
    const result = randomRange(5, 5);

    assert.equal(result, 5);
});

test('randomInt returns integer within range', () => {
    for (let i = 0; i < 100; i++) {
        const result = randomInt(10, 20);

        assert.ok(Number.isInteger(result));
        assert.ok(result >= 10 && result <= 20);
    }
});

test('randomInt includes both min and max values', () => {
    const results = new Set();
    for (let i = 0; i < 1000; i++) {
        results.add(randomInt(0, 1));
    }

    assert.ok(results.has(0));
    assert.ok(results.has(1));
});

test('easeOutCubic returns 0 when t is 0', () => {
    const result = easeOutCubic(0);

    assert.equal(result, 0);
});

test('easeOutCubic returns 1 when t is 1', () => {
    const result = easeOutCubic(1);

    assert.equal(result, 1);
});

test('easeOutCubic returns value between 0 and 1 for t in range', () => {
    const result = easeOutCubic(0.5);

    assert.ok(result > 0 && result < 1);
    assert.ok(result > 0.5);
});

test('easeInOutQuad returns 0 when t is 0', () => {
    const result = easeInOutQuad(0);

    assert.equal(result, 0);
});

test('easeInOutQuad returns 1 when t is 1', () => {
    const result = easeInOutQuad(1);

    assert.equal(result, 1);
});

test('easeInOutQuad returns 0.5 when t is 0.5', () => {
    const result = easeInOutQuad(0.5);

    assert.ok(Math.abs(result - 0.5) < 1e-10);
});

test('easeInOutQuad follows ease-in curve for t < 0.5', () => {
    const result = easeInOutQuad(0.25);

    assert.ok(result > 0 && result < 0.25);
});

test('easeInOutQuad follows ease-out curve for t > 0.5', () => {
    const result = easeInOutQuad(0.75);

    assert.ok(result > 0.75 && result < 1);
});
