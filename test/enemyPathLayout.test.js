import test from 'node:test';
import assert from 'node:assert/strict';

import gameConfig from '../dist/config/gameConfig.js';
import { createGame } from './game/helpers.js';
import { createPlatformConfigs } from '../dist/core/platformLayout.js';

const EXPECTED_ROUTE_START = { x: -260, y: 150 };
const EXPECTED_ROUTE_SLOPE = 0.5;
const EXPECTED_BASE_BOTTOM_OFFSET = 180;
const EXPECTED_PORTAL_ROTATION = Math.atan2(1, 2);

function yOnEnemyPath(x) {
    return EXPECTED_ROUTE_START.y + (x - EXPECTED_ROUTE_START.x) * EXPECTED_ROUTE_SLOPE;
}

test('enemy route starts at the top-left portal and travels down-right', () => {
    assert.deepEqual(gameConfig.enemies.defaultSpawn, EXPECTED_ROUTE_START);
    assert.deepEqual(gameConfig.enemies.swarm.speed, { x: 200, y: 100 });
    assert.deepEqual(gameConfig.enemies.tank.speed, { x: 100, y: 50 });
});

test('game environment anchors portal and base to the diagonal enemy route', () => {
    const game = createGame();

    assert.deepEqual(game.getDefaultEnemyCoords(), EXPECTED_ROUTE_START);
    assert.deepEqual(game.portal.position, EXPECTED_ROUTE_START);
    assert.ok(Math.abs(game.portal.rotation - EXPECTED_PORTAL_ROTATION) < 1e-6);
    assert.equal(game.base.x, 1100);
    assert.equal(game.base.y, game.logicalH - EXPECTED_BASE_BOTTOM_OFFSET);

    const routeYAtBase = yOnEnemyPath(game.base.x);
    assert.ok(routeYAtBase >= game.base.y);
    assert.ok(routeYAtBase <= game.base.y + game.base.h);
});

test('platforms sit on both sides of the top-left to bottom-right enemy path', () => {
    const platforms = createPlatformConfigs();
    const upperPlatform = platforms.find(platform => platform.id === 'upper');
    const lowerPlatform = platforms.find(platform => platform.id === 'lower');

    assert.ok(upperPlatform.y < yOnEnemyPath(upperPlatform.x));
    assert.ok(lowerPlatform.y > yOnEnemyPath(lowerPlatform.x));
});
