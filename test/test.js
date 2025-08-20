import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';
import Tower from '../src/Tower.js';

test('spawnProjectile main', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    const tower = new Tower(100, 200);

    game.spawnProjectile(1, tower);

    assert.equal(game.projectiles.length, 1);
    const projectile = game.projectiles[0];
    assert.equal(projectile.x, 120);
    assert.equal(projectile.y, 220);
    assert.ok(Math.abs(projectile.vx - 432.24) < 0.01);
    assert.ok(Math.abs(projectile.vy - 673.18) < 0.01);
});

test('spawnEnemy main', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);

    game.spawnEnemy();

    assert.equal(game.enemies.length, 1);
    assert.equal(game.spawned, 1);
    const enemy = game.enemies[0];
    assert.equal(enemy.maxHp, 3);
});

test('spawnEnemy defaults to last hp for high wave', () => {
    const fakeCanvas = makeFakeCanvas();
    const game = new Game(fakeCanvas);
    game.wave = game.enemyHpPerWave.length + 3;

    game.spawnEnemy();

    const enemy = game.enemies[0];
    assert.equal(enemy.maxHp, game.enemyHpPerWave.at(-1));
});

function makeFakeCanvas() {
    return {
        width: 800,
        height: 450,
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            strokeRect: () => {},
        }),
    };
}
