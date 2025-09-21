const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const NOOP_AUDIO = {
    playFire() {},
    playExplosion() {}
};

const DATA_URI_SOUNDS = {
    fire: 'data:audio/wav;base64,UklGRuwNAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YcgNAAAA',
    explosion: 'data:audio/wav;base64,UklGRmwdAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YUgdAAAA'
};

function hasHowler() {
    return Boolean(globalScope && globalScope.Howl && globalScope.Howler);
}

export function isAudioSupported() {
    return hasHowler();
}

export function initializeAudio({ volume = null, autoSuspend = false } = {}) {
    if (!hasHowler()) {
        console.warn('Howler.js library is not available. Audio features are disabled.');
        return false;
    }
    const howler = globalScope.Howler;
    if (typeof autoSuspend === 'boolean') {
        howler.autoSuspend = autoSuspend;
    }
    if (typeof volume === 'number') {
        howler.volume(volume);
    }
    return true;
}

export function getHowler() {
    return hasHowler() ? globalScope.Howler : null;
}

export function createSound(options) {
    if (!hasHowler()) {
        throw new Error('Howler.js is not loaded');
    }
    return new globalScope.Howl(options);
}

export function createGameAudio() {
    if (!hasHowler()) {
        return NOOP_AUDIO;
    }

    const fire = createSound({
        src: [DATA_URI_SOUNDS.fire],
        volume: 0.35,
        preload: true
    });

    const explosion = createSound({
        src: [DATA_URI_SOUNDS.explosion],
        volume: 0.45,
        preload: true
    });

    return {
        playFire() {
            fire.play();
        },
        playExplosion() {
            explosion.play();
        }
    };
}
