class GameGrid {
    constructor({
        cellSize = { w: 120, h: 160 },
        topOrigin = { x: -300, y: 400 },
        bottomOrigin = { x: -210, y: 680 }
    } = {}) {
        this.cellWidth = cellSize.w;
        this.cellHeight = cellSize.h;
        this.topOrigin = { ...topOrigin };
        this.bottomOrigin = { ...bottomOrigin };
        this.buildGrid();
    }

    buildGrid() {
        const topCells = [ { x: 0, y: 0 }, { x: 210, y: 30 }, { x: 420, y: 50 }, { x: 600, y: 52 }, { x: 750, y: 40 }, { x: 910, y: 18 }];
        this.topCells = this.createRow(this.topOrigin, topCells);

        const bottomCells = [ { x: 0, y: 0 }, { x: 190, y: -35 }, { x: 380, y: -45 }, { x: 600, y: -45 }, { x: 750, y: -25 }, { x: 910, y: 0 }];
        this.bottomCells = this.createRow(this.bottomOrigin, bottomCells);
    }

    createRow(origin, offsets) {
        return offsets.map(offset => this.createCell(origin.x + offset.x, origin.y + offset.y));
    }

    createCell(x, y) {
        return {x,y,w: this.cellWidth,h: this.cellHeight,occupied: false,highlight: 0,tower: null};
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
}

export default GameGrid;