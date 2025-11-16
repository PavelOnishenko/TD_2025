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

        const audio = createGameAudio({ tower_fire_1: fireSound });

        assert.equal(typeof audio.playTowerFire, 'function');
        assert.equal(typeof audio.playTowerHit, 'function');
        assert.equal(typeof audio.playMusic, 'function');
        assert.equal(typeof audio.stopMusic, 'function');
        assert.equal(typeof audio.playError, 'function');
        assert.equal(typeof audio.playMerge, 'function');
        assert.equal(typeof audio.playPlacement, 'function');
        assert.equal(typeof audio.playColorSwitch, 'function');
        assert.equal(typeof audio.playBaseHit, 'function');
        assert.equal(typeof audio.playTowerRemoveCharge, 'function');
        assert.equal(typeof audio.playTowerRemoveCancel, 'function');
        assert.equal(typeof audio.playTowerRemoveExplosion, 'function');
        assert.equal(typeof audio.playPortalSpawn, 'function');

        audio.playTowerFire(1);
        audio.playTowerHit(1);
        audio.playMusic();
        audio.stopMusic();
        audio.playError();
        audio.playMerge();
        audio.playPlacement();
        audio.playColorSwitch();
        audio.playBaseHit();
        audio.playTowerRemoveCharge();
        audio.playTowerRemoveCancel();
        audio.playTowerRemoveExplosion();
        audio.playPortalSpawn();
    });
});

test('createGameAudio triggers available sounds only', () => {
    class FakeHowl {}
    const fakeHowler = {};

    return runWithHowler(FakeHowl, fakeHowler, () => {
        const createSoundStub = () => ({ playCalls: 0, play() { this.playCalls += 1; } });
        const towerFireSounds = Array.from({ length: 6 }, () => createSoundStub());
        const towerHitSounds = Array.from({ length: 6 }, () => createSoundStub());
        const errorSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const mergeSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const placementSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const colorSwitchSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeChargeSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeCancelSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const removeExplosionSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const explosionSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const baseHitSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const portalSpawnSound = { playCalls: 0, play() { this.playCalls += 1; } };
        const sounds = {
            explosion: explosionSound,
            merge: mergeSound,
            placement: placementSound,
            colorSwitch: colorSwitchSound,
            error: errorSound,
            towerRemoveCharge: removeChargeSound,
            towerRemoveCancel: removeCancelSound,
            towerRemoveExplosion: removeExplosionSound,
            baseHit: baseHitSound,
            portalSpawn: portalSpawnSound,
        };
        towerFireSounds.forEach((sound, index) => {
            sounds[`tower_fire_${index + 1}`] = sound;
        });
        towerHitSounds.forEach((sound, index) => {
            sounds[`tower_hit_${index + 1}`] = sound;
        });
        const audio = createGameAudio(sounds);

        for (let i = 1; i <= 6; i++) {
            audio.playTowerFire(i);
            audio.playTowerHit(i);
        }
        audio.playTowerFire(12);
        audio.playTowerHit(0);
        audio.playExplosion();
        audio.playPlacement();
        audio.playColorSwitch();
        audio.playPlacement();
        audio.playError();
        audio.playMerge();
        audio.playTowerRemoveCharge();
        audio.playTowerRemoveCancel();
        audio.playTowerRemoveExplosion();
        audio.playBaseHit();
        audio.playPortalSpawn();

        towerFireSounds.forEach((sound, index) => {
            const expected = index === towerFireSounds.length - 1 ? 2 : 1;
            assert.equal(sound.playCalls, expected);
        });
        towerHitSounds.forEach((sound, index) => {
            const expected = index === 0 ? 2 : 1;
            assert.equal(sound.playCalls, expected);
        });
        assert.equal(explosionSound.playCalls, 1);
        assert.equal(placementSound.playCalls, 2);
        assert.equal(colorSwitchSound.playCalls, 1);
        assert.equal(errorSound.playCalls, 1);
        assert.equal(mergeSound.playCalls, 1);
        assert.equal(removeChargeSound.playCalls, 1);
        assert.equal(removeCancelSound.playCalls, 1);
        assert.equal(removeExplosionSound.playCalls, 1);
        assert.equal(baseHitSound.playCalls, 1);
        assert.equal(portalSpawnSound.playCalls, 1);
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
