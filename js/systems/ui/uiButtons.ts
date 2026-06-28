import gameConfig from '../../config/gameConfig.js';
import { showCrazyGamesAdWithPause } from '../ads.js';

const NORMAL_BATTLE_SPEED = 1;
const FAST_BATTLE_SPEED = 2;

function isUpgradeUnlocked(game) {
    const unlockWave = Number.isFinite(game?.upgradeUnlockWave)
        ? game.upgradeUnlockWave
        : Number.isFinite(gameConfig.towers?.upgradeUnlockWave)
            ? gameConfig.towers.upgradeUnlockWave
            : 15;
    return Number.isFinite(game?.wave) && game.wave >= unlockWave;
}

function applyUpgradeButtonVisibility(game, disabled) {
    const button = game?.upgradeBtn;
    if (!button) {
        return;
    }
    button.disabled = disabled;
    button.hidden = disabled;
    if (button.classList && typeof button.classList.toggle === 'function') {
        button.classList.toggle('hud-button--hidden', Boolean(disabled));
    }
    if (typeof button.setAttribute === 'function') {
        button.setAttribute('aria-hidden', disabled ? 'true' : 'false');
    }
}

function applyButtonDisabled(button, disabled) {
    if (button) {
        button.disabled = disabled;
    }
}

export function updateMergeButtonState(game, active) {
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

export function updateUpgradeButtonState(game, active) {
    const button = game?.upgradeBtn;
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

export function updateUpgradeAvailability(game) {
    if (!game?.upgradeBtn) {
        return;
    }
    const unlocked = isUpgradeUnlocked(game);
    const disabled = !unlocked || game.gameOver;
    applyUpgradeButtonVisibility(game, disabled);
    if (disabled && typeof game.disableUpgradeMode === 'function') {
        game.disableUpgradeMode();
    }
}

const bindMergeButton = (game) => {
    if (!game.mergeBtn) {
        return;
    }
    const handleMerge = () => {
        if (game.waveInProgress) {
            return;
        }
        if (typeof game.manualMergeTowers === 'function') {
            const active = game.manualMergeTowers();
            game.updateMergeButtonState?.(active);
        }
    };
    game.mergeBtn.addEventListener('click', handleMerge);
    game.mergeBtn.disabled = game.waveInProgress;
};

const bindUpgradeButton = (game) => {
    if (!game.upgradeBtn) {
        return;
    }
    const handleUpgradeToggle = () => {
        if (game.waveInProgress && !isUpgradeUnlocked(game)) {
            return;
        }
        if (typeof game.toggleUpgradeMode === 'function') {
            const active = game.toggleUpgradeMode();
            game.updateUpgradeButtonState?.(active);
        }
    };
    game.upgradeBtn.addEventListener('click', handleUpgradeToggle);
    updateUpgradeAvailability(game);
};

const unlockMainControls = (game) => {
    game.nextWaveBtn.disabled = false;
    game.restartBtn.disabled = false;
    applyButtonDisabled(game.settingsBtn, false);
    applyButtonDisabled(game.speedUpBtn, false);
    if (game.mergeBtn) {
        game.mergeBtn.disabled = false;
    }
    updateUpgradeAvailability(game);
    if (game.pauseBtn) {
        game.pauseBtn.disabled = false;
    }
};

function updateSpeedButtonState(game, fast) {
    const button = game?.speedUpBtn;
    if (!button) {
        return;
    }
    if (typeof button.setAttribute === 'function') {
        button.setAttribute('aria-pressed', fast ? 'true' : 'false');
    }
    if (button.classList && typeof button.classList.toggle === 'function') {
        button.classList.toggle('is-active', fast);
    }
}

const resetTutorial = (game) => {
    if (!game.tutorial) {
        return;
    }
    game.tutorial.reset();
    game.tutorial.start();
};

const runRestart = (game, hideEndScreen) => {
    if (typeof game.setTimeScale === 'function') {
        game.setTimeScale(NORMAL_BATTLE_SPEED);
    }
    updateSpeedButtonState(game, false);
    game.restart();
    hideEndScreen(game);
    if (game.mergeBtn) {
        game.mergeBtn.disabled = false;
    }
    updateUpgradeAvailability(game);
    if (game.pauseBtn) {
        game.pauseBtn.disabled = false;
    }
    resetTutorial(game);
};

const bindSettingsButton = (game) => {
    if (!game.settingsBtn) {
        return;
    }
    game.settingsBtn.addEventListener('click', () => {
        if (!game.hasStarted || game.gameOver || game.pauseReason === 'ad') {
            return;
        }
        if (!game.isPaused && typeof game.pause === 'function') {
            game.pause('manual');
        }
    });
};

const bindSpeedButton = (game) => {
    if (!game.speedUpBtn) {
        return;
    }
    game.speedUpBtn.addEventListener('click', () => {
        if (!game.hasStarted || game.gameOver || typeof game.setTimeScale !== 'function') {
            return;
        }
        const current = typeof game.getTimeScale === 'function'
            ? game.getTimeScale()
            : game.timeScale ?? NORMAL_BATTLE_SPEED;
        const fast = current < FAST_BATTLE_SPEED;
        const applied = game.setTimeScale(fast ? FAST_BATTLE_SPEED : NORMAL_BATTLE_SPEED);
        updateSpeedButtonState(game, applied >= FAST_BATTLE_SPEED);
    });
    updateSpeedButtonState(game, false);
};

const createRestartHandler = (game, hideEndScreen) => async () => {
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
        runRestart(game, hideEndScreen);
    } finally {
        if (game.restartBtn) {
            game.restartBtn.disabled = false;
        }
        if (endRestartBtn) {
            endRestartBtn.disabled = false;
        }
    }
};

const bindStartButton = (game) => {
    if (!game.startBtn) {
        return;
    }
    game.startBtn.addEventListener('click', () => {
        if (game.startOverlay) {
            game.startOverlay.classList.add('hidden');
        }
        unlockMainControls(game);
        if (!game.hasStarted) {
            game.hasStarted = true;
            game.tutorial?.start();
            game.run();
        }
    }, { once: true });
};

export function bindButtons(game, { hideEndScreen }) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    bindMergeButton(game);
    bindUpgradeButton(game);
    bindSettingsButton(game);
    bindSpeedButton(game);

    const handleRestart = createRestartHandler(game, hideEndScreen);
    game.restartBtn.addEventListener('click', handleRestart);
    bindStartButton(game);
    if (game.endRestartBtn) {
        game.endRestartBtn.addEventListener('click', handleRestart);
    }
}
