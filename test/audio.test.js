import test from 'node:test';
import assert from 'node:assert/strict';

import { createGameAudio, createSound, getHowler, initializeAudio, isAudioSupported } from '../js/systems/audio.js';

test('initializeAudio returns false when howler is missing', () => {
    const originalHowl = globalThis.Howl;
    const originalHowler = globalThis.Howler;
    delete globalThis.Howl;
    delete globalThis.Howler;

    assert.equal(isAudioSupported(), false);
    assert.equal(initializeAudio(), false);
    assert.equal(getHowler(), null);

    if (originalHowl) {
        globalThis.Howl = originalHowl;
    } else {
        delete globalThis.Howl;
    }
    if (originalHowler) {
        globalThis.Howler = originalHowler;
    } else {
        delete globalThis.Howler;
    }
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

    const originalHowl = globalThis.Howl;
    const originalHowler = globalThis.Howler;
    globalThis.Howl = FakeHowl;
    globalThis.Howler = fakeHowler;

    try {
        assert.equal(isAudioSupported(), true);
        assert.equal(initializeAudio(), true);
        const sound = createSound({ src: ['sound.ogg'], loop: true });
        assert.ok(sound instanceof FakeHowl);
        assert.deepEqual(sound.options, { src: ['sound.ogg'], loop: true });
        assert.equal(fakeHowler.autoSuspend, false);
    } finally {
        if (originalHowl) {
            globalThis.Howl = originalHowl;
        } else {
            delete globalThis.Howl;
        }
        if (originalHowler) {
            globalThis.Howler = originalHowler;
        } else {
            delete globalThis.Howler;
        }
    }
});

test('createGameAudio exposes playError when howler is available', () => {
    class FakeHowl {}
    const fakeHowler = {};

    const originalHowl = globalThis.Howl;
    const originalHowler = globalThis.Howler;
    globalThis.Howl = FakeHowl;
    globalThis.Howler = fakeHowler;

    const errorSound = { played: false, play() { this.played = true; } };

    try {
        const audio = createGameAudio({ error: errorSound });
        assert.equal(typeof audio.playError, 'function');
        audio.playError();
        assert.equal(errorSound.played, true);
    } finally {
        if (originalHowl) {
            globalThis.Howl = originalHowl;
        } else {
            delete globalThis.Howl;
        }
        if (originalHowler) {
            globalThis.Howler = originalHowler;
        } else {
            delete globalThis.Howler;
        }
    }
});
