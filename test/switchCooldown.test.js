import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/Game.js';
import Tower from '../src/Tower.js';

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

test('switchTowerColor toggles color and respects global cooldown', () => {
    const game = new Game(makeFakeCanvas());
    const tower = new Tower(0, 0);

    assert.equal(game.switchCooldown, 0);
    const first = game.switchTowerColor(tower);
    assert.equal(first, true);
    assert.equal(tower.color, 'blue');
    assert.equal(game.switchCooldown, game.switchCooldownDuration);

    const second = game.switchTowerColor(tower);
    assert.equal(second, false);
    assert.equal(tower.color, 'blue');

    const originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => {};
    game.lastTime = 0;
    game.update(2000);
    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(game.switchCooldown, 0);

    const third = game.switchTowerColor(tower);
    assert.equal(third, true);
    assert.equal(tower.color, 'red');
});
