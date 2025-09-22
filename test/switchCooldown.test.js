import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../src/js/core/Game.js';
import Tower from '../src/js/entities/Tower.js';

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

test('switchTowerColor costs gold and respects global cooldown', () => {
    const game = new Game(makeFakeCanvas());
    game.livesEl = { textContent: '' };
    game.goldEl = { textContent: '' };
    game.waveEl = { textContent: '' };
    game.cooldownEl = { textContent: '' };
    game.nextWaveBtn = { disabled: false };
    game.assets = makeAssets();
    const tower = new Tower(0, 0);

    game.gold = game.switchCost + 1;
    assert.equal(game.switchCooldown, 0);
    const first = game.switchTowerColor(tower);
    assert.equal(first, true);
    assert.equal(tower.color, 'blue');
    assert.equal(game.gold, 1);
    assert.equal(game.switchCooldown, game.switchCooldownDuration);

    const second = game.switchTowerColor(tower);
    assert.equal(second, false);
    assert.equal(tower.color, 'blue');
    assert.equal(game.gold, 1);

    const originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => {};
    game.lastTime = 0;
    game.update(2000);
    globalThis.requestAnimationFrame = originalRAF;
    assert.equal(game.switchCooldown, 0);

    game.gold = 0;
    const third = game.switchTowerColor(tower);
    assert.equal(third, false);
    assert.equal(tower.color, 'blue');
    assert.equal(game.gold, 0);

    game.gold = game.switchCost;
    const fourth = game.switchTowerColor(tower);
    assert.equal(fourth, true);
    assert.equal(tower.color, 'red');
    assert.equal(game.gold, 0);
});

test('updateSwitchCooldown decreases timer and updates indicator', () => {
    const game = new Game(makeFakeCanvas());
    game.cooldownEl = { textContent: 'initial' };

    game.switchCooldown = 0;
    game.updateSwitchCooldown(0.2);
    assert.equal(game.switchCooldown, 0);
    assert.equal(game.cooldownEl.textContent, 'initial');

    game.switchCooldown = 0.3;
    game.updateSwitchCooldown(0.1);
    assert.ok(Math.abs(game.switchCooldown - 0.2) < 1e-6);
    assert.equal(game.cooldownEl.textContent, 'Switch: 0.2s');

    game.updateSwitchCooldown(0.5);
    assert.equal(game.switchCooldown, 0);
    assert.equal(game.cooldownEl.textContent, 'Switch: Ready');
});
