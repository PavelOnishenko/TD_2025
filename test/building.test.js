import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';
import { bindCanvasClick } from '../src/ui.js';

function makeFakeCanvas() {
    const ctx = {
        fillRect() {},
        clearRect() {},
        beginPath() {},
        arc() {},
        fill() {},
        stroke() {},
        strokeRect() {},
    };
    const handlers = {};
    return {
        width: 800,
        height: 450,
        getContext: () => ctx,
        addEventListener(type, cb) {
            handlers[type] = cb;
        },
        getBoundingClientRect() {
            return { left: 0, top: 0 };
        },
        dispatch(type, evt) {
            handlers[type]?.(evt);
        },
    };
}

function attachDomStubs(game) {
    game.livesEl = { textContent: '' };
    game.goldEl = { textContent: '' };
    game.waveEl = { textContent: '' };
    game.statusEl = { textContent: '', style: {} };
}

test('builds tower when player has enough gold', () => {
    const canvas = makeFakeCanvas();
    const game = new Game(canvas);
    attachDomStubs(game);
    bindCanvasClick(game);

    const cell = game.grid[0];
    canvas.dispatch('click', { clientX: cell.x + 1, clientY: cell.y + 1 });

    assert.equal(game.towers.length, 1);
    assert.equal(cell.occupied, true);
    assert.equal(game.gold, game.initialGold - game.towerCost);
    assert.equal(game.towers[0].level, 1);
});

test('highlights slot when not enough gold', () => {
    const canvas = makeFakeCanvas();
    const game = new Game(canvas);
    attachDomStubs(game);
    game.gold = 0;
    bindCanvasClick(game);

    const cell = game.grid[0];
    let timeoutFn = null;
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = fn => {
        timeoutFn = fn;
        return {};
    };

    canvas.dispatch('click', { clientX: cell.x + 1, clientY: cell.y + 1 });

    assert.equal(game.towers.length, 0);
    assert.equal(cell.occupied, false);
    assert.equal(cell.highlight, true);

    timeoutFn();
    assert.equal(cell.highlight, false);

    globalThis.setTimeout = originalSetTimeout;
});

