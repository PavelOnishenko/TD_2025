import test from 'node:test';
import assert from 'node:assert/strict';

import { createGameAudio, createSound, getHowler, initializeAudio, isAudioSupported } from '../js/systems/audio.js';

function captureHowlerState() {
    return {
        hasHowl: Object.prototype.hasOwnProperty.call(globalThis, 'Howl'),
        howl: globalThis.Howl,
        hasHowler: Object.prototype.hasOwnProperty.call(globalThis, 'Howler'),
        howler: globalThis.Howler
    };
}

function restoreHowlerState(state) {
    if (state.hasHowl) {
        globalThis.Howl = state.howl;
    } else {
        delete globalThis.Howl;
    }
    if (state.hasHowler) {
        globalThis.Howler = state.howler;
    } else {
        delete globalThis.Howler;
    }
}

function runWithHowler(howl, howler, runner) {
    const snapshot = captureHowlerState();
    if (typeof howl === 'undefined') {
        delete globalThis.Howl;
    } else {
        globalThis.Howl = howl;
    }
    if (typeof howler === 'undefined') {
        delete globalThis.Howler;
    } else {
        globalThis.Howler = howler;
    }
    try {
        return runner();
    } finally {
        restoreHowlerState(snapshot);
    }
}

function runWithoutHowler(runner) {
    return runWithHowler(undefined, undefined, runner);
}

test('initializeAudio returns false when howler is missing', () => {
    return runWithoutHowler(() => {
        let warnCalls = 0;
        const originalWarn = console.warn;
        console.warn = () => {
            warnCalls += 1;
        };

        try {
            assert.equal(isAudioSupported(), false);
            assert.equal(initializeAudio(), false);
            assert.equal(getHowler(), null);
            assert.equal(warnCalls, 1);
        } finally {
            console.warn = originalWarn;
        }
    });
});

test('initializeAudio configures howler when available', () => {
    class FakeHowl {
        constructor(options) {
            this.options = options;
        }
    }
    const volumeCalls = [];
    const fakeHowler = {
        autoSuspend: false,
        volume(value) {
            volumeCalls.push(value);
        }
    };

    return runWithHowler(FakeHowl, fakeHowler, () => {
        assert.equal(isAudioSupported(), true);
        assert.equal(getHowler(), fakeHowler);

        const initialized = initializeAudio({ autoSuspend: true, volume: 0.5 });

        assert.equal(initialized, true);
        assert.equal(fakeHowler.autoSuspend, true);
        assert.deepEqual(volumeCalls, [0.5]);
    });
});

test('createSound throws when howler is not available', () => {
    return runWithoutHowler(() => {
        assert.throws(() => {
            createSound({ src: ['missing.ogg'] });
        }, new Error('Howler.js is not loaded'));
    });
});

test('createSound uses the active Howl constructor', () => {
    class FakeHowl {
        constructor(options) {
            this.options = options;
        }
    }
    const fakeHowler = {
        autoSuspend: true,
        volume: () => {}
    };

    return runWithHowler(FakeHowl, fakeHowler, () => {
        assert.equal(isAudioSupported(), true);
        assert.equal(initializeAudio(), true);

        const sound = createSound({ src: ['sound.ogg'], loop: true });

        assert.ok(sound instanceof FakeHowl);
        assert.deepEqual(sound.options, { src: ['sound.ogg'], loop: true });
        assert.equal(fakeHowler.autoSuspend, false);
    });
});

test('createGameAudio returns noop audio when howler is unavailable', () => {
    return runWithoutHowler(() => {
        const fireSound = { play() { throw new Error('Should not play'); } };

        const audio = createGameAudio({ fire: fireSound });

        assert.equal(typeof audio.playFire, 'function');
        assert.equal(typeof audio.playMusic, 'function');
        assert.equal(typeof audio.stopMusic, 'function');
        assert.equal(typeof audio.playError, 'function');
        assert.equal(typeof audio.playMatchingHit, 'function');
        assert.equal(typeof audio.playMismatchingHit, 'function');

        audio.playFire();
        audio.playMusic();
        audio.stopMusic();
        audio.playError();
        audio.playMatchingHit();
        audio.playMismatchingHit();
    });
});

test('createGameAudio triggers available sounds only', () => {
    class FakeHowl {}
    const fakeHowler = {};

    return runWithHowler(FakeHowl, fakeHowler, () => {
        const fireSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const matchingHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const mismatchingHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const errorSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const audio = createGameAudio({
            fire: fireSound,
            matchingHit: matchingHitSound,
            mismatchingHit: mismatchingHitSound,
            error: errorSound
        });

        audio.playFire();
        audio.playExplosion();
        audio.playMatchingHit();
        audio.playMismatchingHit();
        audio.playPlacement();
        audio.playError();

        assert.equal(fireSound.playCalls, 1);
        assert.equal(matchingHitSound.playCalls, 2);
        assert.equal(mismatchingHitSound.playCalls, 1);
        assert.equal(errorSound.playCalls, 1);
    });
});

test('createGameAudio controls background music lifecycle', () => {
    class FakeHowl {}
    const fakeHowler = {};

    return runWithHowler(FakeHowl, fakeHowler, () => {
        let playCount = 0;
        let stopCount = 0;
        let playingState = false;
        const backgroundMusic = {
            play() {
                playCount += 1;
                playingState = true;
            },
            playing() {
                return playingState;
            },
            stop() {
                stopCount += 1;
                playingState = false;
            }
        };

        const audio = createGameAudio({ backgroundMusic });

        audio.playMusic();
        audio.playMusic();
        audio.stopMusic();
        audio.stopMusic();
        audio.playMusic();

        assert.equal(playCount, 2);
        assert.equal(stopCount, 1);
    });
});
