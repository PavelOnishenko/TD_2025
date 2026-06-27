import { DEFAULT_TIME_SCALE, MAX_TIME_SCALE, MIN_TIME_SCALE } from '../../core/game/world.js';
import { registerBackquoteToggle } from '../../../engine/systems/developerHotkeys.js';
import { translate } from '../localization.js';

const TIME_SLIDER_STEPS = 100;
const TIME_SCALE_SPAN = MAX_TIME_SCALE / MIN_TIME_SCALE;
const DIAGNOSTICS_MIN_COMMIT_INTERVAL_MS = 120;
const TOWER_DPS_WINDOW_MS = 10000;

const clamp = (value, min, max) => {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(max, Math.max(min, value));
};

const getTimeScaleFromSlider = (value) => {
    const normalized = clamp(value / TIME_SLIDER_STEPS, 0, 1);
    return MIN_TIME_SCALE * (TIME_SCALE_SPAN ** normalized);
};

const getSliderValueFromTimeScale = (scale) => {
    const safeScale = clamp(scale, MIN_TIME_SCALE, MAX_TIME_SCALE);
    const normalized = Math.log(safeScale / MIN_TIME_SCALE) / Math.log(TIME_SCALE_SPAN);
    return Math.round(normalized * TIME_SLIDER_STEPS);
};

const formatTimeScale = (scale) => {
    const safeScale = clamp(scale, MIN_TIME_SCALE, MAX_TIME_SCALE);
    const digits = safeScale >= 10 ? 0 : safeScale >= 1 ? 2 : 3;
    return `${safeScale.toFixed(digits)}x`;
};

const getTimestamp = (timestamp) => {
    if (Number.isFinite(timestamp)) {
        return timestamp;
    }
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
};

const createDiagnosticsState = () => ({
    visible: false,
    fps: 0,
    lastCommit: 0,
    towerDamageEvents: null,
    collectTowerDps: false,
    logEl: null,
    syncTimeScaleUi: null,
});

const updateDiagnosticsFps = (state, dt) => {
    if (!Number.isFinite(dt) || dt <= 0) {
        return;
    }
    const instantFps = 1 / dt;
    const smoothing = 0.25;
    state.fps = state.fps > 0 ? state.fps * (1 - smoothing) + instantFps * smoothing : instantFps;
};

const getDiagnosticsStats = (game, state, dt) => {
    const fpsValue = state.fps > 0 ? state.fps : (Number.isFinite(dt) && dt > 0 ? 1 / dt : 0);
    const timeScale = typeof game?.getTimeScale === 'function' ? game.getTimeScale() : game?.timeScale ?? DEFAULT_TIME_SCALE;
    return {
        fpsDisplay: fpsValue > 0 ? fpsValue.toFixed(1) : 'â€”',
        waveNumber: Number.isFinite(game?.wave) ? game.wave : 0,
        maxWaves: Number.isFinite(game?.maxWaves) ? game.maxWaves : 'âˆž',
        enemies: Array.isArray(game?.enemies) ? game.enemies.length : 0,
        towers: Array.isArray(game?.towers) ? game.towers.length : 0,
        projectiles: Array.isArray(game?.projectiles) ? game.projectiles.length : 0,
        timeScale,
    };
};

const buildDiagnosticsLines = (game, stats) => {
    const entities = stats.enemies + stats.towers + stats.projectiles;
    const yesText = translate('diagnostics.boolean.yes', {}, 'Yes');
    const noText = translate('diagnostics.boolean.no', {}, 'No');
    const waveStatus = game?.waveInProgress
        ? translate('diagnostics.waveStatus.active', {}, 'In Progress')
        : translate('diagnostics.waveStatus.prep', {}, 'Prep');

    return [
        translate('diagnostics.speed', { value: formatTimeScale(stats.timeScale) }, `Speed: ${formatTimeScale(stats.timeScale)}`),
        translate('diagnostics.fps', { value: stats.fpsDisplay }, `FPS: ${stats.fpsDisplay}`),
        translate('diagnostics.wave', { current: stats.waveNumber, max: stats.maxWaves, status: waveStatus }, `Wave: ${stats.waveNumber}/${stats.maxWaves} (${waveStatus})`),
        translate('diagnostics.enemies', { count: stats.enemies }, `Enemies: ${stats.enemies}`),
        translate('diagnostics.towers', { count: stats.towers }, `Towers: ${stats.towers}`),
        translate('diagnostics.projectiles', { count: stats.projectiles }, `Projectiles: ${stats.projectiles}`),
        translate('diagnostics.entities', { count: entities }, `Entities: ${entities}`),
        translate('diagnostics.paused', { value: game?.isPaused ? yesText : noText }, `Paused: ${game?.isPaused ? yesText : noText}`),
        translate('diagnostics.muted', { value: game?.audioMuted ? yesText : noText }, `Muted: ${game?.audioMuted ? yesText : noText}`),
        translate('diagnostics.music', { value: game?.musicEnabled ? yesText : noText }, `Music Enabled: ${game?.musicEnabled ? yesText : noText}`),
    ];
};

const getTowerDpsLine = (tower, eventsByTower, cutoff, now) => {
    const towerId = tower?.id ?? 'â€”';
    const level = Number.isFinite(tower?.level) ? tower.level : '?';
    const color = tower?.color ?? 'unknown';
    const events = Array.isArray(eventsByTower.get(towerId)) ? eventsByTower.get(towerId) : [];
    const recentEvents = events.filter((event) => event.time >= cutoff);
    const damage = recentEvents.reduce((sum, event) => sum + event.damage, 0);
    eventsByTower.set(towerId, recentEvents);

    const dps = recentEvents
        .filter((event) => event.time >= now - 1000)
        .reduce((sum, event) => sum + event.damage, 0);
    const activeDps = getActiveDps(recentEvents, damage);
    return `Tower ${towerId} (Lv ${level}, ${color}): ${dps.toFixed(1)} DPS | 10s avg (active): ${activeDps.toFixed(1)}`;
};

const getActiveDps = (recentEvents, damage) => {
    const bucketedDamage = new Map();
    for (const event of recentEvents) {
        const bucket = Math.floor(event.time / 1000);
        bucketedDamage.set(bucket, (bucketedDamage.get(bucket) ?? 0) + event.damage);
    }
    const activeBuckets = Array.from(bucketedDamage.values()).filter((value) => value > 0).length;
    const activeDurationMs = activeBuckets * 1000;
    return activeDurationMs > 0 ? damage / (activeDurationMs / 1000) : 0;
};

const appendTowerDpsLines = (lines, game, state, now) => {
    if (!state.collectTowerDps || !Array.isArray(game?.towers)) {
        return;
    }

    const cutoff = now - TOWER_DPS_WINDOW_MS;
    const eventsByTower = state.towerDamageEvents instanceof Map ? state.towerDamageEvents : new Map();
    const dpsLines = game.towers.map((tower) => getTowerDpsLine(tower, eventsByTower, cutoff, now));
    if (dpsLines.length) {
        lines.push('Tower DPS:');
        lines.push(...dpsLines);
    }
};

const bindTimeScaleControls = (game, overlay, state) => {
    const timeScaleValueEl = overlay.querySelector('#timeScaleValue');
    const timeScaleSlider = overlay.querySelector('#timeScaleSlider');
    const updateTimeScaleDisplay = (scale) => {
        if (timeScaleSlider) {
            const sliderValue = getSliderValueFromTimeScale(scale);
            if (String(sliderValue) !== timeScaleSlider.value) {
                timeScaleSlider.value = String(sliderValue);
            }
        }
        if (timeScaleValueEl) {
            timeScaleValueEl.textContent = formatTimeScale(scale);
        }
    };

    state.syncTimeScaleUi = updateTimeScaleDisplay;
    if (!timeScaleSlider) {
        return;
    }
    const initialScale = typeof game.getTimeScale === 'function' ? game.getTimeScale() : DEFAULT_TIME_SCALE;
    timeScaleSlider.value = String(getSliderValueFromTimeScale(initialScale));
    updateTimeScaleDisplay(initialScale);
    timeScaleSlider.addEventListener('input', (event) => {
        const nextScale = getTimeScaleFromSlider(Number(event.target.value));
        const appliedScale = typeof game.setTimeScale === 'function' ? game.setTimeScale(nextScale) : nextScale;
        updateTimeScaleDisplay(appliedScale);
        refreshDiagnosticsOverlay(game, { force: true });
    });
};

export function bindDiagnosticsOverlay(game) {
    if (!game) {
        return;
    }

    const overlay = game.diagnosticsOverlay;
    const state = createDiagnosticsState();
    game.diagnosticsState = state;
    if (!overlay || typeof window === 'undefined') {
        return;
    }

    state.logEl = overlay.querySelector('#diagnosticsLog') ?? overlay;
    bindTimeScaleControls(game, overlay, state);
    const updateVisibility = () => overlay.classList.toggle('diagnostics--hidden', !state.visible);
    registerBackquoteToggle(() => {
        state.visible = !state.visible;
        if (!state.visible) {
            state.towerDamageEvents = null;
            state.collectTowerDps = false;
            updateVisibility();
            return;
        }
        state.fps = 0;
        state.lastCommit = 0;
        state.towerDamageEvents = new Map();
        state.collectTowerDps = true;
        updateVisibility();
        refreshDiagnosticsOverlay(game, { dt: 0, force: true });
    });
    updateVisibility();
}

export function refreshDiagnosticsOverlay(game, options = {}) {
    const overlay = game?.diagnosticsOverlay;
    const state = game?.diagnosticsState;
    if (!overlay || !state || (!state.visible && !options.force)) {
        return;
    }

    const dt = options.dt ?? 0;
    updateDiagnosticsFps(state, dt);
    const now = getTimestamp(options.timestamp);
    if (!options.force && now - (state.lastCommit ?? 0) < DIAGNOSTICS_MIN_COMMIT_INTERVAL_MS) {
        return;
    }

    state.lastCommit = now;
    const stats = getDiagnosticsStats(game, state, dt);
    state.syncTimeScaleUi?.(stats.timeScale);
    const lines = buildDiagnosticsLines(game, stats);
    appendTowerDpsLines(lines, game, state, now);
    (state.logEl ?? overlay).textContent = lines.join('\n');
}
