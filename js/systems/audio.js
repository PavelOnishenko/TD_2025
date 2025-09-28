const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const NOOP_AUDIO = {
    playFire() {},
    playExplosion() {},
    playPlacement() {},
    playMusic() {},
    stopMusic() {}
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

export function createGameAudio(sounds = {}) {
    if (!hasHowler()) {
        return NOOP_AUDIO;
    }

    const fire = sounds.fire ?? null;
    const explosion = sounds.explosion ?? null;
    const placement = sounds.placement ?? null;
    const backgroundMusic = sounds.backgroundMusic ?? null;

    return {
        playFire() {
            if (fire) {
                console.log('Playing fire sound');
                fire.play();
            }
        },
        playExplosion() {
            if (explosion) {
                console.log('Playing explosion sound');
                explosion.play();
            }
        },
        playPlacement() {
            if (placement) {
                console.log('Playing placement sound');
                placement.play();
            }
        },
        playMusic() {
            if (backgroundMusic && typeof backgroundMusic.play === 'function' &&
                typeof backgroundMusic.playing === 'function' && !backgroundMusic.playing()) {
                backgroundMusic.play();
            }
        },
        stopMusic() {
            if (backgroundMusic && typeof backgroundMusic.playing === 'function' && backgroundMusic.playing()) {
                backgroundMusic.stop();
            }
        }
    };
}