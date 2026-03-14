import GridMap from '../../utils/GridMap.js';
import { FogState, TerrainData, GridPosition, Direction, GridCell } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapRenderer from './WorldMapRenderer.js';
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
    private villages: Set<string>;
    private renderer: WorldMapRenderer;
    constructor(columns: number, rows: number, cellSize: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.playerGridPos = { col: Math.floor(columns / 2), row: Math.floor(rows / 2) };
        this.fogStates = new Map();
        this.terrainData = new Map();
        this.villages = new Set();
        this.renderer = new WorldMapRenderer();
        this.initializeFogOfWar();
        this.generateTerrain();
        this.generateVillages();
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
    private generateVillages(): void {
        const dims = this.grid.getDimensions();
        const villageCount = Math.max(3, Math.floor((dims.columns * dims.rows) * 0.035));
        const centerCol = Math.floor(dims.columns / 2);
        const centerRow = Math.floor(dims.rows / 2);
        while (this.villages.size < villageCount) {
            const col = Math.floor(Math.random() * dims.columns);
            const row = Math.floor(Math.random() * dims.rows);
            if (col === centerCol && row === centerRow) {
                continue;
            }
            this.villages.add(this.getCellKey(col, row));
        }
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
        if (direction === 'up') {
            newRow--;
        }
        if (direction === 'down') {
            newRow++;
        }
        if (direction === 'left') {
            newCol--;
        }
        if (direction === 'right') {
            newCol++;
        }
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
    public isPlayerOnVillage(): boolean {
        return this.villages.has(this.getCellKey(this.playerGridPos.col, this.playerGridPos.row));
    }
    public markVillageAtPlayerPosition(): void {
        this.villages.add(this.getCellKey(this.playerGridPos.col, this.playerGridPos.row));
    }
    public isPlayerOnEdge(): boolean {
        const { columns, rows } = this.grid.getDimensions();
        const { col, row } = this.playerGridPos;
        return col === 0 || row === 0 || col === columns - 1 || row === rows - 1;
    }
    public draw(ctx: CanvasRenderingContext2D, _renderer: any): void {
        const dims = this.grid.getDimensions();
        this.renderer.drawBackground(ctx, dims.width, dims.height);
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            this.renderer.drawCell(ctx, cell, this.getFogState(col, row), this.getTerrain(col, row));
        });
        this.renderer.drawGrid(ctx, this.grid, dims.width, dims.height);
        this.drawVillages(ctx);
        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            this.renderer.drawPlayerMarker(ctx, playerCell);
        }
    }
    private drawVillages(ctx: CanvasRenderingContext2D): void {
        this.villages.forEach((key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            const fogState = this.getFogState(col, row);
            if (fogState === FOG_STATE.UNKNOWN) {
                return;
            }
            const cell = this.grid.getCellAt(col, row);
            if (!cell) {
                return;
            }
            const x = cell.x + cell.width / 2;
            const y = cell.y + cell.height / 2;
            const villageGlow = fogState === FOG_STATE.DISCOVERED ? 0.95 : 0.82;
            this.renderer.drawVillage(ctx, x, y, villageGlow);
        });
    }
}
