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

        // Prioritize the direction with greater distance
        const primaryMoveIsCol = Math.abs(colDiff) > Math.abs(rowDiff);

        // Try primary direction first
        if (primaryMoveIsCol && colDiff !== 0) {
            newCol += colDiff > 0 ? 1 : -1;
        } else if (!primaryMoveIsCol && rowDiff !== 0) {
            newRow += rowDiff > 0 ? 1 : -1;
        }

        // Check if position is valid and not occupied
        if (this.grid.isValidPosition(newCol, newRow)) {
            const occupied = this.entities.some(e =>
                e !== entity && e.gridCol === newCol && e.gridRow === newRow && !e.isDead()
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

        // Primary direction blocked, try alternate direction
        newCol = entity.gridCol;
        newRow = entity.gridRow;

        if (!primaryMoveIsCol && colDiff !== 0) {
            newCol += colDiff > 0 ? 1 : -1;
        } else if (primaryMoveIsCol && rowDiff !== 0) {
            newRow += rowDiff > 0 ? 1 : -1;
        }

        // Check if alternate position is valid and not occupied
        if (this.grid.isValidPosition(newCol, newRow)) {
            const occupied = this.entities.some(e =>
                e !== entity && e.gridCol === newCol && e.gridRow === newRow && !e.isDead()
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

    moveEntity(entity, direction) {
        let newCol = entity.gridCol;
        let newRow = entity.gridRow;

        switch (direction) {
            case 'up':
                newRow = entity.gridRow - 1;
                break;
            case 'down':
                newRow = entity.gridRow + 1;
                break;
            case 'left':
                newCol = entity.gridCol - 1;
                break;
            case 'right':
                newCol = entity.gridCol + 1;
                break;
        }

        // Check if position is valid and not occupied
        if (this.grid.isValidPosition(newCol, newRow)) {
            const occupied = this.entities.some(e =>
                e !== entity && e.gridCol === newCol && e.gridRow === newRow && !e.isDead()
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

    draw(ctx, renderer, currentEntity = null) {
        const dims = this.grid.getDimensions();

        // Draw grid background
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(0, 0, dims.width, dims.height);

        // Draw grid cells with clear borders
        this.grid.forEachCell((cell, col, row) => {
            // Alternating tile colors for better visibility
            const isLight = (col + row) % 2 === 0;
            ctx.fillStyle = isLight ? 'rgba(80, 30, 30, 0.4)' : 'rgba(40, 15, 15, 0.4)';
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

            // Highlight current entity's cell
            if (currentEntity && currentEntity.gridCol === col && currentEntity.gridRow === row) {
                const isPlayer = currentEntity.constructor.name === 'Player';
                ctx.fillStyle = isPlayer ? 'rgba(0, 204, 255, 0.3)' : 'rgba(255, 100, 0, 0.3)';
                ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            }

            // Clear cell borders
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
        });

        // Draw grid coordinates for reference
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.grid.forEachCell((cell, col, row) => {
            const [x, y] = this.grid.gridToPixel(col, row);
            ctx.fillText(`${col},${row}`, x, y - 15);
        });
    }
}
