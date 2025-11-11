import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
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

test('crazyGamesIntegrationAllowed allows configured preview host while blocking others', async () => {
    const previewWindow = { location: { hostname: 'pavelonishenko.github.io' } };
    let mod = await importFresh({ window: previewWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, true, 'preview host allowed for testing');

    const githubWindow = { location: { hostname: 'example.github.io' } };
    mod = await importFresh({ window: githubWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, false, 'other github pages hosts remain blocked');
});

test('crazyGamesIntegrationAllowed only permits CrazyGames or local development hosts', async () => {
    const crazyGamesWindow = { location: { hostname: 'cubes-2048-io.game-files.crazygames.com' } };
    let mod = await importFresh({ window: crazyGamesWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, true, 'CrazyGames CDN host allowed');

    const localWindow = { location: { hostname: 'localhost' } };
    mod = await importFresh({ window: localWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, true, 'localhost allowed for development');

    const otherWindow = { location: { hostname: 'example.com' } };
    mod = await importFresh({ window: otherWindow });
    assert.equal(mod.crazyGamesIntegrationAllowed, false, 'non-approved host blocked');
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
        location: { hostname: 'cubes-2048-io.game-files.crazygames.com' },
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

    readyWindow.CrazyGames.SDK.game = {};
    assert.doesNotThrow(() => {
        initializedModule.callCrazyGamesEvent('sdkGameLoadingStop');
    });
});

test('initializeCrazyGamesIntegration handles sdkDisabled errors gracefully', async () => {
    const disabledError = Object.assign(new Error('CrazySDK is disabled on this domain.'), { code: 'sdkDisabled' });
    const disabledWindow = {
        location: { hostname: 'cubes-2048-io.game-files.crazygames.com' },
        addEventListener: () => {},
        CrazyGames: {
            SDK: {
                environment: 'disabled',
                init: async () => { throw disabledError; },
                game: {},
            },
        },
    };

    const mod = await importFresh({ window: disabledWindow });
    await mod.initializeCrazyGamesIntegration();
    assert.equal(mod.crazyGamesWorks, false);
});

test('checkCrazyGamesIntegration logs and toggles crazyGamesWorks for disabled SDK', async () => {
    const disabledWindow = {
        location: { hostname: 'cubes-2048-io.game-files.crazygames.com' },
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
