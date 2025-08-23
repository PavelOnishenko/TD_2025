import Tower from './Tower.js';

export function bindUI(game) {
    bindHUD(game);
    bindButtons(game);
    bindCanvasClick(game);
    updateHUD(game);
}

function bindHUD(game) {
    game.livesEl = document.getElementById('lives');
    game.goldEl = document.getElementById('gold');
    game.waveEl = document.getElementById('wave');
    game.statusEl = document.getElementById('status');
    game.nextWaveBtn = document.getElementById('nextWave');
    game.restartBtn = document.getElementById('restart');
}

function bindButtons(game) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    game.restartBtn.addEventListener('click', () => game.restart());
}

function bindCanvasClick(game) {
    game.canvas.addEventListener('click', e => {
        const rect = game.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const cell of game.grid) {
            if (mx >= cell.x && mx <= cell.x + cell.w && my >= cell.y && my <= cell.y + cell.h) {
                if (!cell.occupied) {
                    if (game.gold >= game.towerCost) {
                        game.towers.push(new Tower(cell.x, cell.y));
                        cell.occupied = true;
                        game.gold -= game.towerCost;
                        updateHUD(game);
                    } else {
                        cell.highlight = 0.3;
                    }
                }
                break;
            }
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
    game.gameOver = true;
}
