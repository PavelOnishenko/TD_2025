import { callCrazyGamesEvent } from './crazyGamesIntegration.js';
import { saveAudioSettings, loadLanguagePreference, saveLanguagePreference } from './dataStore.js';
import { attachTutorial } from './tutorial.js';
import { bindHUD } from './ui/uiHud.js';
import { updateHUD, updateWavePhaseIndicator, showWaveClearedBanner, resolveScorePair } from './ui/uiHudRender.js';
import { bindCanvasInteractions } from './ui/uiCanvas.js';
import { bindPauseSystem } from './ui/uiPause.js';
import { bindLeaderboard, submitScoreToLeaderboard } from './ui/uiLeaderboard.js';
import {
    bindButtons,
    updateMergeButtonState,
    updateUpgradeAvailability,
    updateUpgradeButtonState,
} from './ui/uiButtons.js';
import { translate, setActiveLocale, applyLocalization } from './localization.js';
import { bindDiagnosticsOverlay, refreshDiagnosticsOverlay } from './ui/uiDiagnostics.js';

const SUPPORTED_LANGUAGES = ['en', 'ru'];
const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];

export { refreshDiagnosticsOverlay };
export { updateHUD, updateWavePhaseIndicator, showWaveClearedBanner };

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

export function bindUI(game) {
    bindHUD(game);
    game.updateMergeButtonState = (active) => updateMergeButtonState(game, active);
    game.updateMergeButtonState(false);
    game.updateUpgradeButtonState = (active) => updateUpgradeButtonState(game, active);
    game.updateUpgradeButtonState(false);
    attachTutorial(game);
    bindButtons(game, { hideEndScreen });
    bindAudioButtons(game);
    bindPauseSettings(game);
    bindPauseSystem(game);
    bindLeaderboard(game);
    bindCanvasInteractions(game, { updateHUD });
    bindDiagnosticsOverlay(game);
    bindLocalization(game);
    updateHUD(game);
    setupStartMenu(game);
    updateAudioControls(game);
}

function refreshLocalizedUi(game) {
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
}

async function applyGameLanguage(game, language) {
    const resolved = resolveSupportedLanguage(language) ?? DEFAULT_LANGUAGE;
    await setActiveLocale(resolved);
    refreshLocalizedUi(game);
}

function bindLanguageListener(game) {
    if (typeof game.addLanguageListener !== 'function') {
        return;
    }
    game.addLanguageListener((language) => {
        const resolved = resolveSupportedLanguage(language) ?? DEFAULT_LANGUAGE;
        saveLanguagePreference(resolved);
        void applyGameLanguage(game, resolved);
    });
}

function initializeLanguage(game, initialLanguage) {
    if (typeof game.setLanguage === 'function') {
        const changed = game.setLanguage(initialLanguage);
        if (!changed) {
            void applyGameLanguage(game, initialLanguage);
        }
        return;
    }
    game.language = initialLanguage;
    void applyGameLanguage(game, initialLanguage);
}

function bindLocalization(game) {
    if (!game) {
        return;
    }
    bindLanguageListener(game);
    initializeLanguage(game, resolveInitialLanguage(game));
}

export { updateUpgradeAvailability };

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
    game.gameOver = true;
    updateUpgradeAvailability(game);
    showEndScreen(game, text);
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
