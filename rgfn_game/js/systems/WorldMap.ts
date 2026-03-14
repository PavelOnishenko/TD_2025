import GridMap from '../utils/GridMap.js';
import { FogState, TerrainData, GridPosition, Direction, GridCell } from '../types/game.js';
import { theme } from '../config/ThemeConfig.js';

const FOG_STATE = {
    UNKNOWN: 'unknown' as FogState,
    DISCOVERED: 'discovered' as FogState,
    HIDDEN: 'hidden' as FogState
};

export default class WorldMap {
    private grid: GridMap;
    private playerGridPos: GridPosition;
    private fogStates: Map<string, FogState>;
    private terrainData: Map<string, TerrainData>;

    constructor(columns: number, rows: number, cellSize: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.playerGridPos = { col: Math.floor(columns / 2), row: Math.floor(rows / 2) };
        this.fogStates = new Map();
        this.terrainData = new Map();
        this.initializeFogOfWar();
        this.generateTerrain();
        this.discoverCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private initializeFogOfWar(): void {
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            this.fogStates.set(this.getCellKey(col, row), FOG_STATE.UNKNOWN);
        });
    }

    private generateTerrain(): void {
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            this.terrainData.set(this.getCellKey(col, row), this.generateCellTerrain(col, row));
        });
    }

    private generateCellTerrain(col: number, row: number): TerrainData {
        const seed = col * 1000 + row;
        const random = this.seededRandom(seed);
        const terrainTypes = [
            { type: 'grass' as const, color: theme.worldMap.terrain.grass, probability: 0.35 },
            { type: 'forest' as const, color: theme.worldMap.terrain.forest, probability: 0.25 },
            { type: 'mountain' as const, color: theme.worldMap.terrain.mountain, probability: 0.18 },
            { type: 'water' as const, color: theme.worldMap.terrain.water, probability: 0.14 },
            { type: 'desert' as const, color: theme.worldMap.terrain.desert, probability: 0.08 }
        ];

        let accumulator = 0;
        for (const terrain of terrainTypes) {
            accumulator += terrain.probability;
            if (random < accumulator) {
                return { type: terrain.type, color: terrain.color, pattern: this.generateTerrainPattern(seed) };
            }
        }

        return { type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain' };
    }

    private generateTerrainPattern(seed: number): TerrainData['pattern'] {
        const patterns: TerrainData['pattern'][] = ['dots', 'lines', 'cross', 'plain'];
        return patterns[Math.floor(this.seededRandom(seed * 2) * patterns.length)];
    }

    private seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    private getCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private discoverCell(col: number, row: number): void {
        const key = this.getCellKey(col, row);
        this.fogStates.set(key, FOG_STATE.DISCOVERED);

        this.grid.forEachCell((cell: GridCell, c: number, r: number) => {
            const cellKey = this.getCellKey(c, r);
            if (this.fogStates.get(cellKey) === FOG_STATE.DISCOVERED && cellKey !== key) {
                this.fogStates.set(cellKey, FOG_STATE.HIDDEN);
            }
        });
    }

    private getFogState(col: number, row: number): FogState {
        return this.fogStates.get(this.getCellKey(col, row)) || FOG_STATE.UNKNOWN;
    }

    private getTerrain(col: number, row: number): TerrainData | undefined {
        return this.terrainData.get(this.getCellKey(col, row));
    }

    public movePlayer(direction: Direction): { moved: boolean; isPreviouslyDiscovered: boolean } {
        const { col, row } = this.playerGridPos;
        let newCol = col;
        let newRow = row;

        if (direction === 'up') newRow--;
        if (direction === 'down') newRow++;
        if (direction === 'left') newCol--;
        if (direction === 'right') newCol++;

        if (this.grid.isValidPosition(newCol, newRow)) {
            const destinationFogState = this.getFogState(newCol, newRow);
            const isPreviouslyDiscovered = destinationFogState === FOG_STATE.HIDDEN || destinationFogState === FOG_STATE.DISCOVERED;

            this.playerGridPos = { col: newCol, row: newRow };
            this.discoverCell(newCol, newRow);
            return { moved: true, isPreviouslyDiscovered }; // Moved successfully
        }

        return { moved: false, isPreviouslyDiscovered: false }; // Can't move there
    }

    public getPlayerPixelPosition(): [number, number] {
        return this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    }

    public draw(ctx: CanvasRenderingContext2D, renderer: any): void {
        const dims = this.grid.getDimensions();
        ctx.fillStyle = theme.worldMap.background;
        ctx.fillRect(0, 0, dims.width, dims.height);

        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            this.drawCell(ctx, cell, this.getFogState(col, row), this.getTerrain(col, row));
        });

        ctx.strokeStyle = theme.worldMap.gridLines;
        ctx.lineWidth = 1;
        for (let col = 0; col <= this.grid.columns; col++) {
            const x = col * this.grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, dims.height);
            ctx.stroke();
        }
        for (let row = 0; row <= this.grid.rows; row++) {
            const y = row * this.grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(dims.width, y);
            ctx.stroke();
        }

        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            ctx.fillStyle = this.withAlpha(theme.worldMap.playerMarker, 0.2);
            ctx.fillRect(playerCell.x, playerCell.y, playerCell.width, playerCell.height);

            const centerX = playerCell.x + playerCell.width / 2;
            const centerY = playerCell.y + playerCell.height / 2;
            ctx.fillStyle = theme.worldMap.playerMarker;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 8);
            ctx.lineTo(centerX - 6, centerY + 6);
            ctx.lineTo(centerX + 6, centerY + 6);
            ctx.closePath();
            ctx.fill();
        }
    }

    private drawCell(ctx: CanvasRenderingContext2D, cell: GridCell, fogState: FogState, terrain: TerrainData | undefined): void {
        if (fogState === FOG_STATE.UNKNOWN) {
            ctx.fillStyle = theme.worldMap.unknown;
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.35);
            ctx.font = '18px Georgia';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', cell.x + cell.width / 2, cell.y + cell.height / 2);
            return;
        }

        this.drawTerrain(ctx, cell, terrain, fogState === FOG_STATE.DISCOVERED ? 1 : 0.7);

        if (fogState === FOG_STATE.HIDDEN) {
            ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.16);
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        }
    }

    private drawTerrain(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData | undefined, brightness: number): void {
        if (!terrain) return;

        ctx.fillStyle = this.adjustColorBrightness(terrain.color, brightness);
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

        this.drawTerrainIcon(ctx, cell, terrain.type, brightness);
        this.drawTerrainPattern(ctx, cell, terrain.pattern, brightness);
    }

    private drawTerrainIcon(ctx: CanvasRenderingContext2D, cell: GridCell, type: TerrainData['type'], brightness: number): void {
        const color = this.withAlpha(theme.ui.primaryAccent, 0.26 * brightness);
        ctx.fillStyle = color;
        const cx = cell.x + cell.width / 2;
        const cy = cell.y + cell.height / 2;

        if (type === 'mountain') {
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy + 6);
            ctx.lineTo(cx, cy - 7);
            ctx.lineTo(cx + 6, cy + 6);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'forest') {
            ctx.beginPath();
            ctx.arc(cx, cy - 1, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 1, cy + 4, 2, 5);
        } else if (type === 'water') {
            ctx.fillRect(cx - 7, cy - 1, 14, 2);
            ctx.fillRect(cx - 5, cy + 3, 10, 2);
        } else if (type === 'desert') {
            ctx.beginPath();
            ctx.arc(cx - 3, cy + 1, 4, Math.PI, Math.PI * 2);
            ctx.arc(cx + 3, cy + 1, 4, Math.PI, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawTerrainPattern(ctx: CanvasRenderingContext2D, cell: GridCell, pattern: TerrainData['pattern'], brightness: number): void {
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.1 * brightness);
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;

        if (pattern === 'dots') {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(cell.x + (i + 1) * cell.width / 4, cell.y + (j + 1) * cell.height / 4, 1.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            return;
        }

        if (pattern === 'lines') {
            ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.15 * brightness);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 1; i < 5; i++) {
                const x = cell.x + i * cell.width / 5;
                ctx.moveTo(x, cell.y);
                ctx.lineTo(x, cell.y + cell.height);
            }
            ctx.stroke();
            return;
        }

        if (pattern === 'cross') {
            ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.16 * brightness);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cell.x, centerY);
            ctx.lineTo(cell.x + cell.width, centerY);
            ctx.moveTo(centerX, cell.y);
            ctx.lineTo(centerX, cell.y + cell.height);
            ctx.stroke();
        }
    }

    private adjustColorBrightness(color: string, brightness: number): string {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const newR = Math.floor(r * brightness);
        const newG = Math.floor(g * brightness);
        const newB = Math.floor(b * brightness);
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    private withAlpha(hexColor: string, alpha: number): string {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
