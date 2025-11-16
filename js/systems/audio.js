const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const NOOP_AUDIO = {
    playTowerFire() {},
    playTowerHit() {},
    playExplosion() {},
    playMerge() {},
    playPlacement() {},
    playColorSwitch() {},
    playMusic() {},
    stopMusic() {},
    playError() {},
    playBaseHit() {},
    playTowerRemoveCharge() {},
    playTowerRemoveCancel() {},
    playTowerRemoveExplosion() {},
    playPortalSpawn() {},
};

const MAX_TOWER_LEVEL = 6;

function clampTowerLevel(level) {
    const numeric = Number(level);
    if (!Number.isFinite(numeric)) {
        return 1;
    }
    return Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(numeric)));
}

function createTowerSoundTriggers(sounds, prefix, fallback = null) {
    const triggers = new Array(MAX_TOWER_LEVEL + 1);
    for (let level = 1; level <= MAX_TOWER_LEVEL; level++) {
        const key = `${prefix}_${level}`;
        const sound = sounds[key] ?? fallback;
        triggers[level] = createSoundTrigger(sound ?? null);
    }
    return triggers;
}

function createTowerSoundPlayer(triggers) {
    return function playTowerSound(level) {
        const normalized = clampTowerLevel(level);
        const trigger = triggers[normalized];
        if (typeof trigger === 'function') {
            trigger();
        }
    };
}

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

    const explosionSource = sounds.explosion ?? sounds.tower_hit_1 ?? null;
    const mergeSource = sounds.merge ?? explosionSource;
    const portalSpawnSource = sounds.portalSpawn ?? null;
    const defaultFireSource = sounds.tower_fire_1 ?? explosionSource;
    const defaultHitSource = sounds.tower_hit_1 ?? explosionSource;
    const towerFireTriggers = createTowerSoundTriggers(sounds, 'tower_fire', defaultFireSource);
    const towerHitTriggers = createTowerSoundTriggers(sounds, 'tower_hit', defaultHitSource);
    const explosionSound = createSoundTrigger(explosionSource);
    const mergeSound = createSoundTrigger(mergeSource);
    const placementSound = createSoundTrigger(sounds.placement ?? null);
    const colorSwitchSound = createSoundTrigger(sounds.colorSwitch ?? null);
    const errorSound = createSoundTrigger(sounds.error ?? null);
    const baseHitSource = sounds.baseHit ?? explosionSource;
    const baseHitSound = createSoundTrigger(baseHitSource);
    const towerRemoveChargeSource = sounds.towerRemoveCharge ?? null;
    const towerRemoveCancelSource = sounds.towerRemoveCancel ?? null;
    const towerRemoveExplosionSource = sounds.towerRemoveExplosion ?? explosionSource;
    const towerRemoveChargeSound = createSoundTrigger(towerRemoveChargeSource);
    const towerRemoveCancelSound = createSoundTrigger(towerRemoveCancelSource);
    const towerRemoveExplosionSound = createSoundTrigger(towerRemoveExplosionSource);
    const portalSpawnSound = createSoundTrigger(portalSpawnSource);
    const towerFireSound = createTowerSoundPlayer(towerFireTriggers);
    const towerHitSound = createTowerSoundPlayer(towerHitTriggers);
    const { playMusic, stopMusic } = createMusicActions(sounds.backgroundMusic ?? null);

    return {
        playTowerFire: towerFireSound,
        playExplosion: explosionSound,
        playMerge: mergeSound,
        playTowerHit: towerHitSound,
        playPlacement: placementSound,
        playColorSwitch: colorSwitchSound,
        playMusic,
        stopMusic,
        playError: errorSound,
        playBaseHit: baseHitSound,
        playTowerRemoveCharge: towerRemoveChargeSound,
        playTowerRemoveCancel: towerRemoveCancelSound,
        playTowerRemoveExplosion: towerRemoveExplosionSound,
        playPortalSpawn: portalSpawnSound,
    };
}
