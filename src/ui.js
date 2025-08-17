import Tower from './Tower.js';

export function bindUI(game) {
    bindHUD(game);
    bindButtons(game);
    bindMouseMove(game);
    bindMouseLeave(game);
    bindCanvasClick(game);
    updateHUD(game);
}

function bindHUD(game) {
    game.livesEl = document.getElementById('lives');
    game.goldEl = document.getElementById('gold');
    game.waveEl = document.getElementById('wave');
    game.statusEl = document.getElementById('status');
    game.nextWaveBtn = document.getElementById('nextWave');
    game.placeTowerBtn = document.getElementById('placeTower');
    game.restartBtn = document.getElementById('restart');
}

function bindButtons(game) {
    game.placeTowerBtn.addEventListener('click', () => {
        game.buildMode = !game.buildMode;
        game.placeTowerBtn.classList.toggle('active', game.buildMode);
        if (!game.buildMode) game.hoverCell = null;
    });
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    game.restartBtn.addEventListener('click', () => game.restart());
}

function bindMouseMove(game) {
    game.canvas.addEventListener('mousemove', e => {
        const rect = game.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        game.hoverCell = null;
        if (!game.buildMode) return;
        for (const cell of game.grid) {
            if (mx >= cell.x && mx <= cell.x + cell.w && my >= cell.y && my <= cell.y + cell.h) {
                game.hoverCell = cell;
                break;
            }
        }
    });
}

function bindMouseLeave(game) {
    game.canvas.addEventListener('mouseleave', () => {
        game.hoverCell = null;
    });
}

function bindCanvasClick(game) {
    game.canvas.addEventListener('click', () => {
        if (!game.buildMode || !game.hoverCell) return;
        const affordable = game.gold >= game.towerCost;
        const placeable = !game.hoverCell.occupied;
        if (affordable && placeable) {
            game.towers.push(new Tower(game.hoverCell.x, game.hoverCell.y));
            game.hoverCell.occupied = true;
            game.gold -= game.towerCost;
            updateHUD(game);
        }
    });
}

export function updateHUD(game) {
    game.livesEl.textContent = `Lives: ${game.lives}`;
    game.goldEl.textContent = `Gold: ${game.gold}`;
    game.waveEl.textContent = `Wave: ${game.wave}/${game.maxWaves}`;
}

export function endGame(game, text) {
    game.statusEl.textContent = text;
    game.statusEl.style.color = 'red';
    game.nextWaveBtn.disabled = true;
    game.placeTowerBtn.disabled = true;
    game.gameOver = true;
}
