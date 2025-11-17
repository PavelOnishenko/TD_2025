import gameConfig from '../config/gameConfig.js';

class GameGrid {
    constructor(config = gameConfig.world.grid) {
        const {
            cellSize = { w: 120, h: 160 },
            topOrigin = { x: -300, y: 400 },
            bottomOrigin = { x: -210, y: 680 },
            topOffsets = [
                { x: 0, y: 0 },
                { x: 210, y: 30 },
                { x: 420, y: 50 },
                { x: 600, y: 52 },
                { x: 750, y: 40 },
                { x: 910, y: 18 },
            ],
            bottomOffsets = [
                { x: 0, y: 0 },
                { x: 190, y: -35 },
                { x: 380, y: -45 },
                { x: 600, y: -45 },
                { x: 750, y: -25 },
                { x: 910, y: 0 },
            ],
        } = config ?? {};

        this.cellWidth = cellSize.w;
        this.cellHeight = cellSize.h;
        this.topOrigin = { ...topOrigin };
        this.bottomOrigin = { ...bottomOrigin };
        this.topOffsets = Array.isArray(topOffsets) ? topOffsets : [];
        this.bottomOffsets = Array.isArray(bottomOffsets) ? bottomOffsets : [];
        this.buildGrid();
    }

    buildGrid() {
        this.topCells = this.createRow(this.topOrigin, this.topOffsets);
        this.bottomCells = this.createRow(this.bottomOrigin, this.bottomOffsets);
    }

    createRow(origin, offsets) {
        return offsets.map(offset => this.createCell(origin.x + offset.x, origin.y + offset.y));
    }

    createCell(x, y) {
        return {
            x,
            y,
            w: this.cellWidth,
            h: this.cellHeight,
            occupied: false,
            highlight: 0,
            hover: 0,
            hoverActive: false,
            mergeHint: 0,
            mergeSelection: 0,
            tower: null,
        };
    }

    getAllCells() {
        return [...this.topCells, ...this.bottomCells];
    }

    forEachCell(callback) {
        this.getAllCells().forEach(callback);
    }

    resetCells() {
        this.forEachCell(cell => {
            cell.occupied = false;
            cell.highlight = 0;
            cell.hover = 0;
            cell.hoverActive = false;
            cell.mergeHint = 0;
            cell.mergeSelection = 0;
            cell.tower = null;
        });
    }

    fadeHighlights(dt) {
        this.forEachCell(cell => {
            if (cell.highlight > 0) {
                cell.highlight = Math.max(0, cell.highlight - dt);
            }
        });
    }

    fadeHover(dt) {
        this.forEachCell(cell => {
            if (cell.hoverActive) {
                cell.hover = 1;
                return;
            }
            if (cell.hover > 0) {
                cell.hover = Math.max(0, cell.hover - dt * 3);
            }
        });
    }

    fadeMergeHints(dt) {
        this.forEachCell(cell => {
            if (cell.mergeHint > 0) {
                cell.mergeHint = Math.max(0, cell.mergeHint - dt * 2.5);
            }
        });
    }
}

export default GameGrid;