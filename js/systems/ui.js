import Tower from '../entities/Tower.js';
import { callCrazyGamesEvent } from './crazyGamesIntegration.js';

function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    // Map from CSS pixels to canvas logical coordinates for precise hit testing
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
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
    bindButtons(game);
    bindCanvasClick(game);
    updateHUD(game);
    updateSwitchIndicator(game);
    setupStartMenu(game);
}

function bindHUD(game) {
    game.livesEl = document.getElementById('lives');
    game.goldEl = document.getElementById('gold');
    game.waveEl = document.getElementById('wave');
    game.cooldownEl = document.getElementById('cooldown');
    game.statusEl = document.getElementById('status');
    game.tipEl = document.getElementById('tip');
    game.nextWaveBtn = document.getElementById('nextWave');
    game.restartBtn = document.getElementById('restart');
    game.startOverlay = document.getElementById('startOverlay');
    game.startBtn = document.getElementById('startGame');
    game.endOverlay = document.getElementById('endOverlay');
    game.endMenu = document.getElementById('endMenu');
    game.endMessageEl = document.getElementById('endMessage');
    game.endDetailEl = document.getElementById('endDetail');
    game.endRestartBtn = document.getElementById('endRestart');
}

function bindButtons(game) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    const handleRestart = () => {
        game.restart();
        hideEndScreen(game);
    };
    game.restartBtn.addEventListener('click', handleRestart);
    if (game.startBtn) {
        game.startBtn.addEventListener('click', () => {
            if (game.startOverlay) {
                game.startOverlay.classList.add('hidden');
            }
            game.nextWaveBtn.disabled = false;
            game.restartBtn.disabled = false;
            if (!game.hasStarted) {
                game.hasStarted = true;
                game.run();
            }
        }, { once: true });
    }
    if (game.endRestartBtn) {
        game.endRestartBtn.addEventListener('click', handleRestart);
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
            game.switchTowerColor(tower);
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
        if (game.gold >= game.towerCost) {
            const tower = new Tower(cell.x, cell.y);
            tower.alignToCell(cell);
            game.towers.push(tower);
            cell.occupied = true;
            cell.tower = tower;
            tower.cell = cell;
            game.gold -= game.towerCost;
            updateHUD(game);
        } else {
            cell.highlight = 0.3;
        }
    }
}

export function updateHUD(game) {
    game.livesEl.textContent = `Lives: ${game.lives}`;
    game.goldEl.textContent = `Gold: ${game.gold}`;
    game.waveEl.textContent = `Wave: ${game.wave}/${game.maxWaves}`;
}

export function updateSwitchIndicator(game) {
    if (!game.cooldownEl) return;
    game.cooldownEl.textContent =
        game.switchCooldown > 0
            ? `Switch: ${game.switchCooldown.toFixed(1)}s`
            : 'Switch: Ready';
}

export function endGame(game, text) {
    const isWin = text === 'WIN';
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
    showEndScreen(game, text);
    game.gameOver = true;
    callCrazyGamesEvent('gameplayStop');
}
