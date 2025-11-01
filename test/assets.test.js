import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAssets, loadImage } from '../js/systems/assets.js';

class StubImage {
    constructor() {
        this._src = null;
        this.onload = null;
        this.onerror = null;
    }

    set src(value) {
        this._src = value;
    }

    get src() {
        return this._src;
    }

    triggerLoad() {
        if (this.onload) {
            this.onload();
        }
    }

    triggerError(error) {
        if (this.onerror) {
            this.onerror(error);
        }
    }
}

test('loadImage resolves with the created image on load', async () => {
    const image = new StubImage();
    const promise = loadImage('assets/example.png', () => image);

    image.triggerLoad();

    const loadedImage = await promise;

    assert.equal(loadedImage, image);
    assert.equal(image.src, 'assets/example.png');
});

test('loadImage rejects when the image reports an error', async () => {
    const image = new StubImage();
    const promise = loadImage('assets/missing.png', () => image);
    const failure = new Error('Failed to load image');

    image.triggerError(failure);

    await assert.rejects(promise, failure);
    assert.equal(image.src, 'assets/missing.png');
});

test('loadAssets returns sounds only when audio is supported', async () => {
    const createdImages = [];
    const loadImageFn = (url) => {
        createdImages.push(url);
        return Promise.resolve(`image:${url}`);
    };
    const soundCreatorCalls = [];
    const soundCreator = (options) => {
        soundCreatorCalls.push(options.src[0]);
        return { sound: options.src[0] };
    };

    const assets = await loadAssets({
        loadImageFn,
        audioSupportChecker: () => true,
        soundCreator
    });

    assert.deepEqual(createdImages, [
        'assets/cell_cut.png',
        'assets/platform.png',
        'assets/tower_1R.png',
        'assets/tower_1B.png',
        'assets/tower_2R.png',
        'assets/tower_2B.png',
        'assets/tower_3R.png',
        'assets/tower_3B.png',
        'assets/tank_R.png',
        'assets/tank_B.png',
        'assets/swarm_R.png',
        'assets/swarm_B.png'
    ]);
    assert.deepEqual(soundCreatorCalls, [
        'assets/fire.wav',
        'assets/explosion.wav',
        'assets/explosion.wav',
        'assets/explosion.wav',
        'assets/placement.wav',
        'assets/merge.mp3',
        'assets/color_switch.mp3',
        'assets/explosion.wav',
        'assets/error.wav',
        'assets/tower_remove_charge.mp3',
        'assets/tower_remove_cancel.mp3',
        'assets/tower_remove_explosion.mp3',
        'assets/background_music.mp3'
    ]);
    assert.equal(typeof assets.sounds, 'object');
    assert.deepEqual(Object.keys(assets.sounds), [
        'fire',
        'matchingHit',
        'mismatchingHit',
        'explosion',
        'placement',
        'merge',
        'colorSwitch',
        'baseHit',
        'error',
        'towerRemoveCharge',
        'towerRemoveCancel',
        'towerRemoveExplosion',
        'backgroundMusic'
    ]);
    assert.deepEqual(assets.sounds.fire, { sound: 'assets/fire.wav' });
    assert.deepEqual(assets.sounds.baseHit, { sound: 'assets/explosion.wav' });
    assert.deepEqual(assets.sounds.merge, { sound: 'assets/merge.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveCharge, { sound: 'assets/tower_remove_charge.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveCancel, { sound: 'assets/tower_remove_cancel.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveExplosion, { sound: 'assets/tower_remove_explosion.mp3' });
});

test('loadAssets skips sounds when audio is not supported', async () => {
    const loadImageFn = () => Promise.resolve('image');
    let soundCreatorInvocations = 0;

    const assets = await loadAssets({
        loadImageFn,
        audioSupportChecker: () => false,
        soundCreator: () => {
            soundCreatorInvocations += 1;
            return {};
        }
    });

    assert.deepEqual(assets.sounds, {});
    assert.equal(soundCreatorInvocations, 0);
});

test('loadAssets uses transparent fallback image and warns once when an image fails', async () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);

    try {
        const loadImageFn = (url) => {
            if (url === 'assets/platform.png') {
                return Promise.reject(new Error('Missing platform texture'));
            }
            return Promise.resolve({ src: url });
        };

        const assets = await loadAssets({
            loadImageFn,
            audioSupportChecker: () => false
        });

        assert.equal(assets.platform.src, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/58BAQMDgQm0n98AAAAASUVORK5CYII=');
        assert.equal(warnings.filter((message) => message.includes('platform')).length, 1);
    } finally {
        console.warn = originalWarn;
    }
});

test('loadAssets skips sounds that fail to initialize and warns once', async () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);

    try {
        const loadImageFn = (url) => Promise.resolve({ src: url });
        const soundCreator = (options) => {
            if (options.src[0] === 'assets/merge.mp3') {
                throw new Error('Missing merge sound');
            }
            return { sound: options.src[0] };
        };

        const assets = await loadAssets({
            loadImageFn,
            audioSupportChecker: () => true,
            soundCreator
        });

        assert.equal(Object.prototype.hasOwnProperty.call(assets.sounds, 'merge'), false);
        assert.equal(warnings.filter((message) => message.includes('merge')).length, 1);
    } finally {
        console.warn = originalWarn;
    }
});
