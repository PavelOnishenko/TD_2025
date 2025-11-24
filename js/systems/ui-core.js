import Tower from '../entities/Tower.js';
import { translate } from './localization.js';
import { attachTutorial } from './tutorial.js';

const HEART_FILLED_SRC = 'assets/heart_filled.png';
const HEART_EMPTY_SRC = 'assets/heart_empty.png';

export function bindHudElements(game) {
    if (!game) return;
    const ids = ['lives', 'energy', 'scorePanel', 'score', 'bestScore', 'wavePanel', 'wave', 'wavePhase',
        'endlessIndicator', 'status', 'nextWave', 'restart', 'muteToggle', 'musicToggle', 'mergeTowers',
        'upgradeTowers', 'pause', 'startOverlay', 'startGame', 'endOverlay', 'endMenu', 'endMessage',
        'endDetail', 'endScore', 'endBestScore', 'endRestart', 'pauseOverlay', 'pauseMessage',
        'resumeGame', 'pauseSoundToggle', 'pauseMusicToggle', 'diagnosticsOverlay', 'waveClearBanner'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) game[`${id}El`] = el;
    });
    attachTutorial(game);
}

export function bindAudioButtons(game) {
    const toggleMute = () => {
        game.setAudioMuted?.(!game.audioMuted);
        updateMuteButton(game);
    };
    const toggleMusic = () => {
        game.setMusicEnabled?.(!game.musicEnabled);
        updateMusicButton(game);
    };
    [game.muteToggleEl, game.pauseSoundToggleEl].forEach(btn => btn?.addEventListener('click', toggleMute));
    [game.musicToggleEl, game.pauseMusicToggleEl].forEach(btn => btn?.addEventListener('click', toggleMusic));
    updateAudioControls(game);
}

export function bindPrimaryButtons(game) {
    game.nextWaveEl?.addEventListener('click', () => game.startWave?.());
    game.restartEl?.addEventListener('click', () => game.restart?.());
    game.startGameEl?.addEventListener('click', () => game.run?.());
    game.resumeGameEl?.addEventListener('click', () => game.resume?.());
    game.endRestartEl?.addEventListener('click', () => game.restart?.());
    game.pauseEl?.addEventListener('click', () => {
        if (!game.hasStarted) return;
        game.isPaused ? game.resume?.() : game.pause?.();
    });
}

export function setupStartMenu(game) {
    game.startOverlayEl?.classList.remove('hidden');
    setButtonDisabled(game.nextWaveEl, true);
    setButtonDisabled(game.restartEl, true);
    setButtonDisabled(game.mergeTowersEl, true);
    setButtonDisabled(game.pauseEl, true);
    hideEndScreen(game);
}

export function updateHUD(game) {
    renderLives(game);
    renderEnergy(game);
    renderScore(game);
    renderWave(game);
    updateStatus(game);
    game.persistState?.();
}

function renderLives(game) {
    const container = game?.livesEl;
    if (!container?.replaceChildren) return;
    container.replaceChildren();
    const maxLives = Number.isFinite(game.maxLives) ? game.maxLives : game.lives ?? 0;
    for (let i = 0; i < maxLives; i += 1) {
        const img = Object.assign(document.createElement('img'), {
            src: i < game.lives ? HEART_FILLED_SRC : HEART_EMPTY_SRC,
            alt: '',
            className: 'life',
        });
        container.appendChild(img);
    }
    container.setAttribute('aria-label', translate('hud.livesAria', { value: game.lives }, `Lives: ${game.lives}`));
}

function renderEnergy(game) {
    const el = game?.energyEl;
    if (!el?.replaceChildren) return;
    const value = document.createElement('span');
    value.className = 'resource-value';
    value.textContent = `${game.energy ?? 0}`;
    const icon = Object.assign(document.createElement('img'), {
        src: 'assets/energy_sign.png',
        alt: '',
        className: 'resource-icon',
    });
    el.replaceChildren(value, icon);
    el.setAttribute('aria-label', translate('hud.energyAria', { amount: game.energy }, `Energy: ${game.energy}`));
}

function renderScore(game) {
    const current = Math.max(0, Math.floor(game.score ?? 0));
    if (game.scoreEl) game.scoreEl.textContent = translate('hud.scoreLabel', { value: current }, `Score: ${current}`);
}

function renderWave(game) {
    if (!game.waveEl) return;
    game.waveEl.textContent = `${game.wave ?? 0}`;
    if (game.wavePanelEl?.setAttribute) {
        game.wavePanelEl.setAttribute('aria-label', translate('hud.wave', { value: game.wave }, `Wave ${game.wave}`));
    }
}

export function updateStatus(game, outcome = null) {
    if (!game?.statusEl) return;
    if (outcome === 'win' || outcome === 'lose') {
        const key = outcome === 'win' ? 'hud.statusWin' : 'hud.statusLose';
        const fallback = outcome === 'win' ? 'All waves cleared!' : 'Base destroyed!';
        game.statusEl.textContent = translate(key, {}, fallback);
        return;
    }
    const label = translate('hud.statusPrep', {}, 'Preparing the next wave…');
    game.statusEl.textContent = label;
}

export function showEndScreen(game, outcome) {
    if (!game.endOverlayEl) return;
    const isWin = outcome === 'WIN' || outcome === 'win';
    game.endOverlayEl.classList.remove('hidden');
    game.endMenuEl?.classList.toggle('win', isWin);
    game.endMenuEl?.classList.toggle('lose', !isWin);
    const current = Math.max(0, Math.floor(game.score ?? 0));
    const best = Math.max(current, Math.floor(game.bestScore ?? current));
    game.endScoreEl && (game.endScoreEl.textContent = translate('end.score', { value: current }, `Score: ${current}`));
    game.endBestScoreEl && (game.endBestScoreEl.textContent = translate('end.best', { value: best }, `Best: ${best}`));
    game.endMessageEl && (game.endMessageEl.textContent = translate(isWin ? 'end.victory' : 'end.defeat', {}, isWin ? 'Victory!' : 'Defeat!'));
    game.endDetailEl && (game.endDetailEl.textContent = translate(
        isWin ? 'end.detailWin' : 'end.detailLose',
        {},
        isWin ? 'All waves cleared. Great job!' : 'The base was overrun. Try again!'
    ));
    updateStatus(game, isWin ? 'win' : 'lose');
}

export function hideEndScreen(game) {
    game.endOverlayEl?.classList.add('hidden');
    game.endMenuEl?.classList.remove('win');
    game.endMenuEl?.classList.remove('lose');
}

export function endGame(game, text) {
    const outcome = text === 'WIN' ? 'win' : 'lose';
    game.waveInProgress = false;
    game.gameOver = true;
    setButtonDisabled(game.nextWaveEl, true);
    setButtonDisabled(game.mergeTowersEl, true);
    setButtonDisabled(game.pauseEl, true);
    showEndScreen(game, outcome);
    game.resume?.({ force: true, reason: 'system' });
}

export const updateMergeButtonState = (game, active) => setButtonDisabled(game.mergeTowersEl, !active);
export const updateUpgradeButtonState = (game, active) => setButtonDisabled(game.upgradeTowersEl, !active);

export function tryPlaceTower(game, cell) {
    if (!cell || cell.occupied || game.energy < game.towerCost) return false;
    const tower = new Tower(cell.x, cell.y);
    tower.alignToCell?.(cell);
    tower.triggerPlacementFlash?.();
    game.towers.push(tower);
    cell.occupied = true;
    cell.tower = tower;
    tower.cell = cell;
    game.energy -= game.towerCost;
    updateHUD(game);
    game.audio?.playPlacement?.();
    game.tutorial?.handleTowerPlaced?.();
    return true;
}

const setButtonDisabled = (button, value) => { if (button) button.disabled = Boolean(value); };

export function updateAudioControls(game) {
    updateMuteButton(game);
    updateMusicButton(game);
}

function updateMuteButton(game) {
    const muted = Boolean(game.audioMuted);
    const label = translate(muted ? 'audio.unmute' : 'audio.mute', {}, muted ? 'Unmute' : 'Mute');
    [game.muteToggleEl, game.pauseSoundToggleEl].forEach(button => {
        if (!button) return;
        button.textContent = label;
        button.setAttribute?.('aria-pressed', muted ? 'true' : 'false');
    });
}

function updateMusicButton(game) {
    const enabled = Boolean(game.musicEnabled);
    const label = translate(enabled ? 'audio.musicOn' : 'audio.musicOff', {}, enabled ? 'Music On' : 'Music Off');
    [game.musicToggleEl, game.pauseMusicToggleEl].forEach(button => {
        if (!button) return;
        button.textContent = label;
        button.setAttribute?.('aria-pressed', enabled ? 'true' : 'false');
    });
}
