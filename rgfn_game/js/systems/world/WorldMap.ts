import GridMap from '../../utils/GridMap.js';
import { FogState, TerrainData, GridPosition, Direction, GridCell, TerrainNeighbors, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapRenderer from './WorldMapRenderer.js';

const FOG_STATE = {
    UNKNOWN: 'unknown' as FogState,
    DISCOVERED: 'discovered' as FogState,
    HIDDEN: 'hidden' as FogState,
};

export default class WorldMap {
    private grid: GridMap;
    private playerGridPos: GridPosition;
    private fogStates: Map<string, FogState>;
    private terrainData: Map<string, TerrainData>;
    private villages: Set<string>;
    private renderer: WorldMapRenderer;
    private namedLocations: Map<string, GridPosition>;
    private focusedLocationName: string | null;

    constructor(columns: number, rows: number, cellSize: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.playerGridPos = { col: Math.floor(columns / 2), row: Math.floor(rows / 2) };
        this.fogStates = new Map();
        this.terrainData = new Map();
        this.villages = new Set();
        this.renderer = new WorldMapRenderer();
        this.namedLocations = new Map();
        this.focusedLocationName = null;
        this.initializeFogOfWar();
        this.generateTerrain();
        this.generateVillages();
        this.discoverCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private initializeFogOfWar(): void {
        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            this.fogStates.set(this.getCellKey(col, row), FOG_STATE.UNKNOWN);
        });
    }

    private generateTerrain(): void {
        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            this.terrainData.set(this.getCellKey(col, row), this.generateCellTerrain(col, row));
        });
    }

    private generateVillages(): void {
        const dims = this.grid.getDimensions();
        const villageCount = Math.max(4, Math.floor((dims.columns * dims.rows) * 0.024));
        const centerCol = Math.floor(dims.columns / 2);
        const centerRow = Math.floor(dims.rows / 2);

        while (this.villages.size < villageCount) {
            const col = Math.floor(Math.random() * dims.columns);
            const row = Math.floor(Math.random() * dims.rows);
            const terrain = this.getTerrain(col, row);

            if (!terrain || terrain.type === 'water' || terrain.type === 'mountain') {
                continue;
            }

            if (col === centerCol && row === centerRow) {
                continue;
            }

            const nearestVillageDistance = Array.from(this.villages).reduce((closest, key) => {
                const [vColText, vRowText] = key.split(',');
                const vCol = Number(vColText);
                const vRow = Number(vRowText);
                return Math.min(closest, Math.abs(vCol - col) + Math.abs(vRow - row));
            }, Number.POSITIVE_INFINITY);

            if (nearestVillageDistance < 4) {
                continue;
            }

            this.villages.add(this.getCellKey(col, row));
        }
    }

    private generateCellTerrain(col: number, row: number): TerrainData {
        const dims = this.grid.getDimensions();
        const nx = dims.columns <= 1 ? 0 : col / (dims.columns - 1);
        const ny = dims.rows <= 1 ? 0 : row / (dims.rows - 1);
        const baseSeed = ((col + 1) * 92837111) ^ ((row + 1) * 689287499);

        const elevationNoise = this.fractalNoise(nx * 1.15, ny * 1.15, 4, 0.55, 1.95);
        const moistureNoise = this.fractalNoise((nx + 12.4) * 1.55, (ny - 3.1) * 1.55, 3, 0.58, 2.1);
        const heatNoise = this.fractalNoise((nx - 7.2) * 1.2, (ny + 18.7) * 1.2, 3, 0.48, 2.2);
        const riverNoise = this.fractalNoise((nx + 4.2) * 2.8, (ny + 9.6) * 2.8, 2, 0.5, 2.0);
        const edgeFalloff = this.distanceToNearestEdge(nx, ny);

        const elevation = this.clamp01((elevationNoise * 0.78) + (edgeFalloff * 0.34));
        const moisture = this.clamp01((moistureNoise * 0.82) + ((1 - elevation) * 0.18));
        const latitudeHeat = 1 - Math.min(1, Math.abs((ny - 0.5) * 1.6));
        const heat = this.clamp01((heatNoise * 0.45) + (latitudeHeat * 0.45) + ((1 - moisture) * 0.1));

        const riverBand = Math.abs(riverNoise - 0.5);
        const edgeWater = edgeFalloff < 0.18 && elevation < 0.58;
        const river = riverBand < 0.045 && elevation > 0.24 && elevation < 0.63;

        let type: TerrainType = 'grass';
        if (elevation < 0.24 || edgeWater || river) {
            type = 'water';
        } else if (elevation > 0.73) {
            type = 'mountain';
        } else if (heat > 0.66 && moisture < 0.34) {
            type = 'desert';
        } else if (moisture > 0.58) {
            type = 'forest';
        }

        return {
            type,
            color: this.getTerrainColor(type),
            pattern: this.generateTerrainPattern(type, baseSeed),
            elevation,
            moisture,
            heat,
            seed: baseSeed,
        };
    }

    private getTerrainColor(type: TerrainType): string {
        return theme.worldMap.terrain[type];
    }

    private generateTerrainPattern(type: TerrainType, seed: number): TerrainData['pattern'] {
        const random = this.seededRandom(seed * 1.77);
        if (type === 'water') {
            return random > 0.45 ? 'waves' : 'lines';
        }
        if (type === 'desert') {
            return random > 0.5 ? 'dunes' : 'dots';
        }
        if (type === 'forest') {
            return random > 0.55 ? 'groves' : 'dots';
        }
        if (type === 'mountain') {
            return random > 0.4 ? 'ridges' : 'cross';
        }
        return random > 0.65 ? 'plain' : 'lines';
    }

    private fractalNoise(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
        let amplitude = 1;
        let frequency = 1;
        let total = 0;
        let normalization = 0;

        for (let octave = 0; octave < octaves; octave++) {
            total += this.valueNoise(x * frequency, y * frequency) * amplitude;
            normalization += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return normalization === 0 ? 0 : total / normalization;
    }

    private valueNoise(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const sx = x - x0;
        const sy = y - y0;

        const n00 = this.hash2D(x0, y0);
        const n10 = this.hash2D(x1, y0);
        const n01 = this.hash2D(x0, y1);
        const n11 = this.hash2D(x1, y1);

        const ix0 = this.lerp(n00, n10, this.smoothStep(sx));
        const ix1 = this.lerp(n01, n11, this.smoothStep(sx));
        return this.lerp(ix0, ix1, this.smoothStep(sy));
    }

    private hash2D(x: number, y: number): number {
        const seed = Math.sin((x * 127.1) + (y * 311.7)) * 43758.5453123;
        return seed - Math.floor(seed);
    }

    private smoothStep(value: number): number {
        return value * value * (3 - (2 * value));
    }

    private lerp(a: number, b: number, t: number): number {
        return a + ((b - a) * t);
    }

    private distanceToNearestEdge(nx: number, ny: number): number {
        return Math.min(nx, ny, 1 - nx, 1 - ny);
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
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
        this.grid.forEachCell((_cell: GridCell, c: number, r: number) => {
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

    private getTerrainNeighbors(col: number, row: number, terrainType: TerrainType): TerrainNeighbors {
        const isSameVisibleTerrain = (targetCol: number, targetRow: number): boolean => {
            const fogState = this.getFogState(targetCol, targetRow);
            if (fogState === FOG_STATE.UNKNOWN) {
                return false;
            }

            const terrain = this.getTerrain(targetCol, targetRow);
            return terrain?.type === terrainType;
        };

        return {
            north: isSameVisibleTerrain(col, row - 1),
            south: isSameVisibleTerrain(col, row + 1),
            east: isSameVisibleTerrain(col + 1, row),
            west: isSameVisibleTerrain(col - 1, row),
            northEast: isSameVisibleTerrain(col + 1, row - 1),
            northWest: isSameVisibleTerrain(col - 1, row - 1),
            southEast: isSameVisibleTerrain(col + 1, row + 1),
            southWest: isSameVisibleTerrain(col - 1, row + 1),
        };
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
            return { moved: true, isPreviouslyDiscovered };
        }
        return { moved: false, isPreviouslyDiscovered: false };
    }

    public resizeToCanvas(canvasWidth: number, canvasHeight: number): void {
        const { columns, rows } = this.grid.getDimensions();
        const nextCellSize = Math.max(1, Math.floor(Math.min(canvasWidth / columns, canvasHeight / rows)));
        const mapWidth = columns * nextCellSize;
        const mapHeight = rows * nextCellSize;
        const baseOffsetX = Math.floor((canvasWidth - mapWidth) / 2);
        const baseOffsetY = Math.floor((canvasHeight - mapHeight) / 2);
        const offsetX = baseOffsetX + theme.worldMap.gridOffset.x;
        const offsetY = baseOffsetY + theme.worldMap.gridOffset.y;
        this.grid.updateLayout(nextCellSize, offsetX, offsetY);
    }

    public getPlayerPixelPosition(): [number, number] {
        return this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    }

    public getCurrentTerrain(): TerrainData {
        return this.getTerrain(this.playerGridPos.col, this.playerGridPos.row) ?? {
            type: 'grass',
            color: theme.worldMap.terrain.grass,
            pattern: 'plain',
            elevation: 0.5,
            moisture: 0.5,
            heat: 0.5,
            seed: 0,
        };
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
            const terrain = this.getTerrain(col, row);
            this.renderer.drawCell(
                ctx,
                cell,
                this.getFogState(col, row),
                terrain,
                terrain ? this.getTerrainNeighbors(col, row, terrain.type) : undefined,
            );
        });
        this.renderer.drawGrid(ctx, this.grid, dims.width, dims.height);
        this.drawVillages(ctx);
        this.drawNamedLocationFocus(ctx);
        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            this.renderer.drawPlayerMarker(ctx, playerCell);
        }
        this.renderer.drawScaleLegend(ctx, this.grid, `${theme.worldMap.cellTravelMinutes} min walk / cell`);
    }

    public registerNamedLocation(name: string): void {
        if (this.namedLocations.has(name)) {
            return;
        }

        const position = this.findNamedLocationPosition();
        if (position) {
            this.namedLocations.set(name, position);
        }
    }

    public revealNamedLocation(name: string): boolean {
        const position = this.namedLocations.get(name);
        if (!position || !this.isDiscovered(position.col, position.row)) {
            return false;
        }

        this.focusedLocationName = name;
        return true;
    }

    public clearFocusedLocation(): void {
        this.focusedLocationName = null;
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

    public getState(): Record<string, unknown> {
        return {
            playerGridPos: { ...this.playerGridPos },
            fogStates: Array.from(this.fogStates.entries()),
            villages: Array.from(this.villages.values()),
        };
    }

    public restoreState(state: Record<string, unknown>): void {
        const playerGridPos = state.playerGridPos as { col?: unknown; row?: unknown } | undefined;
        if (playerGridPos && typeof playerGridPos.col === 'number' && typeof playerGridPos.row === 'number' && this.grid.isValidPosition(playerGridPos.col, playerGridPos.row)) {
            this.playerGridPos = { col: playerGridPos.col, row: playerGridPos.row };
        }

        if (Array.isArray(state.fogStates)) {
            this.fogStates = new Map(
                state.fogStates.filter((entry): entry is [string, FogState] => Array.isArray(entry)
                    && entry.length === 2
                    && typeof entry[0] === 'string'
                    && (entry[1] === FOG_STATE.UNKNOWN || entry[1] === FOG_STATE.HIDDEN || entry[1] === FOG_STATE.DISCOVERED)),
            );
        }

        if (Array.isArray(state.villages)) {
            this.villages = new Set(state.villages.filter((entry): entry is string => typeof entry === 'string'));
        }
    }

    private findNamedLocationPosition(): GridPosition | null {
        const dims = this.grid.getDimensions();
        const attempts = dims.columns * dims.rows * 2;

        for (let attempt = 0; attempt < attempts; attempt++) {
            const col = Math.floor(Math.random() * dims.columns);
            const row = Math.floor(Math.random() * dims.rows);
            const terrain = this.getTerrain(col, row);
            const key = this.getCellKey(col, row);

            if (!terrain || terrain.type === 'water' || this.namedLocationsHasCell(key)) {
                continue;
            }

            return { col, row };
        }

        return null;
    }

    private namedLocationsHasCell(key: string): boolean {
        return Array.from(this.namedLocations.values()).some((position) => this.getCellKey(position.col, position.row) === key);
    }

    private isDiscovered(col: number, row: number): boolean {
        return this.getFogState(col, row) !== FOG_STATE.UNKNOWN;
    }

    private drawNamedLocationFocus(ctx: CanvasRenderingContext2D): void {
        if (!this.focusedLocationName) {
            return;
        }

        const position = this.namedLocations.get(this.focusedLocationName);
        if (!position) {
            return;
        }

        const cell = this.grid.getCellAt(position.col, position.row);
        if (!cell) {
            return;
        }

        this.renderer.drawNamedLocationFocus(ctx, cell, this.focusedLocationName);
    }
}
