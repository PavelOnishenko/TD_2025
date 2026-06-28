import { translate } from '../localization.js';

const isManualPauseAvailable = (game) => game.hasStarted && !game.gameOver && game.pauseReason !== 'ad';

const updatePauseOverlay = (game, paused) => {
    if (game.pauseOverlay) {
        game.pauseOverlay.classList.toggle('hidden', !paused);
    }
};

const updatePauseMessage = (game, paused, isAdPause) => {
    if (!game.pauseMessageEl) {
        return;
    }
    if (!paused) {
        game.pauseMessageEl.textContent = translate('pause.message.idle', {}, 'Take a breather. The battle will wait.');
        return;
    }
    const key = isAdPause ? 'pause.message.ad' : 'pause.message.paused';
    const fallback = isAdPause
        ? 'Ad break in progress. The game will resume automatically.'
        : 'Game paused. Take a moment before resuming the defense.';
    game.pauseMessageEl.textContent = translate(key, {}, fallback);
};

const updateResumeButton = (game, isAdPause) => {
    if (!game.resumeBtn) {
        return;
    }
    game.resumeBtn.disabled = isAdPause;
    const key = isAdPause ? 'pause.resumeAd' : 'pause.resume';
    const fallback = isAdPause ? 'Ad in progressâ€¦' : 'Resume';
    game.resumeBtn.textContent = translate(key, {}, fallback);
};

const setHudButtonLabel = (button, label) => {
    const labelEl = typeof button.querySelector === 'function'
        ? button.querySelector('.hud-button__label')
        : null;
    if (labelEl) {
        labelEl.textContent = label;
    } else if (typeof button.textContent !== 'undefined') {
        button.textContent = label;
    }
    if (typeof button.setAttribute === 'function') {
        button.setAttribute('aria-label', label);
    }
};

const updatePauseButton = (game, paused, isAdPause) => {
    if (!game.pauseBtn) {
        return;
    }
    const key = paused ? 'pause.resume' : 'pause.pause';
    const fallback = paused ? 'Resume' : 'Pause';
    setHudButtonLabel(game.pauseBtn, translate(key, {}, fallback));
    game.pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    game.pauseBtn.disabled = !game.hasStarted || game.gameOver || (paused && isAdPause);
};

const updatePauseControls = (game, disabled) => {
    if (game.pauseMuteBtn) {
        game.pauseMuteBtn.disabled = disabled;
    }
    if (game.pauseMusicBtn) {
        game.pauseMusicBtn.disabled = disabled;
    }
    if (game.pauseLanguageSelect) {
        game.pauseLanguageSelect.disabled = disabled;
    }
};

const updatePauseUi = (game, paused, reason) => {
    const isAdPause = reason === 'ad';
    updatePauseOverlay(game, paused);
    updatePauseMessage(game, paused, isAdPause);
    updateResumeButton(game, isAdPause);
    updatePauseButton(game, paused, isAdPause);
    updatePauseControls(game, paused && isAdPause);
};

const toggleManualPause = (game) => {
    if (!isManualPauseAvailable(game)) {
        return;
    }
    if (game.isPaused) {
        game.resume();
        return;
    }
    game.pause();
};

const bindResumeButton = (game) => {
    if (!game.resumeBtn) {
        return;
    }
    game.resumeBtn.addEventListener('click', () => {
        if (game.pauseReason !== 'ad') {
            game.resume();
        }
    });
};

const bindPauseButton = (game) => {
    if (!game.pauseBtn) {
        return;
    }
    game.pauseBtn.addEventListener('click', () => {
        toggleManualPause(game);
    });
};

const bindPauseKey = (game) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            toggleManualPause(game);
        }
    });
};

export function bindPauseSystem(game) {
    if (game.pauseBtn) {
        game.pauseBtn.disabled = true;
    }

    const refresh = (paused, reason) => updatePauseUi(game, paused, reason);
    if (typeof game.addPauseListener === 'function') {
        game.addPauseListener(refresh);
    }
    refresh(Boolean(game.isPaused), game.pauseReason);
    game.refreshPauseUi = () => refresh(Boolean(game.isPaused), game.pauseReason);

    bindResumeButton(game);
    bindPauseButton(game);
    bindPauseKey(game);
}
