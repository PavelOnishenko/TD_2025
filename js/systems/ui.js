import Tower from '../entities/Tower.js';
import { callCrazyGamesEvent } from './crazyGamesIntegration.js';
import { saveAudioSettings } from './dataStore.js';
import { attachTutorial } from './tutorial.js';

const HEART_FILLED_SRC = 'assets/heart_filled.png';
const HEART_EMPTY_SRC = 'assets/heart_empty.png';

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
    attachTutorial(game);
    bindButtons(game);
    bindAudioButtons(game);
    bindCanvasClick(game);
    bindDeveloperReset(game);
    updateHUD(game);
    setupStartMenu(game);
    updateAudioControls(game);
}

function bindHUD(game) {
    game.livesEl = document.getElementById('lives');
    game.energyEl = document.getElementById('energy');
    game.wavePanelEl = document.getElementById('wavePanel');
    game.waveEl = document.getElementById('wave');
    game.wavePhaseEl = document.getElementById('wavePhase');
    game.statusEl = document.getElementById('status');
    game.nextWaveBtn = document.getElementById('nextWave');
    game.restartBtn = document.getElementById('restart');
    game.muteBtn = document.getElementById('muteToggle');
    game.musicBtn = document.getElementById('musicToggle');
    game.mergeBtn = document.getElementById('mergeTowers');
    game.startOverlay = document.getElementById('startOverlay');
    game.startBtn = document.getElementById('startGame');
    game.endOverlay = document.getElementById('endOverlay');
    game.endMenu = document.getElementById('endMenu');
    game.endMessageEl = document.getElementById('endMessage');
    game.endDetailEl = document.getElementById('endDetail');
    game.endRestartBtn = document.getElementById('endRestart');
    game.tutorialResetHint = document.getElementById('tutorialResetHint');
}

function bindButtons(game) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    if (game.mergeBtn) {
        const handleMerge = () => {
            if (game.waveInProgress)
                return;
            if (typeof game.manualMergeTowers === 'function') {
                game.manualMergeTowers();
            }
        };
        game.mergeBtn.addEventListener('click', handleMerge);
        game.mergeBtn.disabled = game.waveInProgress;
    }
    const handleRestart = () => {
        game.restart();
        hideEndScreen(game);
        if (game.mergeBtn) {
            game.mergeBtn.disabled = false;
        }
        if (game.tutorial) {
            game.tutorial.reset();
            game.tutorial.start();
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

function bindAudioButtons(game) {
    if (game.muteBtn) {
        game.muteBtn.addEventListener('click', () => {
            game.setAudioMuted(!game.audioMuted);
            persistAudioSettings(game);
            updateAudioControls(game);
        });
    }
    if (game.musicBtn) {
        game.musicBtn.addEventListener('click', () => {
            game.setMusicEnabled(!game.musicEnabled);
            persistAudioSettings(game);
            updateAudioControls(game);
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
    if (!game.muteBtn) {
        return;
    }
    const muted = Boolean(game.audioMuted);
    game.muteBtn.textContent = muted ? 'Unmute' : 'Mute';
    game.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}

function updateMusicButton(game) {
    if (!game.musicBtn) {
        return;
    }
    const enabled = Boolean(game.musicEnabled);
    game.musicBtn.textContent = enabled ? 'Music On' : 'Music Off';
    game.musicBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function bindDeveloperReset(game) {
    const hint = game.tutorialResetHint;
    if (!hint) {
        return;
    }

    const giveFeedback = className => {
        hint.classList.add(className);
        setTimeout(() => hint.classList.remove(className), 400);
    };

    hint.addEventListener('click', event => {
        if (!(event.altKey && event.shiftKey)) {
            giveFeedback('tutorial-reset-hint--nudge');
            return;
        }
        game.resetTutorialProgress?.();
        if (game.hasStarted) {
            game.tutorial?.start();
        }
        giveFeedback('tutorial-reset-hint--activated');
    });
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
    game.endOverlay.classList.remove('hidden');
    if (game.endMenu) {
        game.endMenu.classList.toggle('win', isWin);
        game.endMenu.classList.toggle('lose', !isWin);
    }
    if (game.endMessageEl) {
        game.endMessageEl.textContent = isWin ? 'Victory!' : 'Defeat!';
    }
    if (game.endDetailEl) {
        game.endDetailEl.textContent = isWin
            ? 'All waves cleared. Great job!'
            : 'The base was overrun. Try again!';
    }
}

function bindCanvasClick(game) {
    game.canvas.addEventListener('click', e => {
        const pos = getMousePos(game.canvas, e);
        const tower = game.towers.find(t => isInside(pos, t));
        if (tower) {
            const switched = game.switchTowerColor(tower);
            if (switched && game.tutorial) {
                game.tutorial.handleColorSwitch();
            }
            return;
        }

        const cell = game.getAllCells().find(c => isInside(pos, c));
        if (cell) {
            tryShoot(game, cell);
        }
    });
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
    if (game.waveEl) {
        game.waveEl.textContent = `Wave: ${game.wave}/${game.maxWaves}`;
    }
    updateWavePhaseIndicator(game);
    if (typeof game.persistState === 'function') {
        game.persistState();
    }
}

export function updateWavePhaseIndicator(game) {
    const isInProgress = Boolean(game.waveInProgress);
    if (game.wavePhaseEl) {
        game.wavePhaseEl.textContent = isInProgress ? 'Wave in progress' : 'Preparation phase';
        game.wavePhaseEl.classList.toggle('wave-phase--active', isInProgress);
        game.wavePhaseEl.classList.toggle('wave-phase--prep', !isInProgress);
    }
    if (game.wavePanelEl && game.wavePanelEl.dataset) {
        game.wavePanelEl.dataset.phase = isInProgress ? 'active' : 'prep';
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
            game.livesEl.setAttribute('aria-label', `Lives: ${game.lives}`);
        }
    }
    else {
        game.livesEl.textContent = `Lives: ${game.lives}`;
        if (typeof game.livesEl.setAttribute === 'function') {
            game.livesEl.setAttribute('aria-label', `Lives: ${game.lives}`);
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
            game.energyEl.setAttribute('aria-label', `Energy: ${amount}`);
        }
    }
    else {
        game.energyEl.textContent = `${amount}`;
        if (typeof game.energyEl.setAttribute === 'function') {
            game.energyEl.setAttribute('aria-label', `Energy: ${amount}`);
        }
    }
}

export function endGame(game, text) {
    const isWin = text === 'WIN';
    game.waveInProgress = false;
    updateWavePhaseIndicator(game);
    if (game.statusEl) {
        game.statusEl.textContent = isWin ? 'All waves cleared!' : 'Base destroyed!';
        game.statusEl.style.color = isWin ? '#4ade80' : '#f87171';
    }
    if (game.nextWaveBtn) {
        game.nextWaveBtn.disabled = true;
    }
    if (game.restartBtn) {
        game.restartBtn.disabled = false;
    }
    if (game.mergeBtn) {
        game.mergeBtn.disabled = true;
    }
    showEndScreen(game, text);
    game.gameOver = true;
    callCrazyGamesEvent('gameplayStop');
    if (typeof game.clearSavedState === 'function') {
        game.clearSavedState();
    }
}
