import { createSound, isAudioSupported } from './audio.js';
import { UI_ASSET_PATHS } from '../config/uiAssets.js';

const IMAGE_DIR = 'assets/images';
const TOWER_IMAGE_DIR = `${IMAGE_DIR}/Towers`;
const SOUND_DIR = 'assets/sound';

const IMAGE_SOURCES = {
    cell: `${IMAGE_DIR}/cell_cut.png`,
    platform: `${IMAGE_DIR}/platform.png`,
    tower_1r_1: `${TOWER_IMAGE_DIR}/T1R_1.png`,
    tower_1r_2: `${TOWER_IMAGE_DIR}/T1R_2.png`,
    tower_1r_3: `${TOWER_IMAGE_DIR}/T1R_3.png`,
    tower_1r_4: `${TOWER_IMAGE_DIR}/T1R_4.png`,
    tower_1r_5: `${TOWER_IMAGE_DIR}/T1R_5.png`,
    tower_1r_6: `${TOWER_IMAGE_DIR}/T1R_6.png`,
    tower_1r_7: `${TOWER_IMAGE_DIR}/T1R_7.png`,
    tower_1r_8: `${TOWER_IMAGE_DIR}/T1R_8.png`,
    tower_1b_1: `${TOWER_IMAGE_DIR}/T1B_1.png`,
    tower_1b_2: `${TOWER_IMAGE_DIR}/T1B_2.png`,
    tower_1b_3: `${TOWER_IMAGE_DIR}/T1B_3.png`,
    tower_1b_4: `${TOWER_IMAGE_DIR}/T1B_4.png`,
    tower_1b_5: `${TOWER_IMAGE_DIR}/T1B_5.png`,
    tower_1b_6: `${TOWER_IMAGE_DIR}/T1B_6.png`,
    tower_1b_7: `${TOWER_IMAGE_DIR}/T1B_7.png`,
    tower_1b_8: `${TOWER_IMAGE_DIR}/T1B_8.png`,
    tower_2r: `${TOWER_IMAGE_DIR}/tower_2R.png`,
    tower_2b: `${TOWER_IMAGE_DIR}/tower_2B.png`,
    tower_3r: `${TOWER_IMAGE_DIR}/tower_3R.png`,
    tower_3b: `${TOWER_IMAGE_DIR}/tower_3B.png`,
    tower_4r: `${TOWER_IMAGE_DIR}/tower_4R.png`,
    tower_4b: `${TOWER_IMAGE_DIR}/tower_4B.png`,
    tower_5r: `${TOWER_IMAGE_DIR}/tower_5R.png`,
    tower_5b: `${TOWER_IMAGE_DIR}/tower_5B.png`,
    tower_6r: `${TOWER_IMAGE_DIR}/tower_6R.png`,
    tower_6b: `${TOWER_IMAGE_DIR}/tower_6B.png`,
    tank_r: `${IMAGE_DIR}/tank_R.png`,
    tank_b: `${IMAGE_DIR}/tank_B.png`,
    swarm_r: `${IMAGE_DIR}/swarm_R.png`,
    swarm_b: `${IMAGE_DIR}/swarm_B.png`,
    ui_main_icon: UI_ASSET_PATHS.mainIcon,
    ui_next_level_button: UI_ASSET_PATHS.nextLevelButton,
    ui_settings_button: UI_ASSET_PATHS.settingsButton,
    ui_pause_button: UI_ASSET_PATHS.pauseButton,
    ui_restart_button: UI_ASSET_PATHS.restartButton,
    ui_merge_towers_button: UI_ASSET_PATHS.mergeTowersButton,
    ui_upgrade_towers_button: UI_ASSET_PATHS.upgradeTowersButton,
    ui_speed_up_battle_button: UI_ASSET_PATHS.speedUpBattleButton,
    ui_energy_icon: UI_ASSET_PATHS.energyIcon,
    ui_heart: UI_ASSET_PATHS.heart,
    ui_preparation_button_background: UI_ASSET_PATHS.preparationButtonBackground
};

const SOUND_OPTIONS = {
    tower_fire_1: {
        src: [`${SOUND_DIR}/tower_fire_1.mp3`],
        volume: 0.3,
        preload: true,
    },
    tower_fire_2: {
        src: [`${SOUND_DIR}/tower_fire_2.mp3`],
        volume: 0.28,
        preload: true,
    },
    tower_fire_3: {
        src: [`${SOUND_DIR}/tower_fire_3.mp3`],
        volume: 0.14,
        preload: true,
    },
    tower_fire_4: {
        src: [`${SOUND_DIR}/tower_fire_4.mp3`],
        volume: 0.66,
        preload: true,
    },
    tower_fire_5: {
        src: [`${SOUND_DIR}/tower_fire_5.mp3`],
        volume: 0.58,
        preload: true,
    },
    tower_fire_6: {
        src: [`${SOUND_DIR}/tower_fire_6.mp3`],
        volume: 0.2,
        preload: true,
    },
    tower_hit_1: {
        src: [`${SOUND_DIR}/tower_hit_1.mp3`],
        volume: 0.2,
        preload: true,
    },
    tower_hit_2: {
        src: [`${SOUND_DIR}/tower_hit_2.mp3`],
        volume: 0.2,
        preload: true,
    },
    tower_hit_3: {
        src: [`${SOUND_DIR}/tower_hit_3.mp3`],
        volume: 0.24,
        preload: true,
    },
    tower_hit_4: {
        src: [`${SOUND_DIR}/tower_hit_4.mp3`],
        volume: 0.03,
        preload: true,
    },
    tower_hit_5: {
        src: [`${SOUND_DIR}/tower_hit_5.mp3`],
        volume: 0.48,
        preload: true,
    },
    tower_hit_6: {
        src: [`${SOUND_DIR}/tower_hit_6.mp3`],
        volume: 0.1,
        preload: true,
    },
    explosion: {
        src: [`${SOUND_DIR}/explosion.wav`],
        volume: 0.25,
        preload: true
    },
    placement: {
        src: [`${SOUND_DIR}/placement.mp3`],
        volume: 0.4,
        preload: true
    },
    merge: {
        src: [`${SOUND_DIR}/merge.mp3`],
        volume: 1,
        rate: 1.6,
        preload: true
    },
    colorSwitch: {
        src: [`${SOUND_DIR}/color_switch.mp3`],
        volume: 1,
    },
    baseHit: {
        src: [`${SOUND_DIR}/explosion.wav`],
        volume: 0.18,
        preload: true
    },
    error: {
        src: [`${SOUND_DIR}/error.wav`],
        volume: 0.5,
        preload: true
    },
    towerRemoveCharge: {
        src: [`${SOUND_DIR}/tower_remove_charge.mp3`],
        volume: 0.8,
        preload: true
    },
    towerRemoveCancel: {
        src: [`${SOUND_DIR}/tower_remove_cancel.mp3`],
        volume: 0.35,
        preload: true
    },
    towerRemoveExplosion: {
        src: [`${SOUND_DIR}/tower_remove_explosion.mp3`],
        volume: 0.45,
        preload: true
    },
    portalSpawn: {
        src: [`${SOUND_DIR}/portal_spawn.mp3`],
        volume: 0.1,
        preload: true
    },
    backgroundMusic: {
        src: [`${SOUND_DIR}/background_music.mp3`],
        volume: 0.35,
        preload: true,
        loop: true
    }
};

const DEFAULT_IMAGE_FACTORY = () => {
    if (typeof Image === 'undefined') {
        throw new Error('Image constructor is not available');
    }
    return new Image();
};

const TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/58BAQMDgQm0n98AAAAASUVORK5CYII=';

const loggedAssetWarnings = new Set();

function logAssetWarning(assetType, key, error, action = 'Using fallback.') {
    const cacheKey = `${assetType}:${key}`;
    if (loggedAssetWarnings.has(cacheKey)) {
        return;
    }
    loggedAssetWarnings.add(cacheKey);
    const details = error && error.message ? ` (${error.message})` : '';
    const suffix = action ? ` ${action}` : '';
    console.warn(`Failed to load ${assetType} asset "${key}".${suffix}${details}`);
}

function createTransparentImage() {
    try {
        const image = DEFAULT_IMAGE_FACTORY();
        image.src = TRANSPARENT_PIXEL;
        return image;
    } catch {
        return { src: TRANSPARENT_PIXEL };
    }
}

function getTransparentImage() {
    const cache = getTransparentImage as typeof getTransparentImage & { cached?: any };
    if (!cache.cached) {
        cache.cached = createTransparentImage();
    }
    return cache.cached;
}

function handleImageLoadFailure(key, error) {
    logAssetWarning('image', key, error);
    return getTransparentImage();
}

export async function loadAssets({
    loadImageFn = loadImage,
    audioSupportChecker = isAudioSupported,
    soundCreator = createSound,
    onProgress = null
} = {}) {
    const imageCount = Object.keys(IMAGE_SOURCES).length;
    const soundCount = Object.keys(SOUND_OPTIONS).length;
    const totalAssets = imageCount + soundCount;
    let loadedCount = 0;

    const reportProgress = (stage) => {
        if (typeof onProgress === 'function') {
            onProgress({
                loaded: loadedCount,
                total: totalAssets,
                percent: Math.round((loadedCount / totalAssets) * 100),
                stage
            });
        }
    };

    reportProgress('images');

    const imageEntries = await Promise.all(
        Object.entries(IMAGE_SOURCES).map(async ([key, url]) => {
            try {
                const image = await loadImageFn(url);
                loadedCount++;
                reportProgress('images');
                return [key, image];
            } catch (error) {
                loadedCount++;
                reportProgress('images');
                const fallbackImage = handleImageLoadFailure(key, error);
                return [key, fallbackImage];
            }
        })
    );
    const images = Object.fromEntries(imageEntries);

    const audioSupported = audioSupportChecker();
    if (!audioSupported) {
        loadedCount = totalAssets;
        reportProgress('complete');
        return { ...images, sounds: {} };
    }

    reportProgress('sounds');

    const soundEntries = [];
    for (const [key, options] of Object.entries(SOUND_OPTIONS)) {
        try {
            const sound = soundCreator(options);
            soundEntries.push([key, sound]);
        } catch (error) {
            logAssetWarning('sound', key, error, 'Sound will be disabled.');
        }
        loadedCount++;
        reportProgress('sounds');
    }
    const sounds = Object.fromEntries(soundEntries);

    reportProgress('complete');
    return { ...images, sounds };
}

export function loadImage(url, createImage = DEFAULT_IMAGE_FACTORY) {
    return new Promise((resolve, reject) => {
        const img = createImage();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
