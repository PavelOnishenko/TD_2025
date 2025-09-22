class GameGrid {
    constructor({
        cellSize = { w: 40, h: 24 },
        topOrigin = { x: 70, y: 140 },
        bottomOrigin = { x: 80, y: 480 }
    } = {}) {
        this.cellWidth = cellSize.w;
        this.cellHeight = cellSize.h;
        this.topOrigin = { ...topOrigin };
        this.bottomOrigin = { ...bottomOrigin };
        this.buildGrid();
    }

    buildGrid() {
        const topCells = [ { x: 0, y: 0 }, { x: 40, y: 50 }, { x: 100, y: 110 }, { x: 170, y: 165 }, { x: 230, y: 200 }, { x: 300, y: 225 }];
        this.topCells = this.createRow(this.topOrigin, topCells);

        const bottomCells = [ { x: 0, y: 0 }, { x: 75, y: 25 }, { x: 155, y: 65 }, { x: 220, y: 115 }, { x: 290, y: 170 }, { x: 325, y: 250 }];
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