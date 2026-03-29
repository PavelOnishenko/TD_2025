import GridMap from '../../utils/GridMap.js';
import { CombatEntity, GridCell, GridPosition, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';

export type BattleObstacleKind = 'tree' | 'bush' | 'stump' | 'rock' | 'pillar' | 'cactus' | 'bones' | 'reed' | 'stone' | 'driftwood';

export type BattleObstacle = {
    col: number;
    row: number;
    kind: BattleObstacleKind;
};

export default class BattleMapView {
    private readonly grid: GridMap;
    private readonly terrainProvider: () => TerrainType;
    private readonly obstacleProvider: () => BattleObstacle[];

    constructor(grid: GridMap, terrainProvider: () => TerrainType, obstacleProvider: () => BattleObstacle[]) {
        this.grid = grid;
        this.terrainProvider = terrainProvider;
        this.obstacleProvider = obstacleProvider;
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        currentEntity: CombatEntity | null = null,
        selectedEnemy: CombatEntity | null = null,
        selectedCell: GridPosition | null = null,
    ): void {
        const dimensions = this.grid.getDimensions();
        ctx.fillStyle = theme.battleMap.background;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        const terrainType = this.terrainProvider();
        this.grid.forEachCell((cell, col, row) => {
            this.drawCell(ctx, cell, col, row, terrainType, currentEntity, selectedEnemy, selectedCell);
        });
        this.drawObstacles(ctx, terrainType);
    }

    private drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        terrainType: TerrainType,
        currentEntity: CombatEntity | null,
        selectedEnemy: CombatEntity | null,
        selectedCell: GridPosition | null,
    ): void {
        this.drawBaseTile(ctx, cell, col, row, terrainType);
        this.drawCurrentEntityHighlight(ctx, cell, col, row, currentEntity);
        this.drawSelectedEnemyHighlight(ctx, cell, col, row, selectedEnemy);
        this.drawSelectedCellHighlight(ctx, cell, col, row, selectedCell);
        this.drawBorder(ctx, cell);
        this.drawSelectedCellBorder(ctx, cell, col, row, selectedCell);
        this.drawSelectedEnemyBorder(ctx, cell, col, row, selectedEnemy);
    }

    private drawBaseTile(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, terrainType: TerrainType): void {
        const palette = this.getTerrainPalette(terrainType, (col + row) % 2 === 0);
        const path = this.createRoundedRectPath(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2, Math.max(4, cell.width * 0.14));
        const gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
        gradient.addColorStop(0, palette.base);
        gradient.addColorStop(1, palette.shade);
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fill(path);
        ctx.clip(path);
        this.drawTerrainSet(ctx, cell, terrainType, palette.detail, col, row);
        ctx.restore();
    }

    private drawCurrentEntityHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, currentEntity: CombatEntity | null): void {
        if (!this.isEntityAtCell(currentEntity, col, row)) {
            return;
        }
        const isPlayer = currentEntity?.constructor.name === 'Player';
        const path = this.createRoundedRectPath(cell.x + 4, cell.y + 4, cell.width - 8, cell.height - 8, Math.max(4, cell.width * 0.12));
        ctx.fillStyle = isPlayer
            ? theme.battleMap.currentEntityPlayer
            : theme.battleMap.currentEntityEnemy;
        ctx.fill(path);
    }

    private drawSelectedEnemyHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedEnemy: CombatEntity | null): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        const path = this.createRoundedRectPath(cell.x + 6, cell.y + 6, cell.width - 12, cell.height - 12, Math.max(4, cell.width * 0.1));
        ctx.fillStyle = theme.battleMap.selectedEnemy;
        ctx.fill(path);
    }

    private drawBorder(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.strokeStyle = theme.battleMap.gridBorders;
        ctx.lineWidth = 1.5;
        ctx.stroke(this.createRoundedRectPath(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2, Math.max(4, cell.width * 0.14)));
    }

    private drawSelectedEnemyBorder(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedEnemy: CombatEntity | null): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        ctx.strokeStyle = theme.ui.enemyColor;
        ctx.lineWidth = 3;
        ctx.stroke(this.createRoundedRectPath(cell.x + 4, cell.y + 4, cell.width - 8, cell.height - 8, Math.max(4, cell.width * 0.12)));
    }

    private drawSelectedCellHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedCell: GridPosition | null): void {
        if (!selectedCell || selectedCell.col !== col || selectedCell.row !== row) {
            return;
        }
        const path = this.createRoundedRectPath(cell.x + 8, cell.y + 8, cell.width - 16, cell.height - 16, Math.max(4, cell.width * 0.08));
        ctx.fillStyle = 'rgba(120, 180, 255, 0.24)';
        ctx.fill(path);
    }

    private drawSelectedCellBorder(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedCell: GridPosition | null): void {
        if (!selectedCell || selectedCell.col !== col || selectedCell.row !== row) {
            return;
        }
        ctx.strokeStyle = theme.ui.primaryAccent;
        ctx.lineWidth = 2;
        ctx.stroke(this.createRoundedRectPath(cell.x + 3, cell.y + 3, cell.width - 6, cell.height - 6, Math.max(4, cell.width * 0.12)));
    }

    private drawObstacles(ctx: CanvasRenderingContext2D, terrainType: TerrainType): void {
        this.obstacleProvider().forEach((obstacle) => {
            const cell = this.grid.getCellAt(obstacle.col, obstacle.row);
            if (!cell) {
                return;
            }
            ctx.save();
            ctx.shadowColor = theme.battleMap.obstacleShadow;
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 2;
            this.drawObstacle(ctx, cell, obstacle.kind, terrainType);
            ctx.restore();
        });
    }

    private drawObstacle(ctx: CanvasRenderingContext2D, cell: GridCell, kind: BattleObstacleKind, terrainType: TerrainType): void {
        const centerX = cell.x + (cell.width / 2);
        const centerY = cell.y + (cell.height / 2);
        const size = cell.width / 2;
        const accent = this.getObstacleAccent(terrainType);
        ctx.fillStyle = theme.battleMap.obstacleFill;
        ctx.strokeStyle = theme.battleMap.obstacleEdge;
        ctx.lineWidth = 1.5;

        if (kind === 'tree') {
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(centerX, centerY - (size * 0.2), size * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = theme.battleMap.obstacleFill;
            ctx.fillRect(centerX - (size * 0.1), centerY + (size * 0.15), size * 0.2, size * 0.38);
            return;
        }

        if (kind === 'bush' || kind === 'reed') {
            ctx.fillStyle = accent;
            for (let index = 0; index < 3; index++) {
                ctx.beginPath();
                ctx.arc(centerX - (size * 0.22) + (index * size * 0.22), centerY + (index % 2 === 0 ? 0 : -2), size * 0.22, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        if (kind === 'stump' || kind === 'driftwood') {
            ctx.fillStyle = theme.battleMap.obstacleFill;
            const stumpPath = this.createRoundedRectPath(centerX - (size * 0.4), centerY - (size * 0.18), size * 0.8, size * 0.38, 6);
            ctx.fill(stumpPath);
            ctx.stroke(stumpPath);
            return;
        }

        if (kind === 'rock' || kind === 'stone') {
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(centerX - (size * 0.4), centerY + (size * 0.24));
            ctx.lineTo(centerX - (size * 0.14), centerY - (size * 0.4));
            ctx.lineTo(centerX + (size * 0.38), centerY - (size * 0.1));
            ctx.lineTo(centerX + (size * 0.24), centerY + (size * 0.36));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            return;
        }

        if (kind === 'pillar') {
            ctx.fillStyle = accent;
            const pillarPath = this.createRoundedRectPath(centerX - (size * 0.2), centerY - (size * 0.44), size * 0.4, size * 0.88, 8);
            ctx.fill(pillarPath);
            ctx.stroke(pillarPath);
            return;
        }

        if (kind === 'cactus') {
            ctx.fillStyle = accent;
            ctx.fillRect(centerX - (size * 0.12), centerY - (size * 0.44), size * 0.24, size * 0.88);
            ctx.fillRect(centerX - (size * 0.32), centerY - (size * 0.12), size * 0.18, size * 0.18);
            ctx.fillRect(centerX + (size * 0.14), centerY - (size * 0.26), size * 0.18, size * 0.18);
            return;
        }

        if (kind === 'bones') {
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - (size * 0.36), centerY - (size * 0.26));
            ctx.lineTo(centerX + (size * 0.36), centerY + (size * 0.26));
            ctx.moveTo(centerX + (size * 0.36), centerY - (size * 0.26));
            ctx.lineTo(centerX - (size * 0.36), centerY + (size * 0.26));
            ctx.stroke();
        }
    }

    private drawTerrainSet(ctx: CanvasRenderingContext2D, cell: GridCell, terrainType: TerrainType, detail: string, col: number, row: number): void {
        ctx.strokeStyle = detail;
        ctx.fillStyle = detail;
        ctx.lineWidth = 1;

        if (terrainType === 'forest') {
            for (let index = 0; index < 3; index++) {
                const x = cell.x + 7 + (index * (cell.width / 4));
                const y = cell.y + (index % 2 === 0 ? cell.height * 0.35 : cell.height * 0.58);
                ctx.beginPath();
                ctx.arc(x, y, 2.1, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        if (terrainType === 'mountain') {
            ctx.beginPath();
            ctx.moveTo(cell.x + 6, cell.y + cell.height - 6);
            ctx.lineTo(cell.x + (cell.width * 0.35), cell.y + 7);
            ctx.lineTo(cell.x + (cell.width * 0.58), cell.y + cell.height - 10);
            ctx.moveTo(cell.x + (cell.width * 0.45), cell.y + cell.height - 8);
            ctx.lineTo(cell.x + (cell.width * 0.72), cell.y + 10);
            ctx.lineTo(cell.x + cell.width - 6, cell.y + cell.height - 8);
            ctx.stroke();
            return;
        }

        if (terrainType === 'water') {
            for (let band = 0; band < 3; band++) {
                const y = cell.y + (cell.height * (0.26 + (band * 0.22)));
                ctx.beginPath();
                ctx.moveTo(cell.x + 4, y);
                ctx.quadraticCurveTo(cell.x + (cell.width * 0.3), y - 3, cell.x + (cell.width * 0.6), y + 1);
                ctx.quadraticCurveTo(cell.x + (cell.width * 0.82), y + 4, cell.x + cell.width - 4, y);
                ctx.stroke();
            }
            return;
        }

        if (terrainType === 'desert') {
            for (let dune = 0; dune < 2; dune++) {
                const y = cell.y + (cell.height * (0.42 + (dune * 0.18)));
                ctx.beginPath();
                ctx.arc(cell.x + (cell.width * 0.34), y, 7, Math.PI, Math.PI * 2);
                ctx.arc(cell.x + (cell.width * 0.62), y, 6, Math.PI, Math.PI * 2);
                ctx.stroke();
            }
            return;
        }

        const offset = ((col * 17) + (row * 31)) % 5;
        for (let dot = 0; dot < 4; dot++) {
            ctx.beginPath();
            ctx.arc(cell.x + 8 + (dot * 7), cell.y + 10 + (((dot + offset) % 3) * 6), 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private getTerrainPalette(terrainType: TerrainType, lightVariant: boolean): { base: string; shade: string; detail: string } {
        if (terrainType === 'forest') {
            return lightVariant
                ? {
                    base: this.mixColors(theme.worldMap.terrain.forest, theme.ui.panelHighlight, 0.14),
                    shade: this.mixColors(theme.worldMap.terrain.forest, theme.ui.primaryAccent, 0.12),
                    detail: this.withAlpha(theme.ui.panelHighlight, 0.16),
                }
                : {
                    base: this.mixColors(theme.worldMap.terrain.forest, theme.ui.primaryAccent, 0.08),
                    shade: this.mixColors(theme.worldMap.terrain.forest, theme.ui.primaryAccent, 0.18),
                    detail: this.withAlpha(theme.ui.panelHighlight, 0.12),
                };
        }
        if (terrainType === 'mountain') {
            return lightVariant
                ? {
                    base: this.mixColors(theme.worldMap.terrain.mountain, theme.ui.panelHighlight, 0.18),
                    shade: this.mixColors(theme.worldMap.terrain.mountain, theme.ui.primaryAccent, 0.16),
                    detail: this.withAlpha(theme.ui.primaryAccent, 0.18),
                }
                : {
                    base: this.mixColors(theme.worldMap.terrain.mountain, theme.ui.primaryAccent, 0.08),
                    shade: this.mixColors(theme.worldMap.terrain.mountain, theme.ui.primaryAccent, 0.24),
                    detail: this.withAlpha(theme.ui.panelHighlight, 0.12),
                };
        }
        if (terrainType === 'water') {
            return lightVariant
                ? {
                    base: this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.22),
                    shade: this.mixColors(theme.worldMap.terrain.water, theme.ui.primaryAccent, 0.1),
                    detail: this.withAlpha(theme.ui.panelHighlight, 0.2),
                }
                : {
                    base: this.mixColors(theme.worldMap.terrain.water, theme.ui.primaryAccent, 0.02),
                    shade: this.mixColors(theme.worldMap.terrain.water, theme.ui.primaryAccent, 0.16),
                    detail: this.withAlpha(theme.ui.panelHighlight, 0.16),
                };
        }
        if (terrainType === 'desert') {
            return lightVariant
                ? {
                    base: this.mixColors(theme.worldMap.terrain.desert, theme.ui.panelHighlight, 0.15),
                    shade: this.mixColors(theme.worldMap.terrain.desert, theme.ui.secondaryAccent, 0.1),
                    detail: this.withAlpha(theme.ui.primaryAccent, 0.12),
                }
                : {
                    base: this.mixColors(theme.worldMap.terrain.desert, theme.ui.secondaryAccent, 0.04),
                    shade: this.mixColors(theme.worldMap.terrain.desert, theme.ui.primaryAccent, 0.12),
                    detail: this.withAlpha(theme.ui.primaryAccent, 0.1),
                };
        }
        return lightVariant
            ? {
                base: this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.14),
                shade: this.mixColors(theme.worldMap.terrain.grass, theme.ui.primaryAccent, 0.08),
                detail: this.withAlpha(theme.ui.panelHighlight, 0.13),
            }
            : {
                base: this.mixColors(theme.worldMap.terrain.grass, theme.ui.primaryAccent, 0.05),
                shade: this.mixColors(theme.worldMap.terrain.grass, theme.ui.primaryAccent, 0.12),
                detail: this.withAlpha(theme.ui.primaryAccent, 0.1),
            };
    }

    private getObstacleAccent(terrainType: TerrainType): string {
        if (terrainType === 'forest') {
            return this.mixColors(theme.worldMap.terrain.forest, theme.ui.panelHighlight, 0.16);
        }
        if (terrainType === 'mountain') {
            return this.mixColors(theme.worldMap.terrain.mountain, theme.ui.panelHighlight, 0.18);
        }
        if (terrainType === 'water') {
            return this.mixColors(theme.worldMap.terrain.water, theme.ui.secondaryAccent, 0.25);
        }
        if (terrainType === 'desert') {
            return this.mixColors(theme.worldMap.terrain.desert, theme.ui.secondaryAccent, 0.2);
        }
        return this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.14);
    }

    private createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): Path2D {
        const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
        const path = new Path2D();
        path.moveTo(x + safeRadius, y);
        path.lineTo(x + width - safeRadius, y);
        path.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        path.lineTo(x + width, y + height - safeRadius);
        path.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        path.lineTo(x + safeRadius, y + height);
        path.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        path.lineTo(x, y + safeRadius);
        path.quadraticCurveTo(x, y, x + safeRadius, y);
        path.closePath();
        return path;
    }

    private isEntityAtCell(entity: CombatEntity | null, col: number, row: number): boolean {
        return entity !== null && entity.gridCol === col && entity.gridRow === row;
    }

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const a = this.parseColor(colorA);
        const b = this.parseColor(colorB);
        const t = Math.max(0, Math.min(1, ratio));
        const r = Math.round((a.r * (1 - t)) + (b.r * t));
        const g = Math.round((a.g * (1 - t)) + (b.g * t));
        const blue = Math.round((a.b * (1 - t)) + (b.b * t));
        return `rgb(${r}, ${g}, ${blue})`;
    }

    private withAlpha(hexColor: string, alpha: number): string {
        const { r, g, b } = this.parseColor(hexColor);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('rgb')) {
            const [r = '0', g = '0', b = '0'] = color.match(/\d+/g) ?? [];
            return { r: Number(r), g: Number(g), b: Number(b) };
        }

        const hex = color.replace('#', '');
        return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
    }
}
