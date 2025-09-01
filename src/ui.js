import Tower from './Tower.js';

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
}

function bindButtons(game) {
    game.nextWaveBtn.addEventListener('click', () => game.startWave());
    game.restartBtn.addEventListener('click', () => game.restart());
}

function bindCanvasClick(game) {
    game.canvas.addEventListener('click', e => {
        const pos = getMousePos(game.canvas, e);
        const tower = game.towers.find(t => isInside(pos, t));
        if (tower) {
            game.switchTowerColor(tower);
            return;
        }

        const cell = game.grid.find(c => isInside(pos, c));
        if (!cell) return;
        if (!cell.occupied) {
            if (game.gold >= game.towerCost) {
                const tower = new Tower(cell.x, cell.y);
                // todo how can we fix magic numbers here? 
                // It's done so that towers are placed visually in correct place at cell
                tower.x -= tower.w / 4;
                tower.y -= tower.h * 0.8;
                game.towers.push(tower);
                cell.occupied = true;
                game.gold -= game.towerCost;
                updateHUD(game);
            } else {
                cell.highlight = 0.3;
            }
        }
    });
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
    game.statusEl.textContent = text;
    game.statusEl.style.color = 'red';
    game.nextWaveBtn.disabled = true;
    game.gameOver = true;
}
