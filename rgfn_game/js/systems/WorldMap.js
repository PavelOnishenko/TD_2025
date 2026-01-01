import GridMap from '../utils/GridMap.js';

export default class WorldMap {
    constructor(columns, rows, cellSize) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.playerGridPos = { col: Math.floor(columns / 2), row: Math.floor(rows / 2) };
    }

    movePlayer(direction) {
        const { col, row } = this.playerGridPos;
        let newCol = col;
        let newRow = row;

        switch (direction) {
            case 'up':
                newRow = row - 1;
                break;
            case 'down':
                newRow = row + 1;
                break;
            case 'left':
                newCol = col - 1;
                break;
            case 'right':
                newCol = col + 1;
                break;
        }

        // Check if valid position
        if (this.grid.isValidPosition(newCol, newRow)) {
            this.playerGridPos = { col: newCol, row: newRow };
            return true; // Moved successfully
        }

        return false; // Can't move there
    }

    getPlayerPixelPosition() {
        return this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    }

    draw(ctx, renderer) {
        const dims = this.grid.getDimensions();

        // Draw grid background
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, dims.width, dims.height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let col = 0; col <= this.grid.columns; col++) {
            const x = col * this.grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, dims.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let row = 0; row <= this.grid.rows; row++) {
            const y = row * this.grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(dims.width, y);
            ctx.stroke();
        }

        // Highlight player cell
        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            ctx.fillStyle = 'rgba(0, 204, 255, 0.2)';
            ctx.fillRect(playerCell.x, playerCell.y, playerCell.width, playerCell.height);
        }
    }
}
