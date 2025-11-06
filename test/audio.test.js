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
        assert.equal(typeof audio.playMinigunFire, 'function');
        assert.equal(typeof audio.playRailgunFire, 'function');
        assert.equal(typeof audio.playRocketFire, 'function');
        assert.equal(typeof audio.playMusic, 'function');
        assert.equal(typeof audio.stopMusic, 'function');
        assert.equal(typeof audio.playError, 'function');
        assert.equal(typeof audio.playMatchingHit, 'function');
        assert.equal(typeof audio.playMerge, 'function');
        assert.equal(typeof audio.playMismatchingHit, 'function');
        assert.equal(typeof audio.playMinigunHit, 'function');
        assert.equal(typeof audio.playRailgunHit, 'function');
        assert.equal(typeof audio.playRocketHit, 'function');
        assert.equal(typeof audio.playTowerRemoveCharge, 'function');
        assert.equal(typeof audio.playTowerRemoveCancel, 'function');
        assert.equal(typeof audio.playTowerRemoveExplosion, 'function');

        audio.playFire();
        audio.playMinigunFire();
        audio.playRailgunFire();
        audio.playRocketFire();
        audio.playMusic();
        audio.stopMusic();
        audio.playError();
        audio.playMatchingHit();
        audio.playMerge();
        audio.playMismatchingHit();
        audio.playMinigunHit();
        audio.playRailgunHit();
        audio.playRocketHit();
        audio.playTowerRemoveCharge();
        audio.playTowerRemoveCancel();
        audio.playTowerRemoveExplosion();
    });
});

test('createGameAudio triggers available sounds only', () => {
    class FakeHowl {}
    const fakeHowler = {};

    return runWithHowler(FakeHowl, fakeHowler, () => {
        const fireSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const matchingHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const mismatchingHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const minigunFireSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const railgunFireSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const rocketFireSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const minigunHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const railgunHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const rocketHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const errorSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const mergeSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeChargeSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeCancelSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeExplosionSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const audio = createGameAudio({
            fire: fireSound,
            matchingHit: matchingHitSound,
            mismatchingHit: mismatchingHitSound,
            minigunFire: minigunFireSound,
            railgunFire: railgunFireSound,
            rocketFire: rocketFireSound,
            minigunHit: minigunHitSound,
            railgunHit: railgunHitSound,
            rocketHit: rocketHitSound,
            error: errorSound,
            merge: mergeSound,
            towerRemoveCharge: removeChargeSound,
            towerRemoveCancel: removeCancelSound,
            towerRemoveExplosion: removeExplosionSound
        });

        audio.playFire();
        audio.playMinigunFire();
        audio.playRailgunFire();
        audio.playRocketFire();
        audio.playExplosion();
        audio.playMatchingHit();
        audio.playMismatchingHit();
        audio.playMinigunHit();
        audio.playRailgunHit();
        audio.playRocketHit();
        audio.playPlacement();
        audio.playError();
        audio.playMerge();
        audio.playTowerRemoveCharge();
        audio.playTowerRemoveCancel();
        audio.playTowerRemoveExplosion();

        assert.equal(fireSound.playCalls, 1);
        assert.equal(minigunFireSound.playCalls, 1);
        assert.equal(railgunFireSound.playCalls, 1);
        assert.equal(rocketFireSound.playCalls, 1);
        assert.equal(matchingHitSound.playCalls, 2);
        assert.equal(mismatchingHitSound.playCalls, 1);
        assert.equal(minigunHitSound.playCalls, 1);
        assert.equal(railgunHitSound.playCalls, 1);
        assert.equal(rocketHitSound.playCalls, 1);
        assert.equal(errorSound.playCalls, 1);
        assert.equal(mergeSound.playCalls, 1);
        assert.equal(removeChargeSound.playCalls, 1);
        assert.equal(removeCancelSound.playCalls, 1);
        assert.equal(removeExplosionSound.playCalls, 1);
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
