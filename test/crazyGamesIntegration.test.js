import { test } from 'node:test';
import assert from 'node:assert/strict';
const moduleUrl = new URL('../js/systems/crazyGamesIntegration.js', import.meta.url).href;
let importCounter = 0;

async function importFresh(env = {}) {
    delete global.window;
    delete global.document;
    delete globalThis.CrazyGames;

    if ('window' in env) {
        global.window = env.window;
    }
    if ('document' in env) {
        global.document = env.document;
    }
    if ('CrazyGames' in env) {
        globalThis.CrazyGames = env.CrazyGames;
    }

    const freshModule = await import(`${moduleUrl}?v=${importCounter++}`);
    return freshModule;
}

test('crazyGamesIntegrationAllowed defaults to true without window', async () => {
    const mod = await importFresh();
    assert.equal(mod.crazyGamesIntegrationAllowed, true);
});

test('crazyGamesIntegrationAllowed blocks known hosts and GitHub pages', async () => {
    const blockedWindow = { location: { hostname: 'pavelonishenko.github.io' } };
    let mod = await importFresh({ window: blockedWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, false, 'explicitly blocked host');

    const githubWindow = { location: { hostname: 'example.github.io' } };
    mod = await importFresh({ window: githubWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, false, 'github pages host is blocked');
});

test('callCrazyGamesEvent respects crazyGamesWorks and crazyGamesIntegrationAllowed flags', async () => {
    const windowStub = { location: { hostname: 'example.com' } };
    const mod = await importFresh({ window: windowStub });

    // With crazyGamesWorks false, the SDK should not be called even if provided.
    let called = false;
    global.window.CrazyGames = { SDK: { game: { loadingStart: () => { called = true; } } } };
    mod.callCrazyGamesEvent('sdkGameLoadingStart');
    assert.equal(called, false);

    // Re-import with proper CrazyGames SDK setup and initialize integration.
    const listeners = new Map();
    const readyWindow = {
        location: { hostname: 'example.com' },
        addEventListener: (type, listener) => {
            listeners.set(type, listener);
        },
        CrazyGames: {
            SDK: {
                environment: 'production',
                init: async () => {
                    readyWindow.initCalls = (readyWindow.initCalls ?? 0) + 1;
                },
                game: {
                    loadingStart: () => {
                        readyWindow.eventCalls = (readyWindow.eventCalls ?? 0) + 1;
                    },
                },
            },
        },
    };

    const initializedModule = await importFresh({ window: readyWindow });
    await initializedModule.initializeCrazyGamesIntegration();
    assert.equal(initializedModule.crazyGamesWorks, true);
    initializedModule.callCrazyGamesEvent('sdkGameLoadingStart');
    assert.equal(readyWindow.eventCalls, 1);
    assert.equal(readyWindow.initCalls, 1);
    assert.ok(listeners.has('wheel'));
    assert.ok(listeners.has('keydown'));
});

test('checkCrazyGamesIntegration logs and toggles crazyGamesWorks for disabled SDK', async () => {
    const disabledWindow = {
        location: { hostname: 'example.com' },
        addEventListener: () => {},
        CrazyGames: {
            SDK: {
                environment: 'disabled',
                init: async () => {},
                game: {},
            },
        },
    };
    const mod = await importFresh({ window: disabledWindow });
    const result = mod.checkCrazyGamesIntegration();
    assert.equal(result, false);
    assert.equal(mod.crazyGamesWorks, false);
});
