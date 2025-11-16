const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

const NOOP_AUDIO = {
    playFire() {},
    playMinigunFire() {},
    playRailgunFire() {},
    playRocketFire() {},
    playExplosion() {},
    playMerge() {},
    playMatchingHit() {},
    playMismatchingHit() {},
    playMinigunHit() {},
    playRailgunHit() {},
    playRocketHit() {},
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
    playTowerFireForLevel() { return false; },
    playTowerHitForLevel() { return false; },
};

const MAX_TOWER_LEVEL = 6;

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

function normalizeTowerLevel(level, maxLevel = MAX_TOWER_LEVEL) {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel)) {
        return 1;
    }
    const rounded = Math.round(numericLevel);
    const clamped = Math.max(1, Math.min(maxLevel, rounded));
    return clamped;
}

function createLevelSoundTriggers(sounds, prefix, maxLevel = MAX_TOWER_LEVEL) {
    const triggers = [];
    for (let level = 1; level <= maxLevel; level++) {
        const key = `${prefix}${level}`;
        const trigger = sounds[key] ? createSoundTrigger(sounds[key]) : null;
        triggers.push(trigger);
    }
    return triggers;
}

function createLevelSoundPlayer(triggers) {
    const maxLevel = triggers.length;
    return function playForLevel(level) {
        if (!maxLevel) {
            return false;
        }
        const normalized = normalizeTowerLevel(level, maxLevel);
        const trigger = triggers[normalized - 1];
        if (trigger) {
            trigger();
            return true;
        }
        return false;
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
    const minigunFireSound = createSoundTrigger(sounds.minigunFire ?? null);
    const railgunFireSound = createSoundTrigger(sounds.railgunFire ?? null);
    const rocketFireSound = createSoundTrigger(sounds.rocketFire ?? null);
    const explosionSource = sounds.explosion ?? sounds.matchingHit ?? null;
    const matchingHitSource = sounds.matchingHit ?? sounds.explosion ?? null;
    const mergeSource = sounds.merge ?? explosionSource;
    const towerRemoveChargeSource = sounds.towerRemoveCharge ?? null;
    const towerRemoveCancelSource = sounds.towerRemoveCancel ?? null;
    const towerRemoveExplosionSource = sounds.towerRemoveExplosion ?? explosionSource;
    const portalSpawnSource = sounds.portalSpawn ?? null;
    const explosionSound = createSoundTrigger(explosionSource);
    const matchingHitSound = createSoundTrigger(matchingHitSource);
    const mergeSound = createSoundTrigger(mergeSource);
    const mismatchingHitSound = createSoundTrigger(sounds.mismatchingHit ?? null);
    const minigunHitSound = createSoundTrigger(sounds.minigunHit ?? null);
    const railgunHitSound = createSoundTrigger(sounds.railgunHit ?? null);
    const rocketHitSound = createSoundTrigger(sounds.rocketHit ?? null);
    const placementSound = createSoundTrigger(sounds.placement ?? null);
    const colorSwitchSound = createSoundTrigger(sounds.colorSwitch ?? null);
    const errorSound = createSoundTrigger(sounds.error ?? null);
    const baseHitSound = createSoundTrigger(sounds.baseHit ?? null);
    const towerRemoveChargeSound = createSoundTrigger(towerRemoveChargeSource);
    const towerRemoveCancelSound = createSoundTrigger(towerRemoveCancelSource);
    const towerRemoveExplosionSound = createSoundTrigger(towerRemoveExplosionSource);
    const portalSpawnSound = createSoundTrigger(portalSpawnSource);
    const towerFireTriggers = createLevelSoundTriggers(sounds, 'towerFireLevel');
    const towerHitTriggers = createLevelSoundTriggers(sounds, 'towerHitLevel');
    const triggerTowerFire = createLevelSoundPlayer(towerFireTriggers);
    const triggerTowerHit = createLevelSoundPlayer(towerHitTriggers);
    const { playMusic, stopMusic } = createMusicActions(sounds.backgroundMusic ?? null);

    function playTowerFireForLevel(level) {
        return triggerTowerFire(level);
    }

    function playTowerHitForLevel(level) {
        return triggerTowerHit(level);
    }

    return {
        playFire: fireSound,
        playMinigunFire: minigunFireSound,
        playRailgunFire: railgunFireSound,
        playRocketFire: rocketFireSound,
        playExplosion: explosionSound,
        playMerge: mergeSound,
        playMatchingHit: matchingHitSound,
        playMismatchingHit: mismatchingHitSound,
        playMinigunHit: minigunHitSound,
        playRailgunHit: railgunHitSound,
        playRocketHit: rocketHitSound,
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
        playTowerFireForLevel,
        playTowerHitForLevel,
    };
}
