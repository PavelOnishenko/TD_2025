import GridMap from '../utils/GridMap.js';

export default class BattleMap {
    constructor() {
        this.grid = new GridMap(10, 8, 48);
        this.entities = [];
    }

    setup(player, enemies) {
        this.entities = [];

        // Place player at bottom center
        const playerCol = Math.floor(this.grid.columns / 2);
        const playerRow = this.grid.rows - 2;
        const [playerX, playerY] = this.grid.gridToPixel(playerCol, playerRow);
        player.x = playerX;
        player.y = playerY;
        player.gridCol = playerCol;
        player.gridRow = playerRow;

        this.entities.push(player);

        // Place enemies at top
        const startCol = Math.floor((this.grid.columns - enemies.length * 2) / 2);
        enemies.forEach((enemy, i) => {
            const col = startCol + i * 2;
            const row = 1;
            const [x, y] = this.grid.gridToPixel(col, row);
            enemy.x = x;
            enemy.y = y;
            enemy.gridCol = col;
            enemy.gridRow = row;
            this.entities.push(enemy);
        });
    }

    isInMeleeRange(attacker, target) {
        const [col1, row1] = [attacker.gridCol, attacker.gridRow];
        const [col2, row2] = [target.gridCol, target.gridRow];
        return this.grid.areAdjacent(col1, row1, col2, row2);
    }

    moveEntityToward(entity, targetEntity) {
        const targetCol = targetEntity.gridCol;
        const targetRow = targetEntity.gridRow;

        let newCol = entity.gridCol;
        let newRow = entity.gridRow;

        // Simple pathfinding - move one step closer
        const colDiff = targetCol - entity.gridCol;
        const rowDiff = targetRow - entity.gridRow;

        if (Math.abs(colDiff) > Math.abs(rowDiff)) {
            newCol += colDiff > 0 ? 1 : -1;
        } else if (rowDiff !== 0) {
            newRow += rowDiff > 0 ? 1 : -1;
        }

        // Check if position is valid and not occupied
        if (this.grid.isValidPosition(newCol, newRow)) {
            const occupied = this.entities.some(e =>
                e !== entity && e.gridCol === newCol && e.gridRow === newRow
            );

            if (!occupied) {
                entity.gridCol = newCol;
                entity.gridRow = newRow;
                const [x, y] = this.grid.gridToPixel(newCol, newRow);
                entity.x = x;
                entity.y = y;
                return true;
            }
        }

        return false;
    }

    draw(ctx, renderer) {
        const dims = this.grid.getDimensions();

        // Draw grid background
        ctx.fillStyle = '#2a1a1a';
        ctx.fillRect(0, 0, dims.width, dims.height);

        // Draw grid cells
        this.grid.forEachCell((cell, col, row) => {
            // Alternating tile colors
            const isLight = (col + row) % 2 === 0;
            ctx.fillStyle = isLight ? 'rgba(100, 50, 50, 0.2)' : 'rgba(50, 25, 25, 0.2)';
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

            // Cell borders
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
        });
    }
}
