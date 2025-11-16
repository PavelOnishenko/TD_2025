import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell } from './helpers.js';

const UPGRADE_COST = 100;

test('upgradeTowerInstantly increases tower level and spends energy', () => {
    const game = createGame({ attachDom: true });
    const cell = game.bottomCells[0];
    const tower = placeTowerOnCell(game, cell, { level: 1 });
    game.energy = 150;

    const upgraded = game.upgradeTowerInstantly(tower, { cost: UPGRADE_COST });

    assert.equal(upgraded, true);
    assert.equal(tower.level, 2);
    assert.equal(game.energy, 50);
});

test('upgradeTowerInstantly rejects when energy is insufficient', () => {
    const game = createGame();
    const cell = game.bottomCells[0];
    const tower = placeTowerOnCell(game, cell, { level: 2 });
    game.energy = 20;

    const upgraded = game.upgradeTowerInstantly(tower, { cost: UPGRADE_COST });

    assert.equal(upgraded, false);
    assert.equal(tower.level, 2);
    assert.equal(game.energy, 20);
});
