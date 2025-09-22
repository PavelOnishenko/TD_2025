import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/js/core/Game.js';
import { updateSwitchIndicator } from '../src/js/systems/ui.js';

function makeFakeCanvas() {
    return {
        width: 450,
        height: 800,
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            strokeRect: () => {},
            drawImage: () => {},
            fillText: () => {},
        }),
    };
}

function makeAssets() {
    return new Proxy({ cell: {} }, {
        get(target, prop) {
            if (!(prop in target)) {
                target[prop] = {};
            }
            return target[prop];
        }
    });
}

test('updateSwitchIndicator shows remaining cooldown or ready', () => {
    const game = { switchCooldown: 1.234, cooldownEl: { textContent: '' } };
    updateSwitchIndicator(game);
    assert.equal(game.cooldownEl.textContent, 'Switch: 1.2s');
    game.switchCooldown = 0;
    updateSwitchIndicator(game);
    assert.equal(game.cooldownEl.textContent, 'Switch: Ready');
});

test('Game.update refreshes cooldown indicator', () => {
    const game = new Game(makeFakeCanvas());
    game.cooldownEl = { textContent: '' };
    game.assets = makeAssets();
    game.switchCooldown = 1;
    const originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => {};
    game.lastTime = 0;
    game.update(1000);
    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(game.cooldownEl.textContent, 'Switch: Ready');
});
