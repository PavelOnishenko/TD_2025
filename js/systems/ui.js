import Tower from '../entities/Tower.js';
import gameConfig from '../config/gameConfig.js';
import { callCrazyGamesEvent } from './crazyGamesIntegration.js';
import { showCrazyGamesAdWithPause } from './ads.js';
import { saveAudioSettings, loadLanguagePreference, saveLanguagePreference } from './dataStore.js';
import { attachTutorial } from './tutorial.js';
import { registerTutorialTarget } from './tutorialTargets.js';
import {
    fetchLeaderboard,
    submitHighScore,
    resolvePlayerDisplayName,
    normalizeScore,
} from './highScores.js';
import { translate, setActiveLocale, applyLocalization } from './localization.js';

const SUPPORTED_LANGUAGES = ['en', 'ru'];
const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];

const HEART_FILLED_SRC = 'assets/heart_filled.png';
const HEART_EMPTY_SRC = 'assets/heart_empty.png';

function normalizeLanguageCode(language) {
    if (typeof language !== 'string') {
        return '';
    }
    return language.trim().toLowerCase();
}

function resolveSupportedLanguage(language) {
    const normalized = normalizeLanguageCode(language);
    if (!normalized) {
        return null;
    }
    if (SUPPORTED_LANGUAGES.includes(normalized)) {
        return normalized;
    }
    const [base] = normalized.split(/[-_]/);
    if (base && SUPPORTED_LANGUAGES.includes(base)) {
        return base;
    }
    return null;
}

function getNavigatorLanguagePreferences() {
    if (typeof navigator === 'undefined') {
        return [];
    }
    const preferences = [];
    if (typeof navigator.language === 'string') {
        preferences.push(navigator.language);
    }
    if (Array.isArray(navigator.languages)) {
        preferences.push(...navigator.languages);
    }
    return preferences;
}

function resolveInitialLanguage(game) {
    const stored = resolveSupportedLanguage(loadLanguagePreference());
    if (stored) {
        return stored;
    }
    const navigatorPreferences = getNavigatorLanguagePreferences();
    for (const preference of navigatorPreferences) {
        const resolved = resolveSupportedLanguage(preference);
        if (resolved) {
            return resolved;
        }
    }
    const current = resolveSupportedLanguage(game?.language);
    if (current) {
        return current;
    }
    return DEFAULT_LANGUAGE;
}

function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const transform = canvas.viewportTransform;
    if (transform) {
        const { scale = 1, offsetX = 0, offsetY = 0 } = transform;
        return {
            x: (canvasX - offsetX) / scale,
            y: (canvasY - offsetY) / scale,
        };
    }

    return {
        x: canvasX,
        y: canvasY,
    };
}

function isInside(pos, rect) {
    return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.w &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.h
    );
}

export function bindUI(game) {
    bindHUD(game);
    game.updateMergeButtonState = (active) => updateMergeButtonState(game, active);
    game.updateMergeButtonState(false);
    attachTutorial(game);
    bindButtons(game);
    bindAudioButtons(game);
    bindPauseSettings(game);
    bindPauseSystem(game);
    bindLeaderboard(game);
    bindCanvasInteractions(game);
    bindDiagnosticsOverlay(game);
    bindLocalization(game);
    updateHUD(game);
    setupStartMenu(game);
    updateAudioControls(game);
}

function bindHUD(game) {
    const tutorialTargetCleanups = [];
    game.livesEl = document.getElementById('lives');
    game.energyEl = document.getElementById('energy');
    game.scorePanelEl = document.getElementById('scorePanel');
    game.scoreEl = document.getElementById('score');
    game.bestScoreEl = document.getElementById('bestScore');
    game.wavePanelEl = document.getElementById('wavePanel');
    game.waveEl = document.getElementById('wave');
    game.wavePhaseEl = document.getElementById('wavePhase');
    game.endlessIndicatorEl = document.getElementById('endlessIndicator');
    game.statusEl = document.getElementById('status');
    game.nextWaveBtn = document.getElementById('nextWave');
    game.restartBtn = document.getElementById('restart');
    game.muteBtn = document.getElementById('muteToggle');
    game.musicBtn = document.getElementById('musicToggle');
    game.mergeBtn = document.getElementById('mergeTowers');
    game.pauseBtn = document.getElementById('pause');
    game.startOverlay = document.getElementById('startOverlay');
    game.startBtn = document.getElementById('startGame');
    game.endOverlay = document.getElementById('endOverlay');
    game.endMenu = document.getElementById('endMenu');
    game.endMessageEl = document.getElementById('endMessage');
    game.endDetailEl = document.getElementById('endDetail');
    game.endScoreEl = document.getElementById('endScore');
    game.endBestScoreEl = document.getElementById('endBestScore');
    game.endRestartBtn = document.getElementById('endRestart');
    game.pauseOverlay = document.getElementById('pauseOverlay');
    game.pauseMessageEl = document.getElementById('pauseMessage');
    game.resumeBtn = document.getElementById('resumeGame');
    game.pauseMuteBtn = document.getElementById('pauseSoundToggle');
    game.pauseMusicBtn = document.getElementById('pauseMusicToggle');
    game.pauseLanguageSelect = document.getElementById('pauseLanguageSelect');
    game.leaderboardToggleBtn = document.getElementById('leaderboardToggle');
    game.leaderboardPanel = document.getElementById('leaderboardPanel');
    game.leaderboardListEl = document.getElementById('leaderboardList');
    game.leaderboardLoadingEl = document.getElementById('leaderboardLoading');
    game.leaderboardErrorEl = document.getElementById('leaderboardError');
    game.leaderboardEmptyEl = document.getElementById('leaderboardEmpty');
    game.leaderboardRetryBtn = document.getElementById('leaderboardRetry');
    game.diagnosticsOverlay = document.getElementById('diagnosticsOverlay');
    game.waveClearBannerEl = document.getElementById('waveClearBanner');
    game.saveControlsEl = document.getElementById('saveControls');
    game.saveBtn = document.getElementById('saveGame');
    game.loadBtn = document.getElementById('loadGame');
    game.deleteSaveBtn = document.getElementById('deleteSave');
    if (game.nextWaveBtn) {
        tutorialTargetCleanups.push(registerTutorialTarget('nextWaveButton', () => game.nextWaveBtn));
    }
    if (game.mergeBtn) {
        tutorialTargetCleanups.push(registerTutorialTarget('mergeButton', () => game.mergeBtn));
    }
    if (game.energyEl) {
        tutorialTargetCleanups.push(registerTutorialTarget('energyPanel', () => game.energyEl));
    }
    if (game.scorePanelEl) {
        tutorialTargetCleanups.push(registerTutorialTarget('scorePanel', () => game.scorePanelEl));
    }
    if (game.pauseBtn) {
        tutorialTargetCleanups.push(registerTutorialTarget('pauseButton', () => game.pauseBtn));
    }
    game.releaseTutorialTargets = () => {
        while (tutorialTargetCleanups.length > 0) {
            const cleanup = tutorialTargetCleanups.pop();
            try {
                cleanup?.();
            } catch (error) {
                console.warn('Failed to release tutorial target', error);
            }
        }
    };
}

function bindLocalization(game) {
    if (!game) {
        return;
    }

    const refreshUi = () => {
        applyLocalization(typeof document !== 'undefined' ? document : undefined);
        updateAudioControls(game);
        updateHUD(game);
        updateWavePhaseIndicator(game);
        refreshDiagnosticsOverlay(game, { force: true });
        if (typeof game.refreshPauseUi === 'function') {
            game.refreshPauseUi();
        }
        if (typeof game.refreshLeaderboardCopy === 'function') {
            game.refreshLeaderboardCopy();
        }
        if (typeof game.refreshTutorialLocalization === 'function') {
            game.refreshTutorialLocalization();
        }
        if (typeof game.updateEndScreenLocalization === 'function') {
            game.updateEndScreenLocalization();
        }
        if (typeof game.updateStatusLocalization === 'function') {
            game.updateStatusLocalization();
        }
        updateLanguageControls(game);
    };

    const applyLanguage = async (language) => {
        const resolved = resolveSupportedLanguage(language) ?? DEFAULT_LANGUAGE;
        await setActiveLocale(resolved);
        refreshUi();
    };

    const handleLanguageChanged = (language) => {
        const resolved = resolveSupportedLanguage(language) ?? DEFAULT_LANGUAGE;
        saveLanguagePreference(resolved);
        void applyLanguage(resolved);
    };

    if (typeof game.addLanguageListener === 'function') {
        game.addLanguageListener(handleLanguageChanged);
    }

    const initialLanguage = resolveInitialLanguage(game);

    if (typeof game.setLanguage === 'function') {
        const changed = game.setLanguage(initialLanguage);
        if (!changed) {
            void applyLanguage(initialLanguage);
        }
    }
    else {
        game.language = initialLanguage;
        void applyLanguage(initialLanguage);
    }
}

function bindDiagnosticsOverlay(game) {
    if (!game) {
        return;
    }

    const overlay = game.diagnosticsOverlay;
    const state = {
        visible: false,
        fps: 0,
        lastCommit: 0,
        towerDamageTotals: null,
        towerDamageStart: 0,
        collectTowerDps: false,
    };
    game.diagnosticsState = state;

    if (!overlay) {
        return;
    }

    if (typeof window === 'undefined') {
        return;
    }

    const resetTowerDpsTracking = () => {
        state.towerDamageTotals = null;
        state.towerDamageStart = 0;
        state.collectTowerDps = false;
    };

    const startTowerDpsTracking = () => {
        state.towerDamageTotals = new Map();
        state.collectTowerDps = true;
        state.towerDamageStart = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
    };

    const updateVisibility = () => {
        overlay.classList.toggle('diagnostics--hidden', !state.visible);
    };

    const toggleOverlay = () => {
        state.visible = !state.visible;
        if (!state.visible) {
            resetTowerDpsTracking();
            updateVisibility();
            return;
        }
        state.fps = 0;
        state.lastCommit = 0;
        startTowerDpsTracking();
        updateVisibility();
        refreshDiagnosticsOverlay(game, { dt: 0, force: true });
    };

    const handleKeyDown = (event) => {
        if (event.code !== 'Backquote') {
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        event.preventDefault();
        toggleOverlay();
    };

    window.addEventListener('keydown', handleKeyDown);
    updateVisibility();
}

export function refreshDiagnosticsOverlay(game, options = {}) {
    const overlay = game?.diagnosticsOverlay;
    const state = game?.diagnosticsState;
    if (!overlay || !state) {
        return;
    }

    const {
        dt = 0,
        timestamp = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now(),
        force = false,
    } = options;

    if (!state.visible && !force) {
        return;
    }

    if (Number.isFinite(dt) && dt > 0) {
        const instantFps = 1 / dt;
        const smoothing = 0.25;
        state.fps = state.fps > 0 ? (state.fps * (1 - smoothing)) + (instantFps * smoothing) : instantFps;
    }

    const now = Number.isFinite(timestamp)
        ? timestamp
        : (typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now());

    const minInterval = 120;
    if (!force && now - (state.lastCommit ?? 0) < minInterval) {
        return;
    }

    state.lastCommit = now;

    const fpsValue = state.fps > 0 ? state.fps : (Number.isFinite(dt) && dt > 0 ? 1 / dt : 0);
    const fpsDisplay = fpsValue > 0 ? fpsValue.toFixed(1) : '—';
    const waveNumber = Number.isFinite(game?.wave) ? game.wave : 0;
    const maxWaves = Number.isFinite(game?.maxWaves) ? game.maxWaves : '∞';
    const waveStatus = game?.waveInProgress
        ? translate('diagnostics.waveStatus.active', {}, 'In Progress')
        : translate('diagnostics.waveStatus.prep', {}, 'Prep');
    const enemies = Array.isArray(game?.enemies) ? game.enemies.length : 0;
    const towers = Array.isArray(game?.towers) ? game.towers.length : 0;
    const projectiles = Array.isArray(game?.projectiles) ? game.projectiles.length : 0;
    const entities = enemies + towers + projectiles;
    const yesText = translate('diagnostics.boolean.yes', {}, 'Yes');
    const noText = translate('diagnostics.boolean.no', {}, 'No');
    const paused = game?.isPaused ? yesText : noText;
    const muted = game?.audioMuted ? yesText : noText;
    const music = game?.musicEnabled ? yesText : noText;

    const lines = [
        translate('diagnostics.fps', { value: fpsDisplay }, `FPS: ${fpsDisplay}`),
        translate('diagnostics.wave', { current: waveNumber, max: maxWaves, status: waveStatus }, `Wave: ${waveNumber}/${maxWaves} (${waveStatus})`),
        translate('diagnostics.enemies', { count: enemies }, `Enemies: ${enemies}`),
        translate('diagnostics.towers', { count: towers }, `Towers: ${towers}`),
        translate('diagnostics.projectiles', { count: projectiles }, `Projectiles: ${projectiles}`),
        translate('diagnostics.entities', { count: entities }, `Entities: ${entities}`),
        translate('diagnostics.paused', { value: paused }, `Paused: ${paused}`),
        translate('diagnostics.muted', { value: muted }, `Muted: ${muted}`),
        translate('diagnostics.music', { value: music }, `Music Enabled: ${music}`),
    ];

    if (state.collectTowerDps && Array.isArray(game?.towers)) {
        const elapsedMs = Number.isFinite(state.towerDamageStart)
            ? now - state.towerDamageStart
            : 0;
        const elapsedSeconds = Math.max(0, elapsedMs) / 1000;
        const totals = state.towerDamageTotals instanceof Map ? state.towerDamageTotals : new Map();
        const dpsLines = [];

        for (const tower of game.towers) {
            const towerId = tower?.id ?? '—';
            const level = Number.isFinite(tower?.level) ? tower.level : '?';
            const color = tower?.color ?? 'unknown';
            const damage = totals.get(towerId) ?? 0;
            const dps = elapsedSeconds > 0 ? damage / elapsedSeconds : 0;
            dpsLines.push(`Tower ${towerId} (Lv ${level}, ${color}): ${dps.toFixed(1)} DPS`);
        }

        if (dpsLines.length) {
            lines.push('Tower DPS:');
            lines.push(...dpsLines);
        }
    }

    overlay.textContent = lines.join('\n');
}

function bindButtons(game) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    if (game.mergeBtn) {
        const handleMerge = () => {
            if (game.waveInProgress)
                return;
            if (typeof game.manualMergeTowers === 'function') {
                const active = game.manualMergeTowers();
                game.updateMergeButtonState?.(active);
            }
        };
        game.mergeBtn.addEventListener('click', handleMerge);
        game.mergeBtn.disabled = game.waveInProgress;
    }
    const handleRestart = async () => {
        if (game.restartBtn && game.restartBtn.disabled) {
            return;
        }
        if (game.restartBtn) {
            game.restartBtn.disabled = true;
        }
        const endRestartBtn = game.endRestartBtn;
        if (endRestartBtn) {
            endRestartBtn.disabled = true;
        }

        try {
            await showCrazyGamesAdWithPause(game, { reason: 'restart', adType: 'midgame' });
        } catch (error) {
            console.warn('Restart ad failed', error);
        }

        try {
            game.restart();
            hideEndScreen(game);
            if (game.mergeBtn) {
                game.mergeBtn.disabled = false;
            }
            if (game.pauseBtn) {
                game.pauseBtn.disabled = false;
            }
            if (game.tutorial) {
                game.tutorial.reset();
                game.tutorial.start();
            }
        } finally {
            if (game.restartBtn) {
                game.restartBtn.disabled = false;
            }
            if (endRestartBtn) {
                endRestartBtn.disabled = false;
            }
        }
    };
    game.restartBtn.addEventListener('click', handleRestart);
    if (game.startBtn) {
        game.startBtn.addEventListener('click', () => {
            if (game.startOverlay) {
                game.startOverlay.classList.add('hidden');
            }
            game.nextWaveBtn.disabled = false;
            game.restartBtn.disabled = false;
            if (game.mergeBtn) {
                game.mergeBtn.disabled = false;
            }
            if (game.pauseBtn) {
                game.pauseBtn.disabled = false;
            }
            if (!game.hasStarted) {
                game.hasStarted = true;
                game.tutorial?.start();
                game.run();
            }
        }, { once: true });
    }
    if (game.endRestartBtn) {
        game.endRestartBtn.addEventListener('click', handleRestart);
    }
}

function updateMergeButtonState(game, active) {
    const button = game?.mergeBtn;
    if (!button) {
        return;
    }
    if (typeof button.setAttribute === 'function') {
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (button.classList && typeof button.classList.toggle === 'function') {
        button.classList.toggle('is-active', Boolean(active));
    }
}

function bindAudioButtons(game) {
    const toggleMute = () => {
        game.setAudioMuted(!game.audioMuted);
        persistAudioSettings(game);
        updateAudioControls(game);
    };
    const muteButtons = [game.muteBtn, game.pauseMuteBtn];
    muteButtons.forEach(button => {
        if (!button) {
            return;
        }
        button.addEventListener('click', () => {
            toggleMute();
        });
    });

    const toggleMusic = () => {
        game.setMusicEnabled(!game.musicEnabled);
        persistAudioSettings(game);
        updateAudioControls(game);
    };
    const musicButtons = [game.musicBtn, game.pauseMusicBtn];
    musicButtons.forEach(button => {
        if (!button) {
            return;
        }
        button.addEventListener('click', () => {
            toggleMusic();
        });
    });
}

function bindPauseSettings(game) {
    updateLanguageControls(game);

    if (typeof game.addLanguageListener === 'function') {
        game.addLanguageListener(() => {
            updateLanguageControls(game);
        });
    }

    const select = game.pauseLanguageSelect;
    if (select) {
        select.addEventListener('change', () => {
            const selected = select.value || 'en';
            if (typeof game.setLanguage === 'function') {
                const changed = game.setLanguage(selected);
                if (!changed) {
                    updateLanguageControls(game);
                }
            }
            else {
                game.language = selected || 'en';
            }
            updateLanguageControls(game);
        });
    }
}

function persistAudioSettings(game) {
    saveAudioSettings({
        muted: Boolean(game.audioMuted),
        musicEnabled: Boolean(game.musicEnabled),
    });
}

export function updateAudioControls(game) {
    updateMuteButton(game);
    updateMusicButton(game);
}

function updateMuteButton(game) {
    const muted = Boolean(game.audioMuted);
    const buttons = [game.muteBtn, game.pauseMuteBtn].filter(Boolean);
    if (buttons.length === 0) {
        return;
    }
    buttons.forEach(button => {
        if (typeof button.textContent !== 'undefined') {
            const key = muted ? 'audio.unmute' : 'audio.mute';
            const fallback = muted ? 'Unmute' : 'Mute';
            button.textContent = translate(key, {}, fallback);
        }
        if (typeof button.setAttribute === 'function') {
            button.setAttribute('aria-pressed', muted ? 'true' : 'false');
        }
    });
}

function updateMusicButton(game) {
    const enabled = Boolean(game.musicEnabled);
    const buttons = [game.musicBtn, game.pauseMusicBtn].filter(Boolean);
    if (buttons.length === 0) {
        return;
    }
    buttons.forEach(button => {
        if (typeof button.textContent !== 'undefined') {
            const key = enabled ? 'audio.musicOn' : 'audio.musicOff';
            const fallback = enabled ? 'Music On' : 'Music Off';
            button.textContent = translate(key, {}, fallback);
        }
        if (typeof button.setAttribute === 'function') {
            button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        }
    });
}

function updateLanguageControls(game) {
    const select = game.pauseLanguageSelect;
    if (!select) {
        return;
    }
    const current = resolveSupportedLanguage(game.language) ?? DEFAULT_LANGUAGE;
    if (select.value !== current) {
        select.value = current;
    }
}

function setupStartMenu(game) {
    if (!game.startOverlay)
        return;
    game.startOverlay.classList.remove('hidden');
    if (game.nextWaveBtn)
        game.nextWaveBtn.disabled = true;
    if (game.restartBtn)
        game.restartBtn.disabled = true;
    if (game.mergeBtn)
        game.mergeBtn.disabled = true;
    if (game.pauseBtn)
        game.pauseBtn.disabled = true;
    hideEndScreen(game);
}

function hideEndScreen(game) {
    if (!game.endOverlay)
        return;
    game.endOverlay.classList.add('hidden');
    if (game.endMenu) {
        game.endMenu.classList.remove('win');
        game.endMenu.classList.remove('lose');
    }
}

function showEndScreen(game, outcome) {
    if (!game.endOverlay)
        return;
    const isWin = outcome === 'WIN';
    const result = isWin ? 'win' : 'lose';
    game.endOverlay.classList.remove('hidden');
    if (game.endMenu) {
        game.endMenu.classList.toggle('win', isWin);
        game.endMenu.classList.toggle('lose', !isWin);
    }
    updateEndScreenMessages(game, result);
    updateEndScreenScore(game);
    game.lastEndOutcome = result;
    game.updateEndScreenLocalization = () => {
        updateEndScreenMessages(game, game.lastEndOutcome);
        updateEndScreenScore(game);
    };
}

function updateEndScreenScore(game) {
    const { current, best } = resolveScorePair(game);
    if (game.endScoreEl && typeof game.endScoreEl.textContent !== 'undefined') {
        game.endScoreEl.textContent = translate('end.score', { value: current }, `Score: ${current}`);
    }
    if (game.endBestScoreEl && typeof game.endBestScoreEl.textContent !== 'undefined') {
        game.endBestScoreEl.textContent = translate('end.best', { value: best }, `Best: ${best}`);
    }
}

function updateEndScreenMessages(game, outcome) {
    if (!game) {
        return;
    }
    const isWin = outcome === 'win';
    const titleKey = isWin ? 'end.victory' : 'end.defeat';
    const detailKey = isWin ? 'end.detailWin' : 'end.detailLose';
    const titleFallback = isWin ? 'Victory!' : 'Defeat!';
    const detailFallback = isWin
        ? 'All waves cleared. Great job!'
        : 'The base was overrun. Try again!';
    if (game.endMessageEl && typeof game.endMessageEl.textContent !== 'undefined') {
        game.endMessageEl.textContent = translate(titleKey, {}, titleFallback);
    }
    if (game.endDetailEl && typeof game.endDetailEl.textContent !== 'undefined') {
        game.endDetailEl.textContent = translate(detailKey, {}, detailFallback);
    }
}

function bindCanvasInteractions(game) {
    if (!game?.canvas) {
        return;
    }

    const pointerState = {
        pointerId: null,
        tower: null,
        downPos: null,
        movedTooFar: false,
        cancelled: false,
        removalTriggered: false,
        startedRemoval: false,
        chargeSoundHandle: null,
        mergeSelection: false,
    };

    const removalDuration = Math.max(0.1, Number(gameConfig.towers?.removalHoldDuration) || 2);
    const colorSwitchThreshold = 0.28;
    const dragThreshold = 12;
    const cancelMarginFactor = 0.25;
    const host = typeof window !== 'undefined'
        ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null);

    const cancelChargeSoundTimer = () => {
        if (pointerState.chargeSoundHandle && host && typeof host.clearTimeout === 'function') {
            host.clearTimeout(pointerState.chargeSoundHandle);
        }
        pointerState.chargeSoundHandle = null;
    };

    const isTowerInGame = (tower) => Array.isArray(game?.towers) && game.towers.includes(tower);

    const resetPointerState = () => {
        if (pointerState.pointerId !== null && typeof game.canvas?.releasePointerCapture === 'function') {
            try {
                game.canvas.releasePointerCapture(pointerState.pointerId);
            } catch {
                // ignore release failures
            }
        }
        cancelChargeSoundTimer();
        pointerState.pointerId = null;
        pointerState.tower = null;
        pointerState.downPos = null;
        pointerState.movedTooFar = false;
        pointerState.cancelled = false;
        pointerState.removalTriggered = false;
        pointerState.startedRemoval = false;
    };

    const scheduleChargeSound = (pointerId) => {
        if (!pointerState.startedRemoval) {
            return;
        }
        // Preserve abrupt stop logic by clearing any pending timers
        cancelChargeSoundTimer();
        if (typeof game.audio?.playTowerRemoveCharge === 'function') {
            game.audio.playTowerRemoveCharge();
        }
    };

    const cancelTowerRemovalAttempt = (playSound) => {
        const tower = pointerState.tower;
        if (!tower || pointerState.removalTriggered || !isTowerInGame(tower)) {
            return;
        }
        const progress = typeof tower.getRemovalChargeProgress === 'function'
            ? tower.getRemovalChargeProgress()
            : 0;
        if (typeof tower.cancelRemovalCharge === 'function') {
            tower.cancelRemovalCharge();
        }
        if (playSound && pointerState.startedRemoval && progress > 0.08 && typeof game.audio?.playTowerRemoveCancel === 'function') {
            game.audio.playTowerRemoveCancel();
        }
    };

    const findTowerAtPosition = (pos) => {
        if (!Array.isArray(game?.towers)) {
            return null;
        }
        return game.towers.find(tower => isInside(pos, tower)) ?? null;
    };

    const findCellAtPosition = (pos) => {
        const cells = typeof game.getAllCells === 'function' ? game.getAllCells() : [];
        return cells.find(cell => isInside(pos, cell)) ?? null;
    };

    let hoveredTower = null;
    let hoveredCell = null;

    const clearHoveredTower = () => {
        if (hoveredTower && typeof hoveredTower.setHovered === 'function') {
            hoveredTower.setHovered(false);
        }
        hoveredTower = null;
    };

    const clearHoveredCell = () => {
        if (hoveredCell) {
            hoveredCell.hoverActive = false;
            hoveredCell.hover = 0;
        }
        hoveredCell = null;
    };

    const applyHoverHighlight = (pos) => {
        if (!pos) {
            clearHoveredTower();
            clearHoveredCell();
            return;
        }

        const tower = findTowerAtPosition(pos);
        if (tower) {
            if (tower !== hoveredTower) {
                clearHoveredTower();
                hoveredTower = tower;
            }
            if (typeof hoveredTower?.setHovered === 'function') {
                hoveredTower.setHovered(true);
            }
            clearHoveredCell();
            return;
        }

        clearHoveredTower();

        const cell = findCellAtPosition(pos);
        if (cell && !cell.occupied) {
            if (cell !== hoveredCell) {
                clearHoveredCell();
                hoveredCell = cell;
            }
            hoveredCell.hoverActive = true;
            hoveredCell.hover = 1;
            return;
        }

        clearHoveredCell();
    };

    const isWithinTowerWithMargin = (tower, pos, marginFactor) => {
        const width = tower.w ?? 0;
        const height = tower.h ?? 0;
        const marginX = width * marginFactor;
        const marginY = height * marginFactor;
        return (
            pos.x >= tower.x - marginX &&
            pos.x <= tower.x + width + marginX &&
            pos.y >= tower.y - marginY &&
            pos.y <= tower.y + height + marginY
        );
    };

    const handlePointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }
        const pointerId = typeof event.pointerId === 'number' ? event.pointerId : 0;
        const pos = getMousePos(game.canvas, event);

        applyHoverHighlight(pos);

        pointerState.pointerId = pointerId;
        pointerState.downPos = pos;
        pointerState.movedTooFar = false;
        pointerState.cancelled = false;
        pointerState.removalTriggered = false;
        pointerState.startedRemoval = false;
        pointerState.mergeSelection = false;
        pointerState.tower = null;
        cancelChargeSoundTimer();

        const tower = findTowerAtPosition(pos);
        if (tower) {
            if (game.mergeModeActive) {
                pointerState.tower = tower;
                pointerState.mergeSelection = true;
                if (typeof game.canvas?.setPointerCapture === 'function') {
                    try {
                        game.canvas.setPointerCapture(pointerId);
                    } catch {
                        // ignore capture failures
                    }
                }
                event.preventDefault();
                return;
            }
            pointerState.tower = tower;
            const started = typeof tower.beginRemovalCharge === 'function'
                ? tower.beginRemovalCharge()
                : false;
            pointerState.startedRemoval = started || Boolean(tower.isRemovalCharging?.());
            pointerState.removalTriggered = !isTowerInGame(tower);
            if (typeof game.canvas?.setPointerCapture === 'function') {
                try {
                    game.canvas.setPointerCapture(pointerId);
                } catch {
                    // ignore capture failures
                }
            }
            if (pointerState.startedRemoval) {
                scheduleChargeSound(pointerId);
            }
            event.preventDefault();
            return;
        }

        if (typeof game.canvas?.setPointerCapture === 'function') {
            try {
                game.canvas.setPointerCapture(pointerId);
            } catch {
                // ignore capture failures
            }
        }
    };

    const handlePointerMove = (event) => {
        const pos = getMousePos(game.canvas, event);
        applyHoverHighlight(pos);

        const pointerId = typeof event.pointerId === 'number' ? event.pointerId : 0;
        if (pointerState.pointerId !== pointerId) {
            return;
        }

        if (pointerState.tower) {
            if (pointerState.mergeSelection) {
                const distance = Math.hypot(pos.x - pointerState.downPos.x, pos.y - pointerState.downPos.y);
                if (distance > dragThreshold) {
                    pointerState.movedTooFar = true;
                }
                return;
            }
            if (!pointerState.removalTriggered && !isTowerInGame(pointerState.tower)) {
                pointerState.removalTriggered = true;
                cancelChargeSoundTimer();
                return;
            }
            if (pointerState.cancelled || pointerState.removalTriggered) {
                return;
            }
            const within = isWithinTowerWithMargin(pointerState.tower, pos, cancelMarginFactor);
            if (!within) {
                pointerState.cancelled = true;
                cancelChargeSoundTimer();
                cancelTowerRemovalAttempt(true);
            }
            return;
        }

        if (!pointerState.downPos) {
            return;
        }

        const distance = Math.hypot(pos.x - pointerState.downPos.x, pos.y - pointerState.downPos.y);
        if (distance > dragThreshold) {
            pointerState.movedTooFar = true;
        }
    };

    const handlePointerUp = (event) => {
        const pointerId = typeof event.pointerId === 'number' ? event.pointerId : 0;
        if (pointerState.pointerId !== pointerId) {
            return;
        }
        const pos = getMousePos(game.canvas, event);
        cancelChargeSoundTimer();

        if (pointerState.tower) {
            if (pointerState.mergeSelection) {
                if (!pointerState.movedTooFar && typeof game.selectTowerForMerge === 'function') {
                    game.selectTowerForMerge(pointerState.tower);
                }
                resetPointerState();
                return;
            }
            const tower = pointerState.tower;
            const towerInGame = isTowerInGame(tower);
            const progress = typeof tower.getRemovalChargeProgress === 'function'
                ? tower.getRemovalChargeProgress()
                : 0;
            const removalTriggered = pointerState.removalTriggered || !towerInGame || progress >= 0.999;

            if (!removalTriggered) {
                if (pointerState.cancelled) {
                    cancelTowerRemovalAttempt(true);
                } else {
                    const playCancelSound = progress > colorSwitchThreshold;
                    cancelTowerRemovalAttempt(playCancelSound);
                    if (progress <= colorSwitchThreshold) {
                        handleTowerColorSwitch(game, tower);
                    }
                }
            }

            resetPointerState();
            return;
        }

        if (!pointerState.movedTooFar) {
            handleCellTap(game, pos);
        }
        resetPointerState();
    };

    const handlePointerCancel = (event) => {
        clearHoveredTower();
        clearHoveredCell();
        const pointerId = typeof event.pointerId === 'number' ? event.pointerId : 0;
        if (pointerState.pointerId !== pointerId) {
            return;
        }
        cancelChargeSoundTimer();
        if (pointerState.tower && !pointerState.removalTriggered) {
            cancelTowerRemovalAttempt(true);
        }
        resetPointerState();
    };

    const preventContextMenu = (event) => {
        event.preventDefault();
    };

    game.canvas.addEventListener('pointerdown', handlePointerDown);
    game.canvas.addEventListener('pointermove', handlePointerMove);
    game.canvas.addEventListener('pointerup', handlePointerUp);
    game.canvas.addEventListener('pointerleave', handlePointerCancel);
    game.canvas.addEventListener('pointercancel', handlePointerCancel);
    game.canvas.addEventListener('contextmenu', preventContextMenu);
}

function handleTowerColorSwitch(game, tower) {
    if (!tower || typeof game?.switchTowerColor !== 'function') {
        return;
    }
    const switched = game.switchTowerColor(tower);
    if (switched && game.tutorial && typeof game.tutorial.handleColorSwitch === 'function') {
        game.tutorial.handleColorSwitch();
    }
}

function handleCellTap(game, pos) {
    const cell = typeof game.getAllCells === 'function'
        ? game.getAllCells().find(c => isInside(pos, c))
        : null;
    if (cell) {
        tryShoot(game, cell);
    }
}

function tryShoot(game, cell) {
    if (!cell.occupied) {
        if (game.energy >= game.towerCost) {
            const tower = new Tower(cell.x, cell.y);
            tower.alignToCell(cell);
            tower.triggerPlacementFlash();
            game.towers.push(tower);
            cell.occupied = true;
            cell.tower = tower;
            tower.cell = cell;
            game.energy -= game.towerCost;
            updateHUD(game);
            if (game.audio && typeof game.audio.playPlacement === 'function') {
                game.audio.playPlacement();
            }
            if (game.tutorial) {
                game.tutorial.handleTowerPlaced();
            }
        } else {
            cell.highlight = 0.3;
            if (typeof game.audio?.playError === 'function') {
                game.audio.playError();
            }
        }
    }
}

export function updateHUD(game) {
    renderLives(game);
    renderEnergy(game);
    renderScore(game);
    renderWaveInfo(game);
    updateWavePhaseIndicator(game);
    if (typeof game.persistState === 'function') {
        game.persistState();
    }
}

function resolveScorePair(game) {
    const current = Number.isFinite(game.score) ? Math.max(0, Math.floor(game.score)) : 0;
    const bestCandidate = Number.isFinite(game.bestScore) ? Math.max(0, Math.floor(game.bestScore)) : 0;
    const best = Math.max(current, bestCandidate);
    return { current, best };
}

function renderScore(game) {
    const { current, best } = resolveScorePair(game);
    if (game.scoreEl) {
        if (typeof game.scoreEl.textContent !== 'undefined') {
            game.scoreEl.textContent = translate('hud.scoreLabel', { value: current }, `Score: ${current}`);
        }
        if (typeof game.scoreEl.setAttribute === 'function') {
            game.scoreEl.setAttribute('aria-label', translate('hud.scoreAria', { value: current }, `Score: ${current}`));
        }
    }
    if (game.bestScoreEl) {
        if (typeof game.bestScoreEl.textContent !== 'undefined') {
            game.bestScoreEl.textContent = translate('hud.bestLabel', { value: best }, `Best: ${best}`);
        }
        if (typeof game.bestScoreEl.setAttribute === 'function') {
            game.bestScoreEl.setAttribute('aria-label', translate('hud.bestAria', { value: best }, `Best score: ${best}`));
        }
    }
    if (game.scorePanelEl && typeof game.scorePanelEl.setAttribute === 'function') {
        game.scorePanelEl.setAttribute('aria-live', 'polite');
    }
}

function toggleEndlessIndicator(game, isEndless) {
    const indicator = game.endlessIndicatorEl;
    if (!indicator) {
        return;
    }
    if (indicator.classList && typeof indicator.classList.toggle === 'function') {
        indicator.classList.toggle('hidden', !isEndless);
    } else if (indicator.style) {
        indicator.style.display = isEndless ? '' : 'none';
    }
    if (typeof indicator.textContent !== 'undefined') {
        indicator.textContent = translate('hud.endlessIndicator', {}, 'Endless Mode');
    }
    if (typeof indicator.setAttribute === 'function') {
        indicator.setAttribute('aria-hidden', isEndless ? 'false' : 'true');
    }
}

function renderWaveInfo(game) {
    if (!game.waveEl) {
        return;
    }
    const endlessActive = typeof game.isEndlessWave === 'function'
        ? game.isEndlessWave()
        : game.wave > game.maxWaves;
    if (typeof game.waveEl.textContent !== 'undefined') {
        const key = endlessActive ? 'hud.waveLabelEndless' : 'hud.waveLabel';
        const params = endlessActive
            ? { current: game.wave }
            : { current: game.wave, max: game.maxWaves };
        const fallback = endlessActive
            ? `Wave: ${game.wave}`
            : `Wave: ${game.wave}/${game.maxWaves}`;
        game.waveEl.textContent = translate(key, params, fallback);
    }
    if (typeof game.waveEl.setAttribute === 'function') {
        const key = endlessActive ? 'hud.waveAriaEndless' : 'hud.waveAria';
        const params = endlessActive
            ? { current: game.wave }
            : { current: game.wave, max: game.maxWaves };
        const fallback = endlessActive
            ? `Wave ${game.wave}, endless mode`
            : `Wave ${game.wave} of ${game.maxWaves}`;
        const label = translate(key, params, fallback);
        game.waveEl.setAttribute('aria-label', label);
    }
    toggleEndlessIndicator(game, endlessActive);
}

export function updateWavePhaseIndicator(game) {
    const isInProgress = Boolean(game.waveInProgress);
    if (game.wavePhaseEl) {
        const key = isInProgress ? 'hud.wavePhase.active' : 'hud.wavePhase.prep';
        const fallback = isInProgress ? 'Wave in progress' : 'Preparation phase';
        game.wavePhaseEl.textContent = translate(key, {}, fallback);
        game.wavePhaseEl.classList.toggle('wave-phase--active', isInProgress);
        game.wavePhaseEl.classList.toggle('wave-phase--prep', !isInProgress);
    }
    if (game.wavePanelEl && game.wavePanelEl.dataset) {
        game.wavePanelEl.dataset.phase = isInProgress ? 'active' : 'prep';
    }
}

export function showWaveClearedBanner(game, waveNumber) {
    const container = game?.waveClearBannerEl;
    if (!container)
        return;

    const host = typeof window !== 'undefined' ? window : globalThis;
    if (typeof host?.clearTimeout === 'function' && game.waveClearHideHandle) {
        host.clearTimeout(game.waveClearHideHandle);
    }

    const resolvedWave = Number.isFinite(waveNumber) ? Math.max(1, waveNumber) : 1;
    const text = translate('hud.waveClearedBanner', { wave: resolvedWave }, `WAVE #${resolvedWave} CLEARED`);
    const canCreateElements = typeof document !== 'undefined'
        && typeof document.createElement === 'function';
    const textEl = canCreateElements ? document.createElement('div') : null;
    if (!textEl) {
        return;
    }
    textEl.className = 'wave-clear__text';
    const fragment = canCreateElements && typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;
    const target = fragment ?? textEl;
    Array.from(text).forEach((char, index) => {
        const letter = document.createElement('span');
        letter.className = 'wave-clear__letter';
        letter.style.setProperty('--index', String(index));
        if (char === ' ') {
            letter.classList.add('wave-clear__letter--space');
            letter.textContent = '\u00A0';
        }
        else {
            letter.textContent = char;
        }
        target.appendChild(letter);
    });
    if (fragment) {
        textEl.appendChild(fragment);
    }
    if (typeof container.replaceChildren === 'function') {
        container.replaceChildren(textEl);
    }
    else {
        container.innerHTML = '';
        container.appendChild(textEl);
    }
    container.classList.remove('wave-clear--visible');
    void container.offsetWidth;
    container.classList.add('wave-clear--visible');
    container.setAttribute('aria-hidden', 'false');

    const hide = () => {
        container.classList.remove('wave-clear--visible');
        container.setAttribute('aria-hidden', 'true');
        game.waveClearHideHandle = null;
    };

    if (typeof host?.setTimeout === 'function') {
        game.waveClearHideHandle = host.setTimeout(hide, 2400);
    }
    else {
        hide();
    }
}

function renderLives(game) {
    if (!game.livesEl)
        return;
    const configuredLives = Number.isFinite(game.initialLives) ? game.initialLives : game.lives;
    const totalLives = Math.max(configuredLives, game.lives);
    const canRenderHearts = typeof document !== 'undefined'
        && typeof document.createElement === 'function'
        && typeof game.livesEl.replaceChildren === 'function';
    if (canRenderHearts) {
        const hearts = [];
        for (let i = 0; i < totalLives; i++) {
            const heart = document.createElement('img');
            heart.src = i < game.lives ? HEART_FILLED_SRC : HEART_EMPTY_SRC;
            heart.alt = '';
            heart.className = 'life-heart';
            heart.setAttribute('aria-hidden', 'true');
            heart.draggable = false;
            hearts.push(heart);
        }
        const fragment = typeof document.createDocumentFragment === 'function'
            ? document.createDocumentFragment()
            : null;
        if (fragment) {
            hearts.forEach(heart => fragment.appendChild(heart));
            game.livesEl.replaceChildren(fragment);
        }
        else {
            game.livesEl.replaceChildren(...hearts);
        }
        if (typeof game.livesEl.setAttribute === 'function') {
            const label = translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`);
            game.livesEl.setAttribute('aria-label', label);
        }
    }
    else {
        game.livesEl.textContent = translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`);
        if (typeof game.livesEl.setAttribute === 'function') {
            const label = translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`);
            game.livesEl.setAttribute('aria-label', label);
        }
    }
}

function renderEnergy(game) {
    if (!game.energyEl)
        return;
    const amount = Number.isFinite(game.energy) ? game.energy : 0;
    const canRender = typeof document !== 'undefined'
        && typeof document.createElement === 'function'
        && typeof game.energyEl.replaceChildren === 'function';
    if (canRender) {
        const fragment = typeof document.createDocumentFragment === 'function'
            ? document.createDocumentFragment()
            : null;
        const value = document.createElement('span');
        value.className = 'resource-value';
        value.textContent = `${amount}`;
        const icon = document.createElement('img');
        icon.className = 'resource-icon';
        icon.src = 'assets/energy_sign.png';
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');
        if (fragment) {
            fragment.appendChild(value);
            fragment.appendChild(icon);
            game.energyEl.replaceChildren(fragment);
        }
        else {
            game.energyEl.replaceChildren(value, icon);
        }
        if (typeof game.energyEl.setAttribute === 'function') {
            const label = translate('hud.energyAria', { amount }, `Energy: ${amount}`);
            game.energyEl.setAttribute('aria-label', label);
        }
    }
    else {
        game.energyEl.textContent = `${amount}`;
        if (typeof game.energyEl.setAttribute === 'function') {
            const label = translate('hud.energyAria', { amount }, `Energy: ${amount}`);
            game.energyEl.setAttribute('aria-label', label);
        }
    }
}

export function endGame(game, text) {
    const isWin = text === 'WIN';
    const outcome = isWin ? 'win' : 'lose';
    game.waveInProgress = false;
    updateWavePhaseIndicator(game);
    updateStatusMessage(game, outcome);
    game.lastStatusOutcome = outcome;
    game.updateStatusLocalization = () => {
        updateStatusMessage(game, game.lastStatusOutcome);
    };
    if (game.nextWaveBtn) {
        game.nextWaveBtn.disabled = true;
    }
    if (game.restartBtn) {
        game.restartBtn.disabled = false;
    }
    if (game.mergeBtn) {
        game.mergeBtn.disabled = true;
    }
    if (game.pauseBtn) {
        game.pauseBtn.disabled = true;
    }
    showEndScreen(game, text);
    game.gameOver = true;
    if (typeof game.resume === 'function') {
        game.resume({ force: true, reason: 'system' });
    }
    callCrazyGamesEvent('gameplayStop');
    submitScoreToLeaderboard(game);
    if (typeof game.clearSavedState === 'function') {
        game.clearSavedState();
    }
}

function updateStatusMessage(game, outcome) {
    if (!game?.statusEl || !outcome) {
        return;
    }
    const isWin = outcome === 'win';
    const key = isWin ? 'hud.statusWin' : 'hud.statusLose';
    const fallback = isWin ? 'All waves cleared!' : 'Base destroyed!';
    game.statusEl.textContent = translate(key, {}, fallback);
    game.statusEl.style.color = isWin ? '#4ade80' : '#f87171';
}

function bindPauseSystem(game) {
    if (game.pauseBtn) {
        game.pauseBtn.disabled = true;
    }

    const updatePauseUi = (paused, reason) => {
        const isAdPause = reason === 'ad';
        if (game.pauseOverlay) {
            game.pauseOverlay.classList.toggle('hidden', !paused);
        }
        if (game.pauseMessageEl) {
            if (paused) {
                const key = isAdPause ? 'pause.message.ad' : 'pause.message.paused';
                const fallback = isAdPause
                    ? 'Ad break in progress. The game will resume automatically.'
                    : 'Game paused. Take a moment before resuming the defense.';
                game.pauseMessageEl.textContent = translate(key, {}, fallback);
            }
            else {
                game.pauseMessageEl.textContent = translate('pause.message.idle', {}, 'Take a breather. The battle will wait.');
            }
        }
        if (game.resumeBtn) {
            game.resumeBtn.disabled = isAdPause;
            const key = isAdPause ? 'pause.resumeAd' : 'pause.resume';
            const fallback = isAdPause ? 'Ad in progress…' : 'Resume';
            game.resumeBtn.textContent = translate(key, {}, fallback);
        }
        if (game.pauseBtn) {
            const key = paused ? 'pause.resume' : 'pause.pause';
            const fallback = paused ? 'Resume' : 'Pause';
            game.pauseBtn.textContent = translate(key, {}, fallback);
            game.pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
            const shouldDisable = !game.hasStarted || game.gameOver || (paused && isAdPause);
            game.pauseBtn.disabled = shouldDisable;
        }
        const disableForAd = paused && isAdPause;
        if (game.pauseMuteBtn) {
            game.pauseMuteBtn.disabled = disableForAd;
        }
        if (game.pauseMusicBtn) {
            game.pauseMusicBtn.disabled = disableForAd;
        }
        if (game.pauseLanguageSelect) {
            game.pauseLanguageSelect.disabled = disableForAd;
        }
    };

    if (typeof game.addPauseListener === 'function') {
        game.addPauseListener(updatePauseUi);
    }
    updatePauseUi(Boolean(game.isPaused), game.pauseReason);
    game.refreshPauseUi = () => updatePauseUi(Boolean(game.isPaused), game.pauseReason);

    if (game.resumeBtn) {
        game.resumeBtn.addEventListener('click', () => {
            if (game.pauseReason === 'ad') {
                return;
            }
            game.resume();
        });
    }

    if (game.pauseBtn) {
        game.pauseBtn.addEventListener('click', () => {
            if (!game.hasStarted || game.gameOver) {
                return;
            }
            if (game.isPaused && game.pauseReason !== 'ad') {
                game.resume();
            }
            else if (!game.isPaused) {
                game.pause();
            }
        });
    }

    const handleKeydown = event => {
        if (event.key !== 'Escape') {
            return;
        }
        if (!game.hasStarted || game.gameOver) {
            return;
        }
        if (game.pauseReason === 'ad') {
            return;
        }
        if (game.isPaused) {
            game.resume();
        }
        else {
            game.pause();
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeydown);
    }
}

function bindLeaderboard(game) {
    if (!game) {
        return;
    }

    const toggleBtn = game.leaderboardToggleBtn;
    const panel = game.leaderboardPanel;
    if (!toggleBtn || !panel) {
        return;
    }

    const listEl = game.leaderboardListEl;
    const loadingEl = game.leaderboardLoadingEl;
    const errorEl = game.leaderboardErrorEl;
    const emptyEl = game.leaderboardEmptyEl;
    const retryBtn = game.leaderboardRetryBtn;

    const state = {
        visible: false,
        loading: false,
        loadPromise: null,
        loadedOnce: false,
        loadingMessageKey: null,
        loadingMessageFallback: '',
        errorKey: null,
        errorFallback: '',
        errorParams: null,
    };
    game.leaderboardState = state;

    panel.hidden = true;
    panel.classList.add('hidden');
    toggleBtn.setAttribute('aria-expanded', 'false');
    const setToggleLabel = () => {
        if (typeof toggleBtn.textContent === 'string') {
            const key = state.visible ? 'leaderboard.toggle.hide' : 'leaderboard.toggle.show';
            const fallback = state.visible ? 'Hide Global Leaderboard' : 'View Global Leaderboard';
            toggleBtn.textContent = translate(key, {}, fallback);
        }
    };
    setToggleLabel();

    const getLoadingTextEl = () => {
        if (!loadingEl) {
            return null;
        }
        return loadingEl.querySelector('[data-loading-text]');
    };

    const clearList = () => {
        if (!listEl) {
            return;
        }
        if (typeof listEl.replaceChildren === 'function') {
            listEl.replaceChildren();
        }
        else {
            listEl.textContent = '';
        }
    };

    const setLoading = (loading, options = {}) => {
        state.loading = loading;
        const key = options?.key ?? 'leaderboard.loading';
        const fallback = options?.fallback ?? 'Loading leaderboard…';
        if (loadingEl) {
            loadingEl.classList.toggle('hidden', !loading);
            const loadingTextEl = getLoadingTextEl();
            if (loading && loadingTextEl && typeof loadingTextEl.textContent !== 'undefined') {
                loadingTextEl.textContent = translate(key, {}, fallback);
            }
        }
        if (loading) {
            state.loadingMessageKey = key;
            state.loadingMessageFallback = fallback;
        }
        else {
            state.loadingMessageKey = null;
            state.loadingMessageFallback = '';
        }
        if (panel && typeof panel.setAttribute === 'function') {
            panel.setAttribute('aria-busy', loading ? 'true' : 'false');
        }
        if (listEl && typeof listEl.setAttribute === 'function') {
            listEl.setAttribute('aria-busy', loading ? 'true' : 'false');
        }
        if (retryBtn) {
            retryBtn.classList.toggle('hidden', loading);
            retryBtn.disabled = loading;
        }
        if (toggleBtn) {
            toggleBtn.disabled = loading && state.visible;
        }
    };

    const applyStoredError = () => {
        if (!errorEl) {
            return;
        }
        const hasError = Boolean(state.errorKey || state.errorFallback);
        const text = hasError
            ? translate(state.errorKey, state.errorParams ?? {}, state.errorFallback ?? '')
            : '';
        if (typeof errorEl.textContent !== 'undefined') {
            errorEl.textContent = text;
        }
        errorEl.classList.toggle('hidden', !text);
    };

    const showError = ({ key = null, fallback = '', params = null } = {}) => {
        state.errorKey = key;
        state.errorFallback = fallback;
        state.errorParams = params;
        applyStoredError();
    };

    const showEmpty = (visible) => {
        if (!emptyEl) {
            return;
        }
        emptyEl.classList.toggle('hidden', !visible);
    };

    const renderEntries = (entries) => {
        if (!listEl) {
            return;
        }
        const fragment = typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function'
            ? document.createDocumentFragment()
            : null;
        const target = fragment ?? listEl;
        entries.forEach((entry, index) => {
            const item = document.createElement('li');
            item.className = 'leaderboard__item';

            const position = document.createElement('span');
            position.className = 'leaderboard__entry-position';
            position.textContent = `${index + 1}.`;

            const name = document.createElement('span');
            name.className = 'leaderboard__entry-name';
            name.textContent = entry.name;

            const score = document.createElement('span');
            score.className = 'leaderboard__entry-score';
            const formattedScore = typeof entry.score?.toLocaleString === 'function'
                ? entry.score.toLocaleString()
                : (Number.isFinite(entry.score) ? entry.score.toString() : `${entry.score}`);
            score.textContent = formattedScore;

            item.append(position, name, score);
            target.appendChild(item);
        });
        if (fragment) {
            listEl.replaceChildren(fragment);
        }
    };

    const hidePanel = () => {
        state.visible = false;
        panel.hidden = true;
        panel.classList.add('hidden');
        setToggleLabel();
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    const showPanel = () => {
        state.visible = true;
        panel.hidden = false;
        panel.classList.remove('hidden');
        setToggleLabel();
        toggleBtn.setAttribute('aria-expanded', 'true');
    };

    const localizeErrorDetail = (message) => {
        if (!message) {
            return translate('errors.unknown', {}, 'Unknown error');
        }
        if (message === 'Unknown error') {
            return translate('errors.unknown', {}, message);
        }
        if (message === 'Fetch API unavailable') {
            return translate('errors.fetchUnavailable', {}, message);
        }
        if (message === 'Request timed out') {
            return translate('errors.requestTimeout', {}, message);
        }
        if (message.startsWith('Request failed (' )) {
            const match = message.match(/Request failed \((\d+)\s*([^)]*)\)/);
            if (match) {
                const [, status, text] = match;
                return translate('errors.requestFailedStatusText', { status, statusText: text?.trim() ?? '' }, message);
            }
        }
        if (message.startsWith('Request failed with status ')) {
            const match = message.match(/Request failed with status\s+(\d+)/);
            if (match) {
                const [, status] = match;
                return translate('errors.requestFailedStatus', { status }, message);
            }
        }
        return message;
    };

    const handleResult = (result) => {
        if (!result?.success) {
            const detail = localizeErrorDetail(result?.error);
            const fallback = result?.error ? `Unable to load leaderboard: ${result.error}` : 'Unable to load leaderboard.';
            showError({
                key: result?.error ? 'leaderboard.error.withMessage' : 'leaderboard.error.generic',
                fallback,
                params: result?.error ? { error: detail } : undefined,
            });
            clearList();
            showEmpty(false);
            return;
        }
        state.loadedOnce = true;
        const entries = Array.isArray(result.entries) ? result.entries : [];
        if (entries.length === 0) {
            clearList();
            showError();
            showEmpty(true);
            return;
        }
        showError();
        showEmpty(false);
        renderEntries(entries);
    };

    const handleFailure = (error) => {
        const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
        console.warn('Leaderboard request failed', error);
        const detail = localizeErrorDetail(message);
        showError({
            key: 'leaderboard.error.withMessage',
            fallback: `Unable to load leaderboard: ${message}`,
            params: { error: detail },
        });
        clearList();
        showEmpty(false);
    };

    const loadLeaderboard = (options = {}) => {
        if (state.loadPromise) {
            return state.loadPromise;
        }
        const key = options?.key ?? 'leaderboard.loading';
        const fallback = options?.fallback ?? 'Loading leaderboard…';
        setLoading(true, { key, fallback });
        showError();
        showEmpty(false);
        state.loadPromise = fetchLeaderboard()
            .then(handleResult)
            .catch(handleFailure)
            .finally(() => {
                setLoading(false);
                state.loadPromise = null;
            });
        return state.loadPromise;
    };

    const toggleLeaderboard = () => {
        if (state.visible) {
            hidePanel();
            return;
        }
        showPanel();
        void loadLeaderboard();
    };

    toggleBtn.addEventListener('click', toggleLeaderboard);

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            void loadLeaderboard({
                key: state.loadedOnce ? 'leaderboard.refresh' : 'leaderboard.loading',
                fallback: state.loadedOnce ? 'Refreshing leaderboard…' : 'Loading leaderboard…',
            });
        });
    }

    if (typeof game.addPauseListener === 'function') {
        game.addPauseListener((paused, reason) => {
            const disable = !paused || reason === 'ad';
            toggleBtn.disabled = disable || (state.loading && state.visible);
            if (!paused) {
                hidePanel();
            }
        });
    }

    game.refreshLeaderboard = (options = {}) => {
        const key = options?.key ?? (state.loadedOnce ? 'leaderboard.refresh' : 'leaderboard.loading');
        const fallback = options?.fallback ?? (state.loadedOnce ? 'Refreshing leaderboard…' : 'Loading leaderboard…');
        return loadLeaderboard({ key, fallback });
    };

    const initiallyDisabled = !game.isPaused || game.pauseReason === 'ad';
    toggleBtn.disabled = initiallyDisabled;

    game.refreshLeaderboardCopy = () => {
        setToggleLabel();
        if (state.loading) {
            setLoading(true, {
                key: state.loadingMessageKey ?? 'leaderboard.loading',
                fallback: state.loadingMessageFallback || 'Loading leaderboard…',
            });
        }
        else {
            setLoading(false);
        }
        applyStoredError();
    };
}

function resolveLeaderboardPlayerName(game) {
    const candidates = [
        typeof game?.playerName === 'string' ? game.playerName : null,
        typeof game?.crazyGamesUser?.username === 'string' ? game.crazyGamesUser.username : null,
        typeof globalThis !== 'undefined' && typeof globalThis.__latestCrazyGamesUser?.username === 'string'
            ? globalThis.__latestCrazyGamesUser.username
            : null,
    ];
    const selected = candidates.find((value) => typeof value === 'string' && value.trim()) ?? undefined;
    return resolvePlayerDisplayName(selected);
}

function submitScoreToLeaderboard(game) {
    if (!game) {
        return;
    }
    const currentScore = normalizeScore(game?.score);
    if (currentScore <= 0) {
        return;
    }
    const playerName = resolveLeaderboardPlayerName(game);
    const handleFailure = (error) => {
        console.warn('Failed to submit global high score', error);
        return { success: false, error: error instanceof Error ? error.message : String(error ?? 'Unknown error') };
    };
    const submission = submitHighScore({ name: playerName, score: currentScore })
        .then((result) => {
            if (!result?.success) {
                return handleFailure(result?.error ?? 'Request failed');
            }
            if (game.leaderboardState?.visible && typeof game.refreshLeaderboard === 'function') {
                void game.refreshLeaderboard({ key: 'leaderboard.refresh', fallback: 'Refreshing leaderboard…' });
            }
            return result;
        })
        .catch(handleFailure);
    game.lastHighScoreSubmission = submission;
}
