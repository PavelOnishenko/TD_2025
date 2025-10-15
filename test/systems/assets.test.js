import test from 'node:test';
import assert from 'node:assert/strict';

import {
    IMAGE_SOURCES,
    SOUND_OPTIONS,
    loadAssets,
    loadImageResource
} from '../../js/systems/assets.js';

function createFakeSoundFactory(collectedOptions) {
    return function fakeSoundFactory(options) {
        collectedOptions.push(options);
        return { options };
    };
}

function createTrackingImageLoader(target) {
    return async (url) => {
        target.push(url);
        return { url };
    };
}

function mapEntriesToObject(entries, mapper) {
    return Object.fromEntries(entries.map(([key, value]) => [key, mapper(value)]));
}

test('loadAssets loads every image and sound when audio is supported', async () => {
    const requestedImages = [];
    const soundOptions = [];
    const imageEntries = Object.entries(IMAGE_SOURCES);
    const soundEntries = Object.entries(SOUND_OPTIONS);

    const assets = await loadAssets({
        imageLoader: createTrackingImageLoader(requestedImages),
        soundFactory: createFakeSoundFactory(soundOptions),
        audioCheck: () => true
    });

    const expectedImages = mapEntriesToObject(imageEntries, (url) => ({ url }));
    const expectedSounds = mapEntriesToObject(soundEntries, (options) => ({ options }));

    assert.deepEqual(requestedImages, imageEntries.map(([, url]) => url));
    assert.deepEqual(soundOptions, soundEntries.map(([, options]) => options));
    assert.deepEqual(assets, { ...expectedImages, sounds: expectedSounds });
});

test('loadAssets returns only images when audio is not supported', async () => {
    let soundFactoryCalls = 0;
    const fakeSoundFactory = () => {
        soundFactoryCalls += 1;
        return null;
    };
    const assets = await loadAssets({
        imageLoader: async (url) => ({ id: url }),
        soundFactory: fakeSoundFactory,
        audioCheck: () => false
    });

    const imageEntries = Object.entries(IMAGE_SOURCES);
    const expectedImages = Object.fromEntries(
        imageEntries.map(([key, url]) => [key, { id: url }])
    );

    assert.deepEqual(assets, { ...expectedImages, sounds: {} });
    assert.equal(soundFactoryCalls, 0);
});

function runWithFakeImage(fakeImageClass, runner) {
    const previousImage = globalThis.Image;
    globalThis.Image = fakeImageClass;
    try {
        return runner();
    } finally {
        if (typeof previousImage === 'undefined') {
            delete globalThis.Image;
        } else {
            globalThis.Image = previousImage;
        }
    }
}

test('loadImageResource resolves with the image instance on load', async () => {
    class SuccessfulImage {
        constructor() {
            this.onload = null;
            this.onerror = null;
        }

        set src(value) {
            this._src = value;
            queueMicrotask(() => {
                if (this.onload) {
                    this.onload();
                }
            });
        }
    }

    await runWithFakeImage(SuccessfulImage, async () => {
        const image = await loadImageResource('path/to/image.png');
        assert.ok(image instanceof SuccessfulImage);
        assert.equal(image._src, 'path/to/image.png');
    });
});

test('loadImageResource rejects when loading fails', async () => {
    class FailingImage {
        constructor() {
            this.onload = null;
            this.onerror = null;
        }

        set src(value) {
            this._src = value;
            queueMicrotask(() => {
                if (this.onerror) {
                    this.onerror(new Error('failed to load'));
                }
            });
        }
    }

    await runWithFakeImage(FailingImage, async () => {
        await assert.rejects(
            loadImageResource('broken/path.png'),
            new Error('failed to load')
        );
    });
});
