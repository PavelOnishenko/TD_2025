import GridMap from '../utils/GridMap.js';
import { CombatEntity, Direction, GridCell } from '../types/game.js';
import { theme } from '../config/ThemeConfig.js';

export default class BattleMap {
    private grid: GridMap;
    private entities: CombatEntity[];

    constructor() {
        this.grid = new GridMap(10, 8, 48);
        this.entities = [];
    }

    public setup(player: CombatEntity, enemies: CombatEntity[]): void {
        this.entities = [];

        // Place player at bottom center
        const playerCol = Math.floor(this.grid.columns / 2);
        const playerRow = this.grid.rows - 2;
        player.gridCol = playerCol;
        player.gridRow = playerRow;
        const playerPos = this.grid.gridToPixel(playerCol, playerRow);
        player.x = playerPos[0];
        player.y = playerPos[1];

        this.entities.push(player);

        // Place enemies at top
        const startCol = Math.floor((this.grid.columns - enemies.length * 2) / 2);
        enemies.forEach((enemy, i) => {
            const col = startCol + i * 2;
            const row = 1;
            enemy.gridCol = col;
            enemy.gridRow = row;
            const enemyPos = this.grid.gridToPixel(col, row);
            enemy.x = enemyPos[0];
            enemy.y = enemyPos[1];
            this.entities.push(enemy);
        });
    }

    public isInMeleeRange(attacker: CombatEntity, target: CombatEntity): boolean {
        const col1 = attacker.gridCol ?? 0;
        const row1 = attacker.gridRow ?? 0;
        const col2 = target.gridCol ?? 0;
        const row2 = target.gridRow ?? 0;
        return this.grid.areAdjacent(col1, row1, col2, row2);
    }

    public moveEntityToward(entity: CombatEntity, targetEntity: CombatEntity): boolean {
        const targetCol = targetEntity.gridCol ?? 0;
        const targetRow = targetEntity.gridRow ?? 0;

        let newCol = entity.gridCol ?? 0;
        let newRow = entity.gridRow ?? 0;

        // Simple pathfinding - move one step closer
        const colDiff = targetCol - (entity.gridCol ?? 0);
        const rowDiff = targetRow - (entity.gridRow ?? 0);

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
        newCol = entity.gridCol ?? 0;
        newRow = entity.gridRow ?? 0;

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

    public moveEntity(entity: CombatEntity, direction: Direction): boolean {
        let newCol = entity.gridCol ?? 0;
        let newRow = entity.gridRow ?? 0;

        switch (direction) {
            case 'up':
                newRow = (entity.gridRow ?? 0) - 1;
                break;
            case 'down':
                newRow = (entity.gridRow ?? 0) + 1;
                break;
            case 'left':
                newCol = (entity.gridCol ?? 0) - 1;
                break;
            case 'right':
                newCol = (entity.gridCol ?? 0) + 1;
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

    public draw(ctx: CanvasRenderingContext2D, renderer: any, currentEntity: CombatEntity | null = null, selectedEnemy: CombatEntity | null = null): void {
        const dims = this.grid.getDimensions();

        // Draw grid background
        ctx.fillStyle = theme.battleMap.background;
        ctx.fillRect(0, 0, dims.width, dims.height);

        // Draw grid cells with clear borders
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            // Alternating tile colors for better visibility
            const isLight = (col + row) % 2 === 0;
            ctx.fillStyle = isLight ? theme.battleMap.tileLight : theme.battleMap.tileDark;
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

            // Highlight current entity's cell
            if (currentEntity && currentEntity.gridCol === col && currentEntity.gridRow === row) {
                const isPlayer = currentEntity.constructor.name === 'Player';
                ctx.fillStyle = isPlayer ? theme.battleMap.currentEntityPlayer : theme.battleMap.currentEntityEnemy;
                ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            }

            // Highlight selected enemy's cell with green border
            if (selectedEnemy && selectedEnemy.gridCol === col && selectedEnemy.gridRow === row) {
                ctx.fillStyle = theme.battleMap.selectedEnemy;
                ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            }

            // Clear cell borders
            ctx.strokeStyle = theme.battleMap.gridBorders;
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);

            // Draw thicker green border for selected enemy
            if (selectedEnemy && selectedEnemy.gridCol === col && selectedEnemy.gridRow === row) {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.lineWidth = 4;
                ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            }
        });

        // Draw grid coordinates for reference
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            const [x, y] = this.grid.gridToPixel(col, row);
            ctx.fillText(`${col},${row}`, x, y - 15);
        });
    }
}
