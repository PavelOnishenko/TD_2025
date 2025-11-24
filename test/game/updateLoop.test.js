import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell, withReplacedMethod } from './helpers.js';

test('calcDelta returns delta in seconds and updates lastTime', () => {
    const game = createGame();
    game.lastTime = 1000;

    const dt = game.calcDelta(2000);

    assert.equal(dt, 1);
    assert.equal(game.lastTime, 2000);
});

test('computeWorldBounds expands when projectile radius grows', () => {
    const game = createGame();
    game.projectileRadius = 6;
    game.maxProjectileRadius = 6;
    const originalMax = game.maxProjectileRadius;
    const cell = game.bottomCells[0];
    placeTowerOnCell(game, cell, { level: 3 });

    game.spawnProjectile(0, cell.tower);
    const bounds = game.computeWorldBounds();
    const expectedRadius = game.getProjectileRadiusForLevel(3);

    assert.ok(bounds.maxX > game.base.x);
    assert.equal(game.maxProjectileRadius, expectedRadius);
    assert.ok(game.maxProjectileRadius > originalMax);
});

test('getTowerAt returns tower for occupied cell', () => {
    const game = createGame();
    const cell = game.bottomCells[0];
    const tower = placeTowerOnCell(game, cell);

    assert.equal(game.getTowerAt(cell), tower);
    assert.equal(game.getTowerAt({}), null);
});

test('update schedules next frame when game active', () => {
    const game = createGame({ attachDom: true });
    game.assets = new Proxy({}, { get: () => ({}) });
    game.startWave();
    // const timestamp = game.spawnInterval * 1000; // here how it was
    const timestamp = 500; // need to fix the test if it's faiing. We dont have spawnInterval anymore
    let scheduledCallback = null;

    withReplacedMethod(globalThis, 'requestAnimationFrame', cb => { scheduledCallback = cb; }, () => {
        game.update(timestamp);
    });

    assert.equal(typeof scheduledCallback, 'function');
    assert.equal(game.lastTime, timestamp);
    assert.ok(game.enemies.length > 0);
});

test('update returns early when game over', () => {
    const game = createGame({ attachDom: true });
    game.gameOver = true;
    let called = false;

    withReplacedMethod(globalThis, 'requestAnimationFrame', () => { called = true; }, () => {
        game.update(500);
    });

    assert.equal(called, false);
    assert.equal(game.lastTime, 0);
});

test('update keeps scheduling while paused without advancing time', () => {
    const game = createGame({ attachDom: true });
    game.pause();
    game.elapsedTime = 0;
    let scheduled = false;

    withReplacedMethod(globalThis, 'requestAnimationFrame', () => { scheduled = true; }, () => {
        game.update(1200);
    });

    assert.equal(scheduled, true);
    assert.equal(game.lastTime, 1200);
    assert.equal(game.elapsedTime, 0);
});

test('resumeAfterAd resumes only when paused for ad', () => {
    const game = createGame();

    assert.equal(game.resumeAfterAd(), false);

    game.pauseForAd();
    assert.equal(game.isPaused, true);
    assert.equal(game.pauseReason, 'ad');

    assert.equal(game.resumeAfterAd(), true);
    assert.equal(game.isPaused, false);
    assert.equal(game.pauseReason, null);
});

