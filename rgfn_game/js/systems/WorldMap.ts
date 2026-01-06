import GridMap from '../utils/GridMap.js';
import { FogState, TerrainData, GridPosition, Direction, GridCell } from '../types/game.js';
import { themeManager } from '../config/ThemeConfig.js';

// Fog of war states
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

        // Initialize fog of war and terrain for all cells
        this.initializeFogOfWar();
        this.generateTerrain();

        // Discover starting cell
        this.discoverCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private initializeFogOfWar(): void {
        // Set all cells to unknown initially
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            const key = this.getCellKey(col, row);
            this.fogStates.set(key, FOG_STATE.UNKNOWN);
        });
    }

    private generateTerrain(): void {
        // Generate random terrain for each cell
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            const key = this.getCellKey(col, row);
            const terrain = this.generateCellTerrain(col, row);
            this.terrainData.set(key, terrain);
        });
    }

    private generateCellTerrain(col: number, row: number): TerrainData {
        // Generate pseudo-random terrain based on cell coordinates
        const seed = col * 1000 + row;
        const random = this.seededRandom(seed);
        const theme = themeManager.getTheme();

        // Choose terrain type
        const terrainTypes = [
            { type: 'grass' as const, color: theme.worldMap.terrain.grass, probability: 0.4 },
            { type: 'forest' as const, color: theme.worldMap.terrain.forest, probability: 0.25 },
            { type: 'mountain' as const, color: theme.worldMap.terrain.mountain, probability: 0.15 },
            { type: 'water' as const, color: theme.worldMap.terrain.water, probability: 0.15 },
            { type: 'desert' as const, color: theme.worldMap.terrain.desert, probability: 0.05 }
        ];

        let accumulator = 0;
        for (const terrain of terrainTypes) {
            accumulator += terrain.probability;
            if (random < accumulator) {
                return {
                    type: terrain.type,
                    color: terrain.color,
                    pattern: this.generateTerrainPattern(seed)
                };
            }
        }

        return {
            type: terrainTypes[0].type,
            color: terrainTypes[0].color,
            pattern: this.generateTerrainPattern(seed)
        };
    }

    private generateTerrainPattern(seed: number): TerrainData['pattern'] {
        // Generate a simple pattern (dots, lines, etc.) for visual variety
        const patterns: TerrainData['pattern'][] = ['dots', 'lines', 'cross', 'plain'];
        const index = Math.floor(this.seededRandom(seed * 2) * patterns.length);
        return patterns[index];
    }

    private seededRandom(seed: number): number {
        // Simple seeded random number generator
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    private getCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private discoverCell(col: number, row: number): void {
        const key = this.getCellKey(col, row);

        // Mark current cell as discovered
        this.fogStates.set(key, FOG_STATE.DISCOVERED);

        // Update all other cells that were discovered back to hidden
        this.grid.forEachCell((cell: GridCell, c: number, r: number) => {
            const cellKey = this.getCellKey(c, r);
            const state = this.fogStates.get(cellKey);
            if (state === FOG_STATE.DISCOVERED && cellKey !== key) {
                this.fogStates.set(cellKey, FOG_STATE.HIDDEN);
            }
        });
    }

    private getFogState(col: number, row: number): FogState {
        const key = this.getCellKey(col, row);
        return this.fogStates.get(key) || FOG_STATE.UNKNOWN;
    }

    private getTerrain(col: number, row: number): TerrainData | undefined {
        const key = this.getCellKey(col, row);
        return this.terrainData.get(key);
    }

    public movePlayer(direction: Direction): boolean {
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
            // Discover the new cell
            this.discoverCell(newCol, newRow);
            return true; // Moved successfully
        }

        return false; // Can't move there
    }

    public getPlayerPixelPosition(): [number, number] {
        return this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    }

    public draw(ctx: CanvasRenderingContext2D, renderer: any): void {
        const dims = this.grid.getDimensions();
        const theme = themeManager.getTheme();

        // Draw grid background
        ctx.fillStyle = theme.worldMap.background;
        ctx.fillRect(0, 0, dims.width, dims.height);

        // Draw all cells based on their fog state
        this.grid.forEachCell((cell: GridCell, col: number, row: number) => {
            const fogState = this.getFogState(col, row);
            const terrain = this.getTerrain(col, row);

            this.drawCell(ctx, cell, fogState, terrain, col, row);
        });

        // Draw grid lines
        ctx.strokeStyle = theme.worldMap.gridLines;
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
            ctx.fillStyle = 'rgba(0, 204, 255, 0.3)';
            ctx.fillRect(playerCell.x, playerCell.y, playerCell.width, playerCell.height);

            // Draw player marker
            ctx.fillStyle = theme.worldMap.playerMarker;
            const centerX = playerCell.x + playerCell.width / 2;
            const centerY = playerCell.y + playerCell.height / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawCell(ctx: CanvasRenderingContext2D, cell: GridCell, fogState: FogState, terrain: TerrainData | undefined, col: number, row: number): void {
        const theme = themeManager.getTheme();

        switch (fogState) {
            case FOG_STATE.UNKNOWN:
                // Unknown cells - all look identical (dark/mysterious)
                ctx.fillStyle = theme.worldMap.unknown;
                ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

                // Add subtle question mark or unknown indicator
                ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
                ctx.font = '20px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', cell.x + cell.width / 2, cell.y + cell.height / 2);
                break;

            case FOG_STATE.DISCOVERED:
                // Currently visible - show full terrain with bright colors
                this.drawTerrain(ctx, cell, terrain, 1.0);
                break;

            case FOG_STATE.HIDDEN:
                // Visited but not currently visible - show terrain but darker
                this.drawTerrain(ctx, cell, terrain, 0.5);

                // Add a dark overlay to indicate it's not currently visible
                ctx.fillStyle = 'rgba(10, 10, 26, 0.4)';
                ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
                break;
        }
    }

    private drawTerrain(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData | undefined, brightness: number): void {
        if (!terrain) return;

        // Parse color and apply brightness
        const color = this.adjustColorBrightness(terrain.color, brightness);
        ctx.fillStyle = color;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

        // Draw terrain pattern
        this.drawTerrainPattern(ctx, cell, terrain.pattern, brightness);

        // Draw terrain type indicator (small text)
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(terrain.type[0].toUpperCase(), cell.x + 2, cell.y + 2);
    }

    private drawTerrainPattern(ctx: CanvasRenderingContext2D, cell: GridCell, pattern: TerrainData['pattern'], brightness: number): void {
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;

        switch (pattern) {
            case 'dots':
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        const x = cell.x + (i + 1) * cell.width / 4;
                        const y = cell.y + (j + 1) * cell.height / 4;
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;

            case 'lines':
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const x = cell.x + i * cell.width / 5;
                    ctx.moveTo(x, cell.y);
                    ctx.lineTo(x, cell.y + cell.height);
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;

            case 'cross':
                ctx.beginPath();
                ctx.moveTo(cell.x, centerY);
                ctx.lineTo(cell.x + cell.width, centerY);
                ctx.moveTo(centerX, cell.y);
                ctx.lineTo(centerX, cell.y + cell.height);
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;

            case 'plain':
            default:
                // No pattern
                break;
        }
    }

    private adjustColorBrightness(color: string, brightness: number): string {
        // Parse hex color
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Apply brightness
        const newR = Math.floor(r * brightness);
        const newG = Math.floor(g * brightness);
        const newB = Math.floor(b * brightness);

        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
}
