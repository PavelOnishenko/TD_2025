import test from 'node:test';
import assert from 'node:assert/strict';

import gameConfig from '../dist/config/gameConfig.js';
import { createGame } from './game/helpers.js';
import { createPlatformConfigs } from '../dist/core/platformLayout.js';

const EXPECTED_ROUTE_START = { x: -320, y: 100 };
const EXPECTED_PORTAL_POSITION = { x: -320, y: 10 };
const EXPECTED_ROUTE_SLOPE = 0.5;
const EXPECTED_BASE_BOTTOM_OFFSET = 210;
const EXPECTED_PORTAL_ROTATION = Math.atan2(1, 2);

function yOnEnemyPath(x) {
    return EXPECTED_ROUTE_START.y + (x - EXPECTED_ROUTE_START.x) * EXPECTED_ROUTE_SLOPE;
}

test('enemy route starts at the top-left portal and travels down-right', () => {
    assert.deepEqual(gameConfig.enemies.defaultSpawn, EXPECTED_ROUTE_START);
    assert.deepEqual(gameConfig.enemies.swarm.speed, { x: 200, y: 100 });
    assert.deepEqual(gameConfig.enemies.tank.speed, { x: 100, y: 50 });
});

test('game environment applies independently tuned portal spawn and base layout', () => {
    const game = createGame();

    assert.deepEqual(game.getDefaultEnemyCoords(), EXPECTED_ROUTE_START);
    assert.deepEqual(game.portal.position, EXPECTED_PORTAL_POSITION);
    assert.ok(Math.abs(game.portal.rotation - EXPECTED_PORTAL_ROTATION) < 1e-6);
    assert.equal(game.base.x, 900);
    assert.equal(game.base.y, game.logicalH - EXPECTED_BASE_BOTTOM_OFFSET);
});

test('portal and base sit partly off the top-left and bottom-right corners', () => {
    const game = createGame();

    assert.ok(game.portal.position.x < 0, 'portal should be clipped by the left edge');
    assert.ok(game.portal.position.y <= 20, 'portal should stay near the top edge');
    assert.ok(game.base.x > game.logicalW, 'base should sit to the right of the logical viewport');
    assert.ok(game.base.y + game.base.h <= game.logicalH, 'base should fit above the lower edge');
});

test('world bounds fit the enemy spawn but allow the decorative portal to be clipped', () => {
    const game = createGame();
    const bounds = game.computeWorldBounds();

    assert.ok(bounds.minX >= EXPECTED_ROUTE_START.x - 40);
    assert.ok(bounds.minY >= EXPECTED_ROUTE_START.y - 40);
});

test('layout editor spawn override moves the enemy spawn point', () => {
    const game = createGame();

    game.layoutSpawnPoint = { x: -80, y: 75 };

    assert.deepEqual(game.getDefaultEnemyCoords(), { x: -80, y: 75 });
});

test('platforms sit on both sides of the top-left to bottom-right enemy path', () => {
    const platforms = createPlatformConfigs();
    const upperPlatform = platforms.find(platform => platform.id === 'upper');
    const lowerPlatform = platforms.find(platform => platform.id === 'lower');

    assert.ok(upperPlatform.y < yOnEnemyPath(upperPlatform.x));
    assert.ok(lowerPlatform.y > yOnEnemyPath(lowerPlatform.x));
});
