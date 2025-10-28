import { createSound, isAudioSupported } from './audio.js';

const IMAGE_SOURCES = {
    base: 'assets/base.png',
    cell: 'assets/cell_cut.png',
    platform: 'assets/platform.png',
    tower_1r: 'assets/tower_1R.png',
    tower_1b: 'assets/tower_1B.png',
    tower_2r: 'assets/tower_2R.png',
    tower_2b: 'assets/tower_2B.png',
    tower_3r: 'assets/tower_3R.png',
    tower_3b: 'assets/tower_3B.png',
    tank_r: 'assets/tank_R.png',
    tank_b: 'assets/tank_B.png',
    swarm_r: 'assets/swarm_R.png',
    swarm_b: 'assets/swarm_B.png'
};

const SOUND_OPTIONS = {
    fire: {
        src: ['assets/fire.wav'],
        volume: 0.6,
        preload: true
    },
    matchingHit: {
        src: ['assets/explosion.wav'],
        volume: 0.25,
        rate: 3.5,
        preload: true
    },
    mismatchingHit: {
        src: ['assets/explosion.wav'],
        volume: 0.2,
        rate: 0.5,
        preload: true
    },
    explosion: {
        src: ['assets/explosion.wav'],
        volume: 0.25,
        preload: true
    },
    placement: {
        src: ['assets/placement.wav'],
        volume: 0.4,
        preload: true
    },
    merge: {
        src: ['assets/merge.mp3'],
        volume: 1,
        rate: 1.6,
        preload: true
    },
    colorSwitch: {
        src: ['assets/color_switch.mp3'],
        volume: 1,
    },
    baseHit: {
        src: ['assets/explosion.wav'],
        volume: 0.18,
        preload: true
    },
    error: {
        src: ['assets/error.wav'],
        volume: 0.5,
        preload: true
    },
    backgroundMusic: {
        src: ['assets/background_music.mp3'],
        volume: 0.25,
        preload: true,
        loop: true
    }
};

const DEFAULT_IMAGE_FACTORY = () => {
    if (typeof Image === 'undefined') {
        throw new Error('Image constructor is not available');
    }
    return new Image();
};

const TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/58BAQMDgQm0n98AAAAASUVORK5CYII=';

const loggedAssetWarnings = new Set();

function logAssetWarning(assetType, key, error, action = 'Using fallback.') {
    const cacheKey = `${assetType}:${key}`;
    if (loggedAssetWarnings.has(cacheKey)) {
        return;
    }
    loggedAssetWarnings.add(cacheKey);
    const details = error && error.message ? ` (${error.message})` : '';
    const suffix = action ? ` ${action}` : '';
    console.warn(`Failed to load ${assetType} asset "${key}".${suffix}${details}`);
}

function createTransparentImage() {
    try {
        const image = DEFAULT_IMAGE_FACTORY();
        image.src = TRANSPARENT_PIXEL;
        image.__tdFallback = true;
        if (!image.width) {
            image.width = 1;
        }
        if (!image.height) {
            image.height = 1;
        }
        return image;
    } catch {
        return { src: TRANSPARENT_PIXEL, __tdFallback: true, width: 1, height: 1 };
    }
}

function getTransparentImage() {
    if (!getTransparentImage.cached) {
        getTransparentImage.cached = createTransparentImage();
    }
    return getTransparentImage.cached;
}

function handleImageLoadFailure(key, error) {
    logAssetWarning('image', key, error);
    return getTransparentImage();
}

export async function loadAssets({
    loadImageFn = loadImage,
    audioSupportChecker = isAudioSupported,
    soundCreator = createSound
} = {}) {
    const imageEntries = await Promise.all(
        Object.entries(IMAGE_SOURCES).map(async ([key, url]) => {
            try {
                const image = await loadImageFn(url);
                return [key, image];
            } catch (error) {
                const fallbackImage = handleImageLoadFailure(key, error);
                return [key, fallbackImage];
            }
        })
    );
    const images = Object.fromEntries(imageEntries);

    const audioSupported = audioSupportChecker();
    if (!audioSupported) {
        return { ...images, sounds: {} };
    }

    const soundEntries = [];
    for (const [key, options] of Object.entries(SOUND_OPTIONS)) {
        try {
            const sound = soundCreator(options);
            soundEntries.push([key, sound]);
        } catch (error) {
            logAssetWarning('sound', key, error, 'Sound will be disabled.');
        }
    }
    const sounds = Object.fromEntries(soundEntries);

    return { ...images, sounds };
}

export function loadImage(url, createImage = DEFAULT_IMAGE_FACTORY) {
    return new Promise((resolve, reject) => {
        const img = createImage();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}