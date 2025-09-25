import test from 'node:test';
import assert from 'node:assert/strict';

import { tryShoot } from '../src/js/systems/ui.js';

function makeGame({ gold }) {
    const textStub = () => ({ textContent: '' });
    return {
        gold,
        towerCost: 12,
        towers: [],
        audio: {
            playPlaceCalls: 0,
            playPlace() {
                this.playPlaceCalls += 1;
            }
        },
        lives: 5,
        maxWaves: 10,
        wave: 1,
        livesEl: textStub(),
        goldEl: textStub(),
        waveEl: textStub(),
    };
}

test('tryShoot flashes cell and plays audio on successful placement', () => {
    const cell = { x: 10, y: 20, w: 40, h: 24, occupied: false, highlight: 0, highlightColor: null, tower: null };
    const game = makeGame({ gold: 30 });

    tryShoot(game, cell);

    assert.equal(cell.occupied, true);
    assert.ok(cell.tower);
    assert.equal(cell.highlight > 0, true);
    assert.equal(cell.highlightColor, 'rgba(255, 255, 255, 1)');
    assert.equal(game.audio.playPlaceCalls, 1);
    assert.equal(game.gold, 18);
});

test('tryShoot marks cell red without audio when gold is insufficient', () => {
    const cell = { x: 10, y: 20, w: 40, h: 24, occupied: false, highlight: 0, highlightColor: null, tower: null };
    const game = makeGame({ gold: 5 });

    tryShoot(game, cell);

    assert.equal(cell.occupied, false);
    assert.equal(cell.highlight > 0, true);
    assert.equal(cell.highlightColor, 'rgba(248, 113, 113, 1)');
    assert.equal(game.audio.playPlaceCalls, 0);
    assert.equal(game.gold, 5);
});
