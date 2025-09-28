import { createSound, isAudioSupported } from './audio.js';

const IMAGE_SOURCES = {
    bg: 'assets/bg_plats.png',
    cell: 'assets/cell_cut.png',
    tower_1r: 'assets/tower_1R.png',
    tower_1b: 'assets/tower_1B.png',
    tower_2r: 'assets/tower_2R.png',
    tower_2b: 'assets/tower_2B.png',
    tower_3r: 'assets/tower_3R.png',
    tower_3b: 'assets/tower_3B.png',
    swarm_r: 'assets/swarm_R.png',
    swarm_b: 'assets/swarm_B.png'
};

const SOUND_OPTIONS = {
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

export async function loadAssets() {
    const imageEntries = await Promise.all(
        Object.entries(IMAGE_SOURCES).map(async ([key, url]) => [key, await loadImage(url)])
    );
    const images = Object.fromEntries(imageEntries);

    let sounds = {};
    if (isAudioSupported()) {
        sounds = Object.fromEntries(
            Object.entries(SOUND_OPTIONS).map(([key, options]) => [key, createSound(options)])
        );
    }

    return {...images, sounds};
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}