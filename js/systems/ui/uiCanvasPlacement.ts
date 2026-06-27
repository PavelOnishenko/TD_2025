import Tower from '../../entities/Tower.js';
import { trackTowerPlaced } from '../balanceTracking.js';
import { isInside } from './uiCanvasGeometry.js';

export function handleTowerColorSwitch(game, tower) {
    if (!tower || typeof game?.switchTowerColor !== 'function') {
        return;
    }
    const switched = game.switchTowerColor(tower);
    if (switched && game.tutorial && typeof game.tutorial.handleColorSwitch === 'function') {
        game.tutorial.handleColorSwitch();
    }
}

const rejectTowerPlacement = (game, cell) => {
    cell.highlight = 0.3;
    if (typeof game.audio?.playError === 'function') {
        game.audio.playError();
    }
};

const finishTowerPlacement = (game, cell, tower, updateHUD) => {
    game.towers.push(tower);
    cell.occupied = true;
    cell.tower = tower;
    tower.cell = cell;
    game.energy -= game.towerCost;
    game.energySpent = (game.energySpent || 0) + game.towerCost;
    trackTowerPlaced(game, game.towerCost);
    updateHUD(game);
};

function placeTower(game, cell, updateHUD) {
    const tower = new Tower(cell.x, cell.y);
    tower.alignToCell(cell);
    tower.triggerPlacementFlash();
    finishTowerPlacement(game, cell, tower, updateHUD);
    if (game.audio && typeof game.audio.playPlacement === 'function') {
        game.audio.playPlacement();
    }
    if (game.tutorial) {
        game.tutorial.handleTowerPlaced();
    }
}

function tryShoot(game, cell, updateHUD) {
    if (cell.occupied) {
        return;
    }
    if (game.energy >= game.towerCost) {
        placeTower(game, cell, updateHUD);
        return;
    }
    rejectTowerPlacement(game, cell);
}

export function handleCellTap(game, pos, updateHUD) {
    const cell = typeof game.getAllCells === 'function'
        ? game.getAllCells().find(c => isInside(pos, c))
        : null;
    if (cell) {
        tryShoot(game, cell, updateHUD);
    }
}
