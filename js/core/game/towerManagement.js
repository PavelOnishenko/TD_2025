import { balanceConfig } from '../../config/balanceConfig.js';
import { updateHUD } from '../../systems/ui.js';

const MAX_UPGRADE_LEVEL = 6;

const towerManagement = {
    getUpgradeCost(level) {
        if (!Number.isFinite(level)) {
            return null;
        }
        const cost = balanceConfig?.towers?.upgradeCosts?.[level];
        return Number.isFinite(cost) ? cost : null;
    },

    canUpgradeTower(tower) {
        if (!tower || !Number.isFinite(tower.level)) {
            return false;
        }
        if (this.wave < 15) {
            return false;
        }
        if (tower.level >= MAX_UPGRADE_LEVEL) {
            return false;
        }
        const cost = this.getUpgradeCost(tower.level);
        return Number.isFinite(cost) && cost > 0 && this.energy >= cost;
    },

    attemptTowerUpgrade(tower) {
        if (!tower || !Number.isFinite(tower.level)) {
            return false;
        }
        if (this.wave < 15) {
            this.disableUpgradeMode?.();
            return false;
        }

        const currentLevel = Math.max(1, tower.level);
        if (currentLevel >= MAX_UPGRADE_LEVEL) {
            tower.triggerErrorPulse?.();
            if (this.audio && typeof this.audio.playError === 'function') {
                this.audio.playError();
            }
            return false;
        }

        const cost = this.getUpgradeCost(currentLevel);
        if (!Number.isFinite(cost) || cost <= 0) {
            return false;
        }
        if (this.energy < cost) {
            tower.triggerErrorPulse?.();
            if (this.audio && typeof this.audio.playError === 'function') {
                this.audio.playError();
            }
            return false;
        }

        this.energy -= cost;
        tower.level = Math.min(MAX_UPGRADE_LEVEL, tower.level + 1);
        tower.updateStats?.();
        tower.triggerPlacementFlash?.();
        this.disableUpgradeMode?.();
        if (this.audio) {
            if (typeof this.audio.playMerge === 'function') {
                this.audio.playMerge();
            } else if (typeof this.audio.playPlacement === 'function') {
                this.audio.playPlacement();
            }
        }
        updateHUD(this);
        return true;
    },

    toggleUpgradeMode() {
        if (this.wave < 15) {
            this.disableUpgradeMode?.();
            return this.upgradeModeActive;
        }
        const nextState = !this.upgradeModeActive;
        this.upgradeModeActive = nextState;
        if (nextState && typeof this.disableMergeMode === 'function') {
            this.disableMergeMode();
        }
        this.updateUpgradeButtonState?.(nextState);
        return this.upgradeModeActive;
    },

    disableUpgradeMode() {
        this.upgradeModeActive = false;
        this.updateUpgradeButtonState?.(false);
    },

    mergeTowers(row) {
        this.forEachMergeablePair(row, (cellA, cellB, towerA, towerB) => {
            this.mergeTowerPair(cellA, cellB, towerA, towerB);
        });
    },

    manualMergeTowers() {
        if (this.waveInProgress) {
            this.disableMergeMode?.();
            return this.mergeModeActive;
        }
        this.mergeModeActive = !this.mergeModeActive;
        if (this.mergeModeActive) {
            if (typeof this.disableUpgradeMode === 'function') {
                this.disableUpgradeMode();
            }
            this.clearMergeSelection();
            this.updateMergeHints();
        } else {
            this.disableMergeMode();
        }
        this.updateMergeButtonState?.(this.mergeModeActive);
        return this.mergeModeActive;
    },

    enableMergeMode() {
        if (this.waveInProgress) {
            return false;
        }
        if (typeof this.disableUpgradeMode === 'function') {
            this.disableUpgradeMode();
        }
        this.mergeModeActive = true;
        this.clearMergeSelection();
        this.updateMergeHints();
        this.updateMergeButtonState?.(true);
        return true;
    },

    disableMergeMode() {
        this.mergeModeActive = false;
        this.clearMergeSelection();
        this.clearMergeHints();
        this.updateMergeButtonState?.(false);
    },

    clearMergeSelection() {
        if (this.selectedMergeCell) {
            this.selectedMergeCell.mergeSelection = 0;
            const tower = this.getTowerAt?.(this.selectedMergeCell) ?? this.selectedMergeCell.tower;
            if (tower) {
                tower.mergeSelected = false;
            }
        }
        this.selectedMergeCell = null;
    },

    selectTowerForMerge(tower) {
        if (!this.mergeModeActive || this.waveInProgress) {
            return false;
        }
        const cell = tower?.cell;
        if (!cell || !cell.occupied) {
            return false;
        }

        if (!this.selectedMergeCell) {
            this.selectedMergeCell = cell;
            this.selectedMergeCell.mergeSelection = 1;
            if (tower) {
                tower.mergeSelected = true;
            }
            this.playMergeSelectionSound?.();
            this.updateMergeHints();
            return true;
        }

        if (this.selectedMergeCell === cell) {
            this.clearMergeSelection();
            this.updateMergeHints();
            return false;
        }

        const targetCell = this.selectedMergeCell;

        if (!this.areCellsAdjacent(targetCell, cell)) {
            tower?.triggerErrorPulse?.();
            this.clearMergeSelection();
            this.updateMergeHints();
            return false;
        }

        const towerA = this.getTowerAt(targetCell);
        const towerB = this.getTowerAt(cell);
        if (!this.canMergeCells(targetCell, cell) || !this.canMergeTowers(towerA, towerB)) {
            towerA?.triggerErrorPulse?.();
            towerB?.triggerErrorPulse?.();
            this.clearMergeSelection();
            this.updateMergeHints();
            return false;
        }

        this.mergeTowerPair(cell, targetCell, towerB, towerA);
        this.clearMergeSelection();
        this.updateMergeHints();
        return true;
    },

    canMergeCells(cellA, cellB) {
        return cellA.occupied && cellB.occupied;
    },

    canMergeTowers(towerA, towerB) {
        return towerA && towerB && towerA.color === towerB.color && towerA.level === towerB.level;
    },

    forEachMergeablePair(row, callback) {
        for (let i = 0; i < row.length - 1; i++) {
            const cellA = row[i];
            const cellB = row[i + 1];
            if (!this.canMergeCells(cellA, cellB)) continue;

            const towerA = this.getTowerAt(cellA);
            const towerB = this.getTowerAt(cellB);
            if (!this.canMergeTowers(towerA, towerB)) continue;

            callback(cellA, cellB, towerA, towerB);
        }
    },

    areCellsAdjacent(cellA, cellB) {
        const topIndexA = this.topCells.indexOf(cellA);
        const topIndexB = this.topCells.indexOf(cellB);
        if (topIndexA !== -1 && topIndexB !== -1) {
            return Math.abs(topIndexA - topIndexB) === 1;
        }
        const bottomIndexA = this.bottomCells.indexOf(cellA);
        const bottomIndexB = this.bottomCells.indexOf(cellB);
        if (bottomIndexA !== -1 && bottomIndexB !== -1) {
            return Math.abs(bottomIndexA - bottomIndexB) === 1;
        }
        return false;
    },

    mergeTowerPair(cellA, cellB, towerA, towerB) {
        cellA.tower = towerA;
        towerA.level += 1;
        towerA.updateStats();
        if (typeof this.startTowerMergeAnimation === 'function') {
            this.startTowerMergeAnimation(towerA, towerB);
        }
        if (typeof towerA.triggerPlacementFlash === 'function') {
            towerA.triggerPlacementFlash();
        }
        this.towers = this.towers.filter(t => t !== towerB);
        if (towerB.cell) {
            towerB.cell.tower = null;
            towerB.cell = null;
        }
        cellB.occupied = false;
        cellB.tower = null;
        if (typeof this.persistState === 'function') {
            this.persistState();
        }
        if (this.tutorial && typeof this.tutorial.handleTowerMerged === 'function') {
            try {
                this.tutorial.handleTowerMerged({
                    color: towerA?.color ?? towerB?.color ?? null,
                    level: towerA?.level ?? null,
                });
            } catch (error) {
                console.warn('Tutorial merge handler failed', error);
            }
        }
    },

    updateMergeHints() {
        this.clearMergeHints();

        if (this.waveInProgress || !this.mergeModeActive) {
            return;
        }

        const applyHint = (cellA, cellB, towerA, towerB) => {
            const selectedCell = this.selectedMergeCell;
            if (selectedCell && selectedCell !== cellA && selectedCell !== cellB) {
                return;
            }
            cellA.mergeHint = Math.min(1, (cellA.mergeHint ?? 0) + 0.9);
            cellB.mergeHint = Math.min(1, (cellB.mergeHint ?? 0) + 0.9);
            if (towerA) {
                towerA.mergeHint = Math.min(1, (towerA.mergeHint ?? 0) + 0.9);
            }
            if (towerB) {
                towerB.mergeHint = Math.min(1, (towerB.mergeHint ?? 0) + 0.9);
            }
            this.mergeHintPairs.push({ cellA, cellB, color: towerA?.color ?? 'red' });
        };

        this.forEachMergeablePair(this.bottomCells, applyHint);
        this.forEachMergeablePair(this.topCells, applyHint);
    },

    clearMergeHints() {
        if (!this.mergeHintPairs) {
            this.mergeHintPairs = [];
        } else {
            this.mergeHintPairs.length = 0;
        }

        const cells = typeof this.getAllCells === 'function' ? this.getAllCells() : [];
        cells.forEach(cell => {
            cell.mergeHint = 0;
            if (!this.selectedMergeCell || cell !== this.selectedMergeCell) {
                cell.mergeSelection = 0;
            }
        });

        if (Array.isArray(this.towers)) {
            this.towers.forEach(t => {
                t.mergeHint = 0;
                if (!this.selectedMergeCell || t.cell !== this.selectedMergeCell) {
                    t.mergeSelected = false;
                }
            });
        }
    },

    playMergeSelectionSound() {
        const audio = this.audio;
        if (!audio) {
            return;
        }
        if (typeof audio.playPlacement === 'function') {
            audio.playPlacement();
            return;
        }
        if (typeof audio.playMerge === 'function') {
            audio.playMerge();
        }
    },
};

export default towerManagement;
