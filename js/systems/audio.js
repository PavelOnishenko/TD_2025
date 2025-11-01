const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const NOOP_AUDIO = {
    playFire() {},
    playExplosion() {},
    playMerge() {},
    playMatchingHit() {},
    playMismatchingHit() {},
    playPlacement() {},
    playColorSwitch() {},
    playMusic() {},
    stopMusic() {},
    playError() {},
    playBaseHit() {},
    playTowerRemoveCharge() {},
    playTowerRemoveCancel() {},
    playTowerRemoveExplosion() {},
    playPortalSpawn() {}
};

function hasHowler() {
    return Boolean(globalScope && globalScope.Howl && globalScope.Howler);
}

function createSoundTrigger(sound) {
    return function triggerSound() {
        if (!sound) {
            return;
        }
        sound.play();
    };
}

function hasCallable(target, methodName) {
    return Boolean(target && typeof target[methodName] === 'function');
}

function createPlayMusic(backgroundMusic, hasPlayMethod, hasPlayingMethod) {
    return function playMusic() {
        if (!hasPlayMethod || !hasPlayingMethod) {
            return;
        }
        if (backgroundMusic.playing()) {
            return;
        }
        backgroundMusic.play();
    };
}

function createStopMusic(backgroundMusic, hasStopMethod, hasPlayingMethod) {
    return function stopMusic() {
        if (!hasStopMethod || !hasPlayingMethod) {
            return;
        }
        if (!backgroundMusic.playing()) {
            return;
        }
        backgroundMusic.stop();
    };
}

function createMusicActions(backgroundMusic) {
    const hasPlayMethod = hasCallable(backgroundMusic, 'play');
    const hasPlayingMethod = hasCallable(backgroundMusic, 'playing');
    const hasStopMethod = hasCallable(backgroundMusic, 'stop');
    const playMusic = createPlayMusic(backgroundMusic, hasPlayMethod, hasPlayingMethod);
    const stopMusic = createStopMusic(backgroundMusic, hasStopMethod, hasPlayingMethod);
    return { playMusic, stopMusic };
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

    const fireSound = createSoundTrigger(sounds.fire ?? null);
    const explosionSource = sounds.explosion ?? sounds.matchingHit ?? null;
    const matchingHitSource = sounds.matchingHit ?? sounds.explosion ?? null;
    const mergeSource = sounds.merge ?? explosionSource;
    const towerRemoveChargeSource = sounds.towerRemoveCharge ?? null;
    const towerRemoveCancelSource = sounds.towerRemoveCancel ?? null;
    const towerRemoveExplosionSource = sounds.towerRemoveExplosion ?? explosionSource;
    const portalSpawnSource = sounds.portalSpawn ?? sounds.merge ?? sounds.placement ?? sounds.matchingHit ?? null;
    const explosionSound = createSoundTrigger(explosionSource);
    const matchingHitSound = createSoundTrigger(matchingHitSource);
    const mergeSound = createSoundTrigger(mergeSource);
    const mismatchingHitSound = createSoundTrigger(sounds.mismatchingHit ?? null);
    const placementSound = createSoundTrigger(sounds.placement ?? null);
    const colorSwitchSound = createSoundTrigger(sounds.colorSwitch ?? null);
    const errorSound = createSoundTrigger(sounds.error ?? null);
    const baseHitSound = createSoundTrigger(sounds.baseHit ?? null);
    const towerRemoveChargeSound = createSoundTrigger(towerRemoveChargeSource);
    const towerRemoveCancelSound = createSoundTrigger(towerRemoveCancelSource);
    const towerRemoveExplosionSound = createSoundTrigger(towerRemoveExplosionSource);
    const portalSpawnSound = createSoundTrigger(portalSpawnSource);
    const { playMusic, stopMusic } = createMusicActions(sounds.backgroundMusic ?? null);

    return {
        playFire: fireSound,
        playExplosion: explosionSound,
        playMerge: mergeSound,
        playMatchingHit: matchingHitSound,
        playMismatchingHit: mismatchingHitSound,
        playPlacement: placementSound,
        playColorSwitch: colorSwitchSound,
        playMusic,
        stopMusic,
        playError: errorSound,
        playBaseHit: baseHitSound,
        playTowerRemoveCharge: towerRemoveChargeSound,
        playTowerRemoveCancel: towerRemoveCancelSound,
        playTowerRemoveExplosion: towerRemoveExplosionSound,
        playPortalSpawn: portalSpawnSound
    };
}
