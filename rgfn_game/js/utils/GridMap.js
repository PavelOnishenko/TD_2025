/**
 * GridMap - Rectangular grid for tile-based games
 * (Built for RGFN, might extract to engine if another game needs it)
 */
export default class GridMap {
    constructor(columns, rows, cellSize, offsetX = 0, offsetY = 0) {
        this.columns = columns;
        this.rows = rows;
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cells = [];
        this.initializeCells();
    }

    initializeCells() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const cell = this.createCell(col, row);
                this.cells.push(cell);
            }
        }
    }

    createCell(col, row) {
        return {
            col,
            row,
            x: this.offsetX + (col * this.cellSize),
            y: this.offsetY + (row * this.cellSize),
            width: this.cellSize,
            height: this.cellSize,
            data: {},
        };
    }

    getCellAt(col, row) {
        if (!this.isValidPosition(col, row)) {
            return null;
        }
        const index = row * this.columns + col;
        return this.cells[index] ?? null;
    }

    isValidPosition(col, row) {
        return col >= 0 && col < this.columns && row >= 0 && row < this.rows;
    }

    pixelToGrid(pixelX, pixelY) {
        const col = Math.floor((pixelX - this.offsetX) / this.cellSize);
        const row = Math.floor((pixelY - this.offsetY) / this.cellSize);

        if (!this.isValidPosition(col, row)) {
            return [-1, -1];
        }

        return [col, row];
    }

    gridToPixel(col, row) {
        const x = this.offsetX + (col * this.cellSize) + (this.cellSize / 2);
        const y = this.offsetY + (row * this.cellSize) + (this.cellSize / 2);
        return [x, y];
    }

    getCellAtPixel(pixelX, pixelY) {
        const [col, row] = this.pixelToGrid(pixelX, pixelY);
        return this.getCellAt(col, row);
    }

    forEachCell(callback) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const cell = this.getCellAt(col, row);
                callback(cell, col, row);
            }
        }
    }

    getAllCells() {
        return [...this.cells];
    }

    getDistance(col1, row1, col2, row2) {
        return Math.abs(col2 - col1) + Math.abs(row2 - row1);
    }

    areAdjacent(col1, row1, col2, row2) {
        return this.getDistance(col1, row1, col2, row2) === 1;
    }

    clearCellData() {
        this.forEachCell(cell => {
            cell.data = {};
        });
    }

    getDimensions() {
        return {
            columns: this.columns,
            rows: this.rows,
            width: this.columns * this.cellSize,
            height: this.rows * this.cellSize,
        };
    }
}
