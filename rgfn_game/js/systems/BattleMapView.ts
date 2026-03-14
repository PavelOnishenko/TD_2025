import GridMap from '../utils/GridMap.js';
import { CombatEntity, GridCell } from '../types/game.js';
import { theme } from '../config/ThemeConfig.js';

export default class BattleMapView {
    private readonly grid: GridMap;

    constructor(grid: GridMap) {
        this.grid = grid;
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        currentEntity: CombatEntity | null = null,
        selectedEnemy: CombatEntity | null = null
    ): void {
        const dimensions = this.grid.getDimensions();
        ctx.fillStyle = theme.battleMap.background;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        this.grid.forEachCell((cell, col, row) => {
            this.drawCell(ctx, cell, col, row, currentEntity, selectedEnemy);
        });
    }

    private drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        currentEntity: CombatEntity | null,
        selectedEnemy: CombatEntity | null
    ): void {
        this.drawBaseTile(ctx, cell, col, row);
        this.drawCurrentEntityHighlight(ctx, cell, col, row, currentEntity);
        this.drawSelectedEnemyHighlight(ctx, cell, col, row, selectedEnemy);
        this.drawBorder(ctx, cell);
        this.drawSelectedEnemyBorder(ctx, cell, col, row, selectedEnemy);
    }

    private drawBaseTile(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number): void {
        const isLightTile = (col + row) % 2 === 0;
        ctx.fillStyle = isLightTile ? theme.battleMap.tileLight : theme.battleMap.tileDark;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }

    private drawCurrentEntityHighlight(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        currentEntity: CombatEntity | null
    ): void {
        if (!this.isEntityAtCell(currentEntity, col, row)) {
            return;
        }
        const isPlayer = currentEntity?.constructor.name === 'Player';
        ctx.fillStyle = isPlayer
            ? theme.battleMap.currentEntityPlayer
            : theme.battleMap.currentEntityEnemy;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }

    private drawSelectedEnemyHighlight(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        selectedEnemy: CombatEntity | null
    ): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        ctx.fillStyle = theme.battleMap.selectedEnemy;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }

    private drawBorder(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.strokeStyle = theme.battleMap.gridBorders;
        ctx.lineWidth = 2;
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
    }

    private drawSelectedEnemyBorder(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        selectedEnemy: CombatEntity | null
    ): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        ctx.strokeStyle = theme.ui.enemyColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
    }

    private isEntityAtCell(entity: CombatEntity | null, col: number, row: number): boolean {
        return entity !== null && entity.gridCol === col && entity.gridRow === row;
    }
}
