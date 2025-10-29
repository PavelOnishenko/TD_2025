import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placeTowerOnCell } from '../game/helpers.js';
import { createSimpleSavePayload, applySimpleSaveState } from '../../js/systems/simpleSaveSystem.js';

function withDocumentStub(run) {
    if (typeof document !== 'undefined') {
        return run();
    }
    global.document = {
        createElement: () => ({ style: {}, setAttribute: () => {} }),
        createDocumentFragment: () => ({ appendChild: () => {} }),
    };
    try {
        return run();
    } finally {
        delete global.document;
    }
}

test('createSimpleSavePayload captures essential fields', () => {
    const game = createGame();
    game.wave = 7;
    game.energy = 54;
    placeTowerOnCell(game, game.bottomCells[0], { color: 'blue', level: 2 });
    placeTowerOnCell(game, game.topCells[1], { color: 'green', level: 3 });

    const payload = createSimpleSavePayload(game);

    assert.equal(payload.wave, 7);
    assert.equal(payload.energy, 54);
    assert.equal(payload.towers.length, 2);
    assert.deepEqual(payload.towers[0], { cellId: 'bottom:0', color: 'blue', level: 2 });
    assert.deepEqual(payload.towers[1], { cellId: 'top:1', color: 'green', level: 3 });
});

test('applySimpleSaveState restores wave, energy, and towers in preparation mode', () => {
    const game = createGame({ attachDom: true });
    game.wave = 2;
    game.energy = 10;
    game.waveInProgress = true;
    game.towers = [];
    game.grid.resetCells();

    const savedState = {
        version: 1,
        wave: 5,
        energy: 120,
        towers: [
            { cellId: 'bottom:2', color: 'purple', level: 2 },
            { cellId: 'top:0', color: 'yellow', level: 1 },
        ],
    };

    const applied = withDocumentStub(() => applySimpleSaveState(game, savedState));

    assert.ok(applied);
    assert.equal(game.wave, 5);
    assert.equal(game.energy, 120);
    assert.equal(game.waveInProgress, false);
    assert.equal(game.towers.length, 2);
    assert.equal(game.nextWaveBtn.disabled, false);
    assert.equal(game.mergeBtn.disabled, false);
    assert.equal(game.grid.bottomCells[2].tower.level, 2);
    assert.equal(game.grid.topCells[0].tower.color, 'yellow');
});

test('applySimpleSaveState rejects invalid payloads', () => {
    const game = createGame();
    const applied = applySimpleSaveState(game, { version: 2 });
    assert.equal(applied, null);
});
