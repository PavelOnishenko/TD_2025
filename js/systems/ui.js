import {
    bindHudElements,
    bindAudioButtons,
    bindPrimaryButtons,
    setupStartMenu,
    updateHUD,
    endGame,
    updateAudioControls,
    updateMergeButtonState,
    updateUpgradeButtonState,
    updateStatus,
    tryPlaceTower,
} from './ui-core.js';
import { DEFAULT_TIME_SCALE } from '../core/game/world.js';

export { updateHUD, endGame, updateAudioControls };

export function bindUI(game) {
    bindHudElements(game);
    game.updateMergeButtonState = active => updateMergeButtonState(game, active);
    game.updateUpgradeButtonState = active => updateUpgradeButtonState(game, active);
    bindPrimaryButtons(game);
    bindAudioButtons(game);
    bindCanvasInteractions(game);
    setupStartMenu(game);
    updateHUD(game);
    updateWavePhaseIndicator(game);
}

function bindCanvasInteractions(game) {
    if (!game?.canvas) return;
    const handlePointerUp = event => {
        const pos = getMousePos(game.canvas, event);
        const cell = game.getAllCells?.().find(c => isInside(pos, c));
        if (cell) tryPlaceTower(game, cell);
    };
    game.canvas.addEventListener('pointerup', handlePointerUp);
    game.canvas.addEventListener('pointercancel', () => clearHover(game));
    game.canvas.addEventListener('pointerleave', () => clearHover(game));
}

function clearHover(game) {
    game.grid?.fadeHighlights?.();
}

function getMousePos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}

const isInside = (pos, rect) => pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;

export function refreshDiagnosticsOverlay(game, options = {}) {
    if (!game?.diagnosticsOverlayEl) return;
    const { dt = 0 } = options;
    const fps = dt > 0 ? (1 / dt).toFixed(1) : '—';
    game.diagnosticsOverlayEl.textContent = `Speed: ${formatTimeScale(game.timeScale ?? DEFAULT_TIME_SCALE)}\nFPS: ${fps}`;
}

function formatTimeScale(scale) {
    const normalized = Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_TIME_SCALE;
    return `${normalized.toFixed(normalized >= 10 ? 0 : 2)}x`;
}

export function updateWavePhaseIndicator(game) {
    if (!game.wavePhaseEl) return;
    const inWave = Boolean(game.waveInProgress);
    const key = inWave ? 'hud.wavePhase.active' : 'hud.wavePhase.prep';
    const fallback = inWave ? 'Wave in progress' : 'Preparation';
    game.wavePhaseEl.textContent = game.translate?.(key, {}, fallback) ?? fallback;
}

export function updateUpgradeAvailability(game) {
    const canUpgrade = Boolean(game?.towers?.length && game.energy >= (game.upgradeCost ?? game.towerCost ?? 0));
    updateUpgradeButtonState(game, canUpgrade && !game.gameOver);
}

export function showWaveClearedBanner(game, waveNumber) {
    const banner = game?.waveClearBannerEl;
    if (!banner) return;
    banner.textContent = `Wave ${waveNumber} cleared!`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 1200);
}

export function updateStatusMessage(game, outcome) {
    updateStatus(game, outcome);
}
