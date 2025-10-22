import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from './helpers.js';

let originalHowler;
let originalHowl;
let muteStates;

function createAudioStub() {
    const stub = { playCount: 0, stopCount: 0 };
    stub.playMusic = () => {
        stub.playCount += 1;
    };
    stub.stopMusic = () => {
        stub.stopCount += 1;
    };
    return stub;
}

beforeEach(() => {
    originalHowler = globalThis.Howler;
    originalHowl = globalThis.Howl;
    muteStates = [];
    globalThis.Howler = {
        mute(value) {
            muteStates.push(value);
        },
    };
    globalThis.Howl = function FakeHowl() {};
});

afterEach(() => {
    globalThis.Howler = originalHowler;
    globalThis.Howl = originalHowl;
});

test('setAudioMuted toggles Howler mute and stops music', () => {
    const game = createGame();
    const audio = createAudioStub();
    game.audio = audio;

    game.setAudioMuted(true);

    assert.equal(game.audioMuted, true);
    assert.equal(muteStates[muteStates.length - 1], true);
    assert.equal(audio.stopCount, 1);
});

test('setAudioMuted resumes music when allowed', () => {
    const game = createGame();
    const audio = createAudioStub();
    game.audio = audio;
    game.hasStarted = true;
    game.gameOver = false;

    game.setAudioMuted(true);
    game.setAudioMuted(false);

    assert.equal(game.audioMuted, false);
    assert.equal(muteStates[muteStates.length - 1], false);
    assert.equal(audio.playCount, 1);
    assert.equal(audio.stopCount, 1);
});

test('setMusicEnabled(false) stops background music', () => {
    const game = createGame();
    const audio = createAudioStub();
    game.audio = audio;

    game.setMusicEnabled(false);

    assert.equal(game.musicEnabled, false);
    assert.equal(audio.stopCount, 1);
});

test('setMusicEnabled(true) plays music when game is active', () => {
    const game = createGame();
    const audio = createAudioStub();
    game.audio = audio;
    game.hasStarted = true;
    game.gameOver = false;
    game.audioMuted = false;
    game.musicEnabled = false;

    game.setMusicEnabled(true);

    assert.equal(game.musicEnabled, true);
    assert.equal(audio.playCount, 1);
});
