import test from 'node:test';
import assert from 'node:assert/strict';
import { TankEnemy, SwarmEnemy } from '../../js/entities/Enemy.js';
import { createGame, withMockedRandom, withReplacedMethod } from './helpers.js';
import gameConfig from '../../js/config/gameConfig.js';

function spawnAndCollect(game, type) {
    game.spawnEnemy(type);
    return game.enemies.slice();
}

test('spawnEnemy spawns swarm group with shared hp', () => {
    const game = createGame();

    const enemies = spawnAndCollect(game);

    assert.equal(enemies.length, gameConfig.enemies.swarm.groupSize);
    enemies.forEach(enemy => assert.ok(enemy instanceof SwarmEnemy));
    assert.equal(game.spawned, 1);
});

test('spawnEnemy supports tank enemies and scales hp', () => {
    const game = createGame();
    const baseHp = game.enemyHpPerWave[game.wave - 1];

    const enemies = spawnAndCollect(game, 'tank');

    assert.equal(enemies.length, 1);
    assert.ok(enemies[0] instanceof TankEnemy);
    assert.equal(enemies[0].maxHp, baseHp * gameConfig.enemies.tank.hpMultiplier);
});

test('spawnEnemy defaults to last hp when wave exceeds table', () => {
    const game = createGame();
    game.wave = game.enemyHpPerWave.length + 5;

    const enemies = withReplacedMethod(game, 'determineEnemyType', () => 'swarm', () => {
        return spawnAndCollect(game);
    });

    const expected = Math.max(
        1,
        Math.floor(game.enemyHpPerWave.at(-1) * gameConfig.enemies.swarm.hpFactor),
    );
    enemies.forEach(enemy => assert.equal(enemy.maxHp, expected));
});

test('getEnemyColor uses linear interpolation across wave', () => {
    const game = createGame();
    game.enemiesPerWave = 4;
    game.colorProbStart = 0.2;
    game.colorProbEnd = 0.8;

    const colors = withMockedRandom([0.1, 0.5, 0.55, 0.9], () => {
        return Array.from({ length: 4 }, (_, index) => {
            game.spawned = index;
            return game.getEnemyColor();
        });
    });

    assert.deepEqual(colors, ['red', 'blue', 'red', 'blue']);
});

test('spawnEnemy chooses random colors per enemy', () => {
    const game = createGame();

    const colors = withMockedRandom([0.2, 0.8, 0.1], () => {
        spawnAndCollect(game, 'swarm');
        return game.enemies.map(enemy => enemy.color);
    });

    const expectedColors = Array.from(
        { length: gameConfig.enemies.swarm.groupSize },
        (_, index) => (index % 2 === 0 ? 'red' : 'blue'),
    );
    assert.deepEqual(colors, expectedColors);
});

test('generateTankBurstSchedule returns sorted unique indices', () => {
    const game = createGame();

    const schedule = withMockedRandom([0.91, 0.35, 0.72, 0.18, 0.54, 0.27], () => {
        return game.generateTankBurstSchedule(6, 3);
    });

    assert.equal(schedule.length, 3);
    assert.deepEqual(schedule.slice().sort((a, b) => a - b), schedule);
    assert.equal(new Set(schedule).size, 3);
});

test('generateTankBurstSchedule handles zero cycles or tanks', () => {
    const game = createGame();

    assert.deepEqual(game.generateTankBurstSchedule(0, 3), []);
    assert.deepEqual(game.generateTankBurstSchedule(5, 0), []);
});

test('prepareTankScheduleForWave resets schedule when config missing', () => {
    const game = createGame();

    game.prepareTankScheduleForWave(null, 5);

    assert.deepEqual(game.tankBurstSchedule, []);
    assert.equal(game.tankBurstSet.size, 0);
    assert.equal(game.tankScheduleWave, 5);
});

test('determineEnemyType follows prepared tank schedule', () => {
    const game = createGame();
    const cfg = game.waveConfigs[2];
    game.generateTankBurstSchedule = () => [1, cfg.cycles];

    game.prepareTankScheduleForWave(cfg, 3);

    const types = [];
    for (let i = 0; i < cfg.cycles; i++) {
        types.push(game.determineEnemyType());
        game.spawned += 1;
    }

    assert.deepEqual(types.filter(type => type === 'tank'), Array(2).fill('tank'));
});

test('spawnEnemiesIfNeeded respects interval and progress', () => {
    const game = createGame();
    game.waveInProgress = true;
    game.spawnTimer = game.spawnInterval;

    game.spawnEnemiesIfNeeded(0);

    assert.ok(game.enemies.length > 0);
    assert.equal(game.spawnTimer, 0);
});

test('spawnEnemiesIfNeeded accumulates timer below interval', () => {
    const game = createGame();
    game.waveInProgress = true;

    game.spawnEnemiesIfNeeded(0.2);

    assert.equal(game.spawnTimer, 0.2);
    assert.equal(game.enemies.length, 0);
});

test('spawnEnemiesIfNeeded executes planned formations', () => {
    const game = createGame({ disableFormations: true });
    const plan = {
        events: [
            { time: 0, type: 'swarm', color: 'red', y: 540, groupSize: 1 },
            { time: 0.8, type: 'tank', color: 'blue', y: 580 },
        ],
        totalEnemies: 2,
        totalDifficulty: 2,
    };
    game.waveInProgress = true;
    game.waveSpawnSchedule = plan.events.slice();
    game.activeFormationPlan = plan;
    game.enemiesPerWave = plan.totalEnemies;
    game.waveSpawnCursor = 0;
    game.waveElapsed = 0;
    game.spawned = 0;

    game.spawnEnemiesIfNeeded(0);

    assert.equal(game.enemies.length, 1);
    assert.ok(game.enemies[0] instanceof SwarmEnemy);
    assert.equal(game.spawned, 1);

    game.spawnEnemiesIfNeeded(0.8);

    assert.equal(game.enemies.length, 2);
    assert.ok(game.enemies.some(enemy => enemy instanceof TankEnemy));
    assert.equal(game.spawned, 2);
});

test('updateEnemies removes enemies reaching the base', () => {
    const game = createGame();
    const enemy = {
        x: game.base.x - 5,
        w: 10,
        y: game.base.y - 10,
        h: 20,
        update: () => {},
        isOutOfBounds: () => false,
    };
    game.enemies.push(enemy);
    const livesBefore = game.lives;

    game.updateEnemies(0.016);

    assert.equal(game.enemies.length, 0);
    assert.equal(game.lives, livesBefore - 1);
});

