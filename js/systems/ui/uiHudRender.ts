import { translate } from '../localization.js';
import { updateUpgradeAvailability } from './uiButtons.js';
import { UI_ASSET_PATHS } from '../../config/uiAssets.js';

export function resolveScorePair(game) {
    const current = game.scoreManager ? game.scoreManager.getCurrentScore() : 0;
    const bestCandidate = game.scoreManager ? game.scoreManager.getBestScore() : 0;
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

function getWaveLabelCopy(game, endlessActive) {
    if (endlessActive) {
        return {
            key: 'hud.waveLabelEndless',
            params: { current: game.wave },
            fallback: `Wave: ${game.wave}`,
        };
    }
    return {
        key: 'hud.waveLabel',
        params: { current: game.wave, max: game.maxWaves },
        fallback: `Wave: ${game.wave}/${game.maxWaves}`,
    };
}

function getWaveAriaCopy(game, endlessActive) {
    if (endlessActive) {
        return {
            key: 'hud.waveAriaEndless',
            params: { current: game.wave },
            fallback: `Wave ${game.wave}, endless mode`,
        };
    }
    return {
        key: 'hud.waveAria',
        params: { current: game.wave, max: game.maxWaves },
        fallback: `Wave ${game.wave} of ${game.maxWaves}`,
    };
}

function renderWaveInfo(game) {
    if (!game.waveEl) {
        return;
    }
    const endlessActive = typeof game.isEndlessWave === 'function'
        ? game.isEndlessWave()
        : game.wave > game.maxWaves;
    if (typeof game.waveEl.textContent !== 'undefined') {
        const copy = getWaveLabelCopy(game, endlessActive);
        game.waveEl.textContent = translate(copy.key, copy.params, copy.fallback);
    }
    if (typeof game.waveEl.setAttribute === 'function') {
        const copy = getWaveAriaCopy(game, endlessActive);
        game.waveEl.setAttribute('aria-label', translate(copy.key, copy.params, copy.fallback));
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

const createWaveClearLetter = (char, index) => {
    const letter = document.createElement('span');
    letter.className = 'wave-clear__letter';
    letter.style.setProperty('--index', String(index));
    if (char === ' ') {
        letter.classList.add('wave-clear__letter--space');
        letter.textContent = '\u00A0';
    } else {
        letter.textContent = char;
    }
    return letter;
};

const createWaveClearText = (text) => {
    const textEl = document.createElement('div');
    textEl.className = 'wave-clear__text';
    const fragment = typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;
    const target = fragment ?? textEl;
    Array.from(text).forEach((char, index) => {
        target.appendChild(createWaveClearLetter(char, index));
    });
    if (fragment) {
        textEl.appendChild(fragment);
    }
    return textEl;
};

const replaceBannerContent = (container, textEl) => {
    if (typeof container.replaceChildren === 'function') {
        container.replaceChildren(textEl);
        return;
    }
    container.innerHTML = '';
    container.appendChild(textEl);
};

const showBannerContainer = (container) => {
    container.classList.remove('wave-clear--visible');
    void container.offsetWidth;
    container.classList.add('wave-clear--visible');
    container.setAttribute('aria-hidden', 'false');
};

export function showWaveClearedBanner(game, waveNumber) {
    const container = game?.waveClearBannerEl;
    if (!container) {
        return;
    }
    const host = typeof window !== 'undefined' ? window : globalThis;
    if (typeof host?.clearTimeout === 'function' && game.waveClearHideHandle) {
        host.clearTimeout(game.waveClearHideHandle);
    }
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
        return;
    }
    const resolvedWave = Number.isFinite(waveNumber) ? Math.max(1, waveNumber) : 1;
    const text = translate('hud.waveClearedBanner', { wave: resolvedWave }, `WAVE #${resolvedWave} CLEARED`);
    replaceBannerContent(container, createWaveClearText(text));
    showBannerContainer(container);
    const hide = () => {
        container.classList.remove('wave-clear--visible');
        container.setAttribute('aria-hidden', 'true');
        game.waveClearHideHandle = null;
    };
    if (typeof host?.setTimeout === 'function') {
        game.waveClearHideHandle = host.setTimeout(hide, 2400);
        return;
    }
    hide();
}

const createHeart = (filled) => {
    const heart = document.createElement('img');
    heart.src = UI_ASSET_PATHS.heart;
    heart.alt = '';
    heart.className = filled ? 'life-heart life-heart--filled' : 'life-heart life-heart--empty';
    heart.setAttribute('aria-hidden', 'true');
    heart.draggable = false;
    return heart;
};

const renderHeartLives = (game, totalLives) => {
    const hearts = [];
    for (let i = 0; i < totalLives; i++) {
        hearts.push(createHeart(i < game.lives));
    }
    const fragment = typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;
    if (fragment) {
        hearts.forEach(heart => fragment.appendChild(heart));
        game.livesEl.replaceChildren(fragment);
        return;
    }
    game.livesEl.replaceChildren(...hearts);
};

const updateLivesAria = (game) => {
    if (typeof game.livesEl.setAttribute === 'function') {
        const label = translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`);
        game.livesEl.setAttribute('aria-label', label);
    }
};

function renderLives(game) {
    if (!game.livesEl) {
        return;
    }
    const configuredLives = Number.isFinite(game.initialLives) ? game.initialLives : game.lives;
    const totalLives = Math.max(configuredLives, game.lives);
    const canRenderHearts = typeof document !== 'undefined'
        && typeof document.createElement === 'function'
        && typeof game.livesEl.replaceChildren === 'function';
    if (canRenderHearts) {
        renderHeartLives(game, totalLives);
    } else {
        game.livesEl.textContent = translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`);
    }
    updateLivesAria(game);
}

const setEnergyAria = (game, amount) => {
    if (typeof game.energyEl.setAttribute === 'function') {
        const label = translate('hud.energyAria', { amount }, `Energy: ${amount}`);
        game.energyEl.setAttribute('aria-label', label);
    }
};

const createEnergyFragment = (amount) => {
    const fragment = typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;
    const value = document.createElement('span');
    value.className = 'resource-value';
    value.textContent = `${amount}`;
    const icon = document.createElement('img');
    icon.className = 'resource-icon';
    icon.src = UI_ASSET_PATHS.energyIcon;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    return { fragment, value, icon };
};

function renderEnergy(game) {
    if (!game.energyEl) {
        return;
    }
    const amount = Number.isFinite(game.energy) ? game.energy : 0;
    const canRender = typeof document !== 'undefined'
        && typeof document.createElement === 'function'
        && typeof game.energyEl.replaceChildren === 'function';
    if (!canRender) {
        game.energyEl.textContent = `${amount}`;
        setEnergyAria(game, amount);
        return;
    }
    const { fragment, value, icon } = createEnergyFragment(amount);
    if (fragment) {
        fragment.appendChild(value);
        fragment.appendChild(icon);
        game.energyEl.replaceChildren(fragment);
    } else {
        game.energyEl.replaceChildren(value, icon);
    }
    setEnergyAria(game, amount);
}

export function updateHUD(game) {
    renderLives(game);
    renderEnergy(game);
    renderScore(game);
    renderWaveInfo(game);
    updateWavePhaseIndicator(game);
    updateUpgradeAvailability(game);
    if (typeof game.persistState === 'function') {
        game.persistState();
    }
}
