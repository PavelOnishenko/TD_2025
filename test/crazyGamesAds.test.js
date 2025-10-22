import test from 'node:test';
import assert from 'node:assert/strict';

const moduleUrl = new URL('../js/systems/crazyGamesAds.js', import.meta.url).href;
let importCounter = 0;

async function importFresh(env = {}) {
    delete global.window;
    delete global.document;
    delete globalThis.CrazyGames;
    delete global.performance;

    if ('window' in env) {
        global.window = env.window;
    }
    if ('CrazyGames' in env) {
        globalThis.CrazyGames = env.CrazyGames;
    }
    if ('performance' in env) {
        global.performance = env.performance;
    }

    return import(`${moduleUrl}?v=${importCounter++}`);
}

test('showCrazyGamesAd returns false when SDK ad API missing', async () => {
    const mod = await importFresh({ window: {} });
    const result = await mod.showCrazyGamesAd();
    assert.equal(result, false);
});

test('showCrazyGamesAd pauses game, resumes, and enforces cooldown', async () => {
    let currentTime = 0;
    const timeSource = () => currentTime;
    const requestCalls = [];
    const windowStub = {
        CrazyGames: {
            SDK: {
                ad: {
                    requestAd: (adType, callbacks) => {
                        requestCalls.push(adType);
                        callbacks?.onOpen?.();
                        callbacks?.onClose?.();
                        return Promise.resolve();
                    },
                },
                game: {
                    gameplayStop: () => {},
                    gameplayStart: () => {},
                },
            },
        },
    };
    const mod = await importFresh({ window: windowStub });
    const game = {
        gameOver: false,
        paused: 0,
        resumed: 0,
        pauseForAd() {
            this.paused += 1;
        },
        resumeAfterAd() {
            this.resumed += 1;
        },
    };

    currentTime = 100;
    const first = await mod.showCrazyGamesAd({ game, cooldownMs: 1000, timeSource });
    assert.equal(first, true);
    assert.equal(game.paused, 1);
    assert.equal(game.resumed, 1);
    assert.deepEqual(requestCalls, ['midgame']);

    currentTime = 500;
    const second = await mod.showCrazyGamesAd({ game, cooldownMs: 1000, timeSource });
    assert.equal(second, false);

    currentTime = 1600;
    const third = await mod.showCrazyGamesAd({ game, cooldownMs: 1000, timeSource });
    assert.equal(third, true);
    assert.equal(game.paused, 2);
    assert.equal(game.resumed, 2);
    assert.equal(requestCalls.length, 2);
});

test('showCrazyGamesAd handles request errors safely', async () => {
    const windowStub = {
        CrazyGames: {
            SDK: {
                ad: {
                    requestAd: () => {
                        throw new Error('network');
                    },
                },
                game: {
                    gameplayStop: () => {},
                    gameplayStart: () => {},
                },
            },
        },
    };
    const mod = await importFresh({ window: windowStub });
    const game = {
        gameOver: false,
        paused: 0,
        resumed: 0,
        pauseForAd() {
            this.paused += 1;
        },
        resumeAfterAd() {
            this.resumed += 1;
        },
    };

    const result = await mod.showCrazyGamesAd({ game });
    assert.equal(result, false);
    assert.equal(game.paused, 0);
    assert.equal(game.resumed, 0);
});
