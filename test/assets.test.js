import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAssets, loadImage } from '../dist/systems/assets.js';

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
        'assets/images/cell_cut.png',
        'assets/images/platform.png',
        'assets/images/Towers/T1R_1.png',
        'assets/images/Towers/T1R_2.png',
        'assets/images/Towers/T1R_3.png',
        'assets/images/Towers/T1R_4.png',
        'assets/images/Towers/T1R_5.png',
        'assets/images/Towers/T1R_6.png',
        'assets/images/Towers/T1R_7.png',
        'assets/images/Towers/T1R_8.png',
        'assets/images/Towers/T1B_1.png',
        'assets/images/Towers/T1B_2.png',
        'assets/images/Towers/T1B_3.png',
        'assets/images/Towers/T1B_4.png',
        'assets/images/Towers/T1B_5.png',
        'assets/images/Towers/T1B_6.png',
        'assets/images/Towers/T1B_7.png',
        'assets/images/Towers/T1B_8.png',
        'assets/images/Towers/tower_2R.png',
        'assets/images/Towers/tower_2B.png',
        'assets/images/Towers/tower_3R.png',
        'assets/images/Towers/tower_3B.png',
        'assets/images/Towers/tower_4R.png',
        'assets/images/Towers/tower_4B.png',
        'assets/images/Towers/tower_5R.png',
        'assets/images/Towers/tower_5B.png',
        'assets/images/Towers/tower_6R.png',
        'assets/images/Towers/tower_6B.png',
        'assets/images/tank_R.png',
        'assets/images/tank_B.png',
        'assets/images/swarm_R.png',
        'assets/images/swarm_B.png'
    ]);
    assert.deepEqual(soundCreatorCalls, [
        'assets/sound/tower_fire_1.mp3',
        'assets/sound/tower_fire_2.mp3',
        'assets/sound/tower_fire_3.mp3',
        'assets/sound/tower_fire_4.mp3',
        'assets/sound/tower_fire_5.mp3',
        'assets/sound/tower_fire_6.mp3',
        'assets/sound/tower_hit_1.mp3',
        'assets/sound/tower_hit_2.mp3',
        'assets/sound/tower_hit_3.mp3',
        'assets/sound/tower_hit_4.mp3',
        'assets/sound/tower_hit_5.mp3',
        'assets/sound/tower_hit_6.mp3',
        'assets/sound/explosion.wav',
        'assets/sound/placement.mp3',
        'assets/sound/merge.mp3',
        'assets/sound/color_switch.mp3',
        'assets/sound/explosion.wav',
        'assets/sound/error.wav',
        'assets/sound/tower_remove_charge.mp3',
        'assets/sound/tower_remove_cancel.mp3',
        'assets/sound/tower_remove_explosion.mp3',
        'assets/sound/portal_spawn.mp3',
        'assets/sound/background_music.mp3'
    ]);
    assert.equal(typeof assets.sounds, 'object');
    assert.deepEqual(Object.keys(assets.sounds), [
        'tower_fire_1',
        'tower_fire_2',
        'tower_fire_3',
        'tower_fire_4',
        'tower_fire_5',
        'tower_fire_6',
        'tower_hit_1',
        'tower_hit_2',
        'tower_hit_3',
        'tower_hit_4',
        'tower_hit_5',
        'tower_hit_6',
        'explosion',
        'placement',
        'merge',
        'colorSwitch',
        'baseHit',
        'error',
        'towerRemoveCharge',
        'towerRemoveCancel',
        'towerRemoveExplosion',
        'portalSpawn',
        'backgroundMusic'
    ]);
    for (let level = 1; level <= 6; level++) {
        assert.deepEqual(assets.sounds[`tower_fire_${level}`], { sound: `assets/sound/tower_fire_${level}.mp3` });
        assert.deepEqual(assets.sounds[`tower_hit_${level}`], { sound: `assets/sound/tower_hit_${level}.mp3` });
    }
    assert.deepEqual(assets.sounds.baseHit, { sound: 'assets/sound/explosion.wav' });
    assert.deepEqual(assets.sounds.merge, { sound: 'assets/sound/merge.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveCharge, { sound: 'assets/sound/tower_remove_charge.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveCancel, { sound: 'assets/sound/tower_remove_cancel.mp3' });
    assert.deepEqual(assets.sounds.towerRemoveExplosion, { sound: 'assets/sound/tower_remove_explosion.mp3' });
    assert.deepEqual(assets.sounds.portalSpawn, { sound: 'assets/sound/portal_spawn.mp3' });
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
            if (url === 'assets/images/platform.png') {
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
            if (options.src[0] === 'assets/sound/merge.mp3') {
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
