import { createSound, isAudioSupported } from './audio.js';

export const IMAGE_SOURCES = {
    cell: 'assets/cell_cut.png',
    platform: 'assets/platform.png',
    tower_1r: 'assets/tower_1R.png',
    tower_1b: 'assets/tower_1B.png',
    tower_2r: 'assets/tower_2R.png',
    tower_2b: 'assets/tower_2B.png',
    tower_3r: 'assets/tower_3R.png',
    tower_3b: 'assets/tower_3B.png',
    swarm_r: 'assets/swarm_R.png',
    swarm_b: 'assets/swarm_B.png'
};

export const SOUND_OPTIONS = {
    fire: {
        src: ['assets/fire.wav'],
        volume: 0.8,
        preload: true
    },
    explosion: {
        src: ['assets/explosion.wav'],
        volume: 0.05,
        preload: true
    },
    placement: {
        src: ['assets/placement.wav'],
        volume: 0.4,
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

export async function loadAssets({
    imageLoader = loadImageResource,
    soundFactory = createSound,
    audioCheck = isAudioSupported
} = {}) {
    const images = await loadImageCollection(imageLoader);
    const sounds = audioCheck() ? buildSoundMap(soundFactory) : {};

    return { ...images, sounds };
}

async function loadImageCollection(imageLoader) {
    const entries = await Promise.all(
        Object.entries(IMAGE_SOURCES).map(async ([key, url]) => {
            const image = await imageLoader(url);
            return [key, image];
        })
    );
    return Object.fromEntries(entries);
}

function buildSoundMap(soundFactory) {
    const entries = Object.entries(SOUND_OPTIONS).map(([key, options]) => {
        const sound = soundFactory(options);
        return [key, sound];
    });
    return Object.fromEntries(entries);
}

export function loadImageResource(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });
}
