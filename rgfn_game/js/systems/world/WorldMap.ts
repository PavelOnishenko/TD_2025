import GridMap from '../../utils/GridMap.js';
import { FogState, MapDisplayConfig, TerrainData, GridPosition, Direction, GridCell, TerrainNeighbors, TerrainType, SelectedWorldCellInfo } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapRenderer from './WorldMapRenderer.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { generateVillageName } from './VillageNameGenerator.js';

export type KnownVillage = {
    name: string;
    col: number;
    row: number;
    terrain: TerrainType;
    status: 'current' | 'mapped';
};

export type WorldVillageDirectionHint = {
    settlementName: string;
    exists: boolean;
    direction?: 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
    distanceCells?: number;
};

const FOG_STATE = { UNKNOWN: 'unknown' as FogState, DISCOVERED: 'discovered' as FogState, HIDDEN: 'hidden' as FogState };

const DEFAULT_MAP_DISPLAY_CONFIG: MapDisplayConfig = {
    everythingDiscovered: false,
    fogOfWar: true,
};

type NamedLocation = {
    name: string;
    position: GridPosition;
    terrainType: TerrainType;
};

type VillageRoadPoint = {
    x: number;
    y: number;
};

type VillageRoadLink = {
    from: GridPosition;
    to: GridPosition;
    control1: VillageRoadPoint;
    control2: VillageRoadPoint;
};

type ClimateCell = {
    col: number;
    row: number;
    seed: number;
    elevation: number;
    moisture: number;
    heat: number;
    forestSuitability: number;
    grassSuitability: number;
    inlandWaterSuitability: number;
};

type TerrainLayerCache = {
    canvas: HTMLCanvasElement;
    cellSize: number;
    terrainRevision: number;
    detailLevel: 'low' | 'medium';
};

export default class WorldMap {
    private grid: GridMap;
    private playerGridPos: GridPosition;
    private fogStates: Map<string, FogState>;
    private terrainData: Map<string, TerrainData>;
    private villages: Set<string>;
    private visitedCells: Set<string>;
    private selectedGridPos: GridPosition | null;
    private renderer: WorldMapRenderer;
    private namedLocations: Map<string, NamedLocation>;
    private focusedLocationName: string | null;
    private worldSeed: number;
    private canvasWidth: number;
    private canvasHeight: number;
    private mapDisplayConfig: MapDisplayConfig;
    private fogStatesByIndex: FogState[];
    private terrainByIndex: Array<TerrainData | undefined>;
    private villageIndexSet: Set<number>;
    private roadIndexSet: Set<number>;
    private villageRoadLinks: VillageRoadLink[];
    private terrainLayerCaches: Partial<Record<'low' | 'medium', TerrainLayerCache>>;
    private fogRevision: number;
    private terrainRevision: number;

    constructor(columns: number, rows: number, cellSize: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.playerGridPos = { col: 0, row: 0 };
        this.fogStates = new Map();
        this.terrainData = new Map();
        this.villages = new Set();
        this.visitedCells = new Set();
        this.selectedGridPos = null;
        this.renderer = new WorldMapRenderer();
        this.namedLocations = new Map<string, NamedLocation>();
        this.focusedLocationName = null;
        this.worldSeed = this.createWorldSeed();
        this.canvasWidth = columns * cellSize;
        this.canvasHeight = rows * cellSize;
        this.mapDisplayConfig = { ...DEFAULT_MAP_DISPLAY_CONFIG };
        this.fogStatesByIndex = [];
        this.terrainByIndex = [];
        this.villageIndexSet = new Set<number>();
        this.roadIndexSet = new Set<number>();
        this.villageRoadLinks = [];
        this.terrainLayerCaches = {};
        this.fogRevision = 0;
        this.terrainRevision = 0;
        this.initializeFogOfWar();
        this.generateWorld();
        this.visitedCells.add(this.getCellKey(this.playerGridPos.col, this.playerGridPos.row));
        this.refreshVisibility();
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private initializeFogOfWar(): void {
        this.fogStatesByIndex = new Array(this.grid.columns * this.grid.rows).fill(FOG_STATE.UNKNOWN);
        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            this.fogStates.set(this.getCellKey(col, row), FOG_STATE.UNKNOWN);
        });
    }

    private generateWorld(): void {
        this.generateTerrain();
        this.generateVillages();
        this.generateVillageRoadNetwork();
        this.pickRandomPlayerStart();
    }

    private generateTerrain(): void {
        this.terrainRevision += 1;
        const dims = this.grid.getDimensions();
        const climates: ClimateCell[] = [];

        for (let row = 0; row < dims.rows; row += 1) {
            for (let col = 0; col < dims.columns; col += 1) {
                climates.push(this.createClimateCell(col, row, dims.columns, dims.rows));
            }
        }

        const climateByKey = new Map(climates.map((climate) => [this.getCellKey(climate.col, climate.row), climate]));
        const lakeCells = this.generateLakeCells(climateByKey, dims.columns, dims.rows);
        const riverCells = this.generateRiverCells(climateByKey, dims.columns, dims.rows);
        const forestTarget = this.getForestCoverageTarget();
        const forestThreshold = this.getQuantileThreshold(
            climates.filter((climate) => !lakeCells.has(this.getCellKey(climate.col, climate.row)) && !riverCells.has(this.getCellKey(climate.col, climate.row))),
            (climate) => climate.forestSuitability,
            forestTarget,
        );

        this.terrainData.clear();
        this.terrainByIndex = new Array(dims.columns * dims.rows);
        climates.forEach((climate) => {
            const key = this.getCellKey(climate.col, climate.row);
            const type = this.resolveTerrainType(climate, forestThreshold, lakeCells.has(key), riverCells.has(key));
            const terrain = {
                type,
                color: this.getTerrainColor(type),
                pattern: this.generateTerrainPattern(type, climate.seed),
                elevation: climate.elevation,
                moisture: climate.moisture,
                heat: climate.heat,
                seed: climate.seed,
            };
            this.terrainData.set(key, terrain);
            this.terrainByIndex[this.getCellIndex(climate.col, climate.row)] = terrain;
        });
    }

    private createClimateCell(col: number, row: number, columns: number, rows: number): ClimateCell {
        const nx = columns <= 1 ? 0 : col / (columns - 1);
        const ny = rows <= 1 ? 0 : row / (rows - 1);
        const seed = this.hashSeed((col + 1) * 92837111, (row + 1) * 689287499);
        const weights = balanceConfig.worldMap.terrainWeights;

        const elevationNoise = this.fractalNoise(nx * 1.4, ny * 1.4, 4, 0.52, 2.05);
        const moistureNoise = this.fractalNoise((nx + 17.2) * 1.72, (ny - 5.4) * 1.72, 4, 0.56, 2.1);
        const heatNoise = this.fractalNoise((nx - 8.1) * 1.28, (ny + 13.7) * 1.28, 3, 0.5, 2.15);
        const forestNoise = this.fractalNoise((nx + 3.4) * 2.15, (ny + 7.9) * 2.15, 3, 0.58, 2.0);
        const waterNoise = this.fractalNoise((nx + 11.8) * 2.4, (ny - 6.6) * 2.4, 2, 0.6, 2.0);

        const elevation = this.clamp01((elevationNoise * 0.85) + (forestNoise * 0.08));
        const moisture = this.clamp01((moistureNoise * 0.76) + ((1 - elevation) * 0.16) + (waterNoise * 0.08));
        const temperateBand = 1 - Math.min(1, Math.abs((ny - 0.5) * 1.15));
        const heat = this.clamp01((heatNoise * 0.44) + (temperateBand * 0.28) + ((1 - moisture) * 0.28));
        const waterLowlands = this.clamp01((1 - elevation) * 0.7 + (moisture * 0.3));

        return {
            col,
            row,
            seed,
            elevation,
            moisture,
            heat,
            forestSuitability: (weights.forest * 1.4) + (moisture * 0.9) + (forestNoise * 0.55) + (temperateBand * 0.22),
            grassSuitability: (weights.grass * 1.2) + ((1 - Math.abs(moisture - 0.52)) * 0.58) + (temperateBand * 0.22) + ((1 - elevation) * 0.1),
            inlandWaterSuitability: (weights.water * 1.35) + (waterLowlands * 1.1) + (waterNoise * 0.3),
        };
    }

    private getForestCoverageTarget(): number {
        const configuredRange = balanceConfig.worldMap.forestCoverage ?? { min: 0.3, max: 0.6 };
        const min = this.clamp01(Math.min(configuredRange.min, configuredRange.max));
        const max = this.clamp01(Math.max(configuredRange.min, configuredRange.max));
        return min + ((max - min) * this.seededValue('forest-coverage', 0));
    }

    private resolveTerrainType(climate: ClimateCell, forestThreshold: number, isLake: boolean, isRiver: boolean): TerrainType {
        const highlandThreshold = balanceConfig.worldMap.highlandThreshold ?? 0.86;
        const inlandWaterThreshold = balanceConfig.worldMap.inlandWaterThreshold ?? 0.79;

        if (isLake || isRiver) {
            return 'water';
        }
        if (climate.forestSuitability >= forestThreshold) {
            return 'forest';
        }
        if (climate.elevation >= highlandThreshold && climate.moisture >= 0.48) {
            return 'forest';
        }
        if (climate.inlandWaterSuitability >= inlandWaterThreshold && climate.elevation < highlandThreshold - 0.08) {
            return 'water';
        }
        return 'grass';
    }

    private generateLakeCells(climateByKey: Map<string, ClimateCell>, columns: number, rows: number): Set<string> {
        const lakeConfig = balanceConfig.worldMap.lakes ?? { count: 7, minRadius: 2, maxRadius: 5, jitter: 0.38 };
        const cells = new Set<string>();
        const attempts = Math.max(lakeConfig.count * 10, 12);
        let created = 0;

        for (let attempt = 0; attempt < attempts && created < lakeConfig.count; attempt += 1) {
            const col = 2 + this.seededInt(Math.max(1, columns - 4), this.seededValue('lake-col', attempt));
            const row = 2 + this.seededInt(Math.max(1, rows - 4), this.seededValue('lake-row', attempt));
            const climate = climateByKey.get(this.getCellKey(col, row));
            if (!climate || climate.elevation > 0.62) {
                continue;
            }

            const minRadius = Math.max(1, lakeConfig.minRadius ?? 2);
            const maxRadius = Math.max(minRadius, lakeConfig.maxRadius ?? 5);
            const radius = minRadius + Math.floor(this.seededValue('lake-radius', attempt) * ((maxRadius - minRadius) + 1));
            const jitter = lakeConfig.jitter ?? 0.38;

            for (let y = row - radius - 1; y <= row + radius + 1; y += 1) {
                for (let x = col - radius - 1; x <= col + radius + 1; x += 1) {
                    if (!this.grid.isValidPosition(x, y)) {
                        continue;
                    }

                    const dx = x - col;
                    const dy = y - row;
                    const distance = Math.sqrt((dx * dx) + (dy * dy));
                    const ripple = this.seededRandom(this.hashSeed(x * 101, y * 313, attempt * 997));
                    const edge = radius + ((ripple - 0.5) * jitter * radius);
                    if (distance <= edge) {
                        cells.add(this.getCellKey(x, y));
                    }
                }
            }

            created += 1;
        }

        return cells;
    }

    private generateRiverCells(climateByKey: Map<string, ClimateCell>, columns: number, rows: number): Set<string> {
        const riverConfig = balanceConfig.worldMap.rivers ?? { count: 5, maxLengthFactor: 0.72, turnRate: 0.34, width: 1 };
        const riverCells = new Set<string>();
        const sourceCandidates = Array.from(climateByKey.values())
            .filter((climate) => climate.elevation >= 0.7)
            .sort((left, right) => right.elevation - left.elevation);

        const riverCount = Math.min(riverConfig.count ?? 0, sourceCandidates.length);
        const maxLength = Math.max(columns, rows) * (riverConfig.maxLengthFactor ?? 0.72);
        const turnRate = riverConfig.turnRate ?? 0.34;
        const riverWidth = Math.max(1, Math.floor(riverConfig.width ?? 1));
        const usedSources = new Set<string>();

        for (let riverIndex = 0; riverIndex < riverCount; riverIndex += 1) {
            const source = sourceCandidates.find((candidate) => !usedSources.has(this.getCellKey(candidate.col, candidate.row)));
            if (!source) {
                break;
            }

            usedSources.add(this.getCellKey(source.col, source.row));
            let current = { col: source.col, row: source.row };

            for (let step = 0; step < maxLength; step += 1) {
                this.addWaterBrush(riverCells, current.col, current.row, riverWidth);

                const next = this.pickNextRiverStep(current.col, current.row, climateByKey, turnRate, riverIndex, step);
                if (!next) {
                    break;
                }

                current = next;
                const climate = climateByKey.get(this.getCellKey(current.col, current.row));
                if (!climate) {
                    break;
                }

                if (current.col <= 0 || current.row <= 0 || current.col >= columns - 1 || current.row >= rows - 1 || climate.elevation <= 0.34) {
                    this.addWaterBrush(riverCells, current.col, current.row, riverWidth + 1);
                    break;
                }
            }
        }

        return riverCells;
    }

    private pickNextRiverStep(
        col: number,
        row: number,
        climateByKey: Map<string, ClimateCell>,
        turnRate: number,
        riverIndex: number,
        step: number,
    ): GridPosition | null {
        const directions = [{ col: 0, row: 1 }, { col: -1, row: 1 }, { col: 1, row: 1 }, { col: -1, row: 0 }, { col: 1, row: 0 }, { col: 0, row: -1 }];

        const ranked = directions
            .map((direction, directionIndex) => {
                const nextCol = col + direction.col;
                const nextRow = row + direction.row;
                if (!this.grid.isValidPosition(nextCol, nextRow)) {
                    return null;
                }

                const climate = climateByKey.get(this.getCellKey(nextCol, nextRow));
                if (!climate) {
                    return null;
                }

                const randomTurn = this.seededValue(`river-turn-${riverIndex}`, (step * directions.length) + directionIndex);
                const downhillBias = (1 - climate.elevation) * 1.4;
                const moistureBias = climate.moisture * 0.32;
                const eastWestBias = Math.abs(direction.col) > 0 ? randomTurn * turnRate : (1 - turnRate);
                const score = downhillBias + moistureBias + eastWestBias;
                return {
                    position: { col: nextCol, row: nextRow },
                    score,
                };
            })
            .filter((entry): entry is { position: GridPosition; score: number } => entry !== null)
            .sort((left, right) => right.score - left.score);

        return ranked[0]?.position ?? null;
    }

    private addWaterBrush(cells: Set<string>, col: number, row: number, radius: number): void {
        for (let y = row - radius; y <= row + radius; y += 1) {
            for (let x = col - radius; x <= col + radius; x += 1) {
                if (!this.grid.isValidPosition(x, y)) {
                    continue;
                }

                const distance = Math.abs(x - col) + Math.abs(y - row);
                if (distance <= radius) {
                    cells.add(this.getCellKey(x, y));
                }
            }
        }
    }

    private getQuantileThreshold<T>(items: T[], selector: (item: T) => number, share: number): number {
        if (items.length === 0) {
            return Number.POSITIVE_INFINITY;
        }

        const sorted = items.map(selector).sort((left, right) => right - left);
        const clampedShare = this.clamp01(share);
        const targetIndex = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * clampedShare) - 1));
        return sorted[targetIndex] ?? Number.POSITIVE_INFINITY;
    }

    private pickRandomPlayerStart(): void {
        const dims = this.grid.getDimensions();
        const candidates: GridPosition[] = [];

        for (let row = 0; row < dims.rows; row += 1) {
            for (let col = 0; col < dims.columns; col += 1) {
                const terrain = this.getTerrain(col, row);
                if (terrain && terrain.type !== 'water' && terrain.type !== 'mountain' && !this.villages.has(this.getCellKey(col, row))) {
                    candidates.push({ col, row });
                }
            }
        }

        if (candidates.length === 0) {
            this.playerGridPos = { col: Math.floor(dims.columns / 2), row: Math.floor(dims.rows / 2) };
            return;
        }

        const candidateIndex = this.seededInt(candidates.length, this.seededValue('player-start', 0));
        this.playerGridPos = candidates[candidateIndex] ?? candidates[0];
    }

    private generateVillages(): void {
        const dims = this.grid.getDimensions();
        const baseVillageCount = Math.max(
            balanceConfig.worldMap.villages.minCount,
            Math.floor((dims.columns * dims.rows) * balanceConfig.worldMap.villages.densityPerCell),
        );
        const villageCount = Math.max(1, Math.floor(baseVillageCount * (balanceConfig.worldMap.villages.creationRateMultiplier ?? 1)));
        this.villages.clear();
        this.villageIndexSet.clear();

        for (let attempt = 0; this.villages.size < villageCount && attempt < dims.columns * dims.rows * 8; attempt += 1) {
            const col = this.seededInt(dims.columns, this.seededValue('village-col', attempt));
            const row = this.seededInt(dims.rows, this.seededValue('village-row', attempt));
            const terrain = this.getTerrain(col, row);

            if (!terrain || terrain.type === 'water' || terrain.type === 'mountain' || terrain.type === 'desert') {
                continue;
            }
            const nearestVillageDistance = Array.from(this.villages).reduce((closest, key) => {
                const [vColText, vRowText] = key.split(',');
                const vCol = Number(vColText);
                const vRow = Number(vRowText);
                return Math.min(closest, Math.abs(vCol - col) + Math.abs(vRow - row));
            }, Number.POSITIVE_INFINITY);

            if (nearestVillageDistance < 6) {
                continue;
            }

            const key = this.getCellKey(col, row);
            this.villages.add(key);
            this.villageIndexSet.add(this.getCellIndex(col, row));
        }
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
        const seed = Math.sin((x * 127.1) + (y * 311.7) + this.worldSeed) * 43758.5453123;
        return seed - Math.floor(seed);
    }

    private smoothStep(value: number): number {
        return value * value * (3 - (2 * value));
    }

    private lerp(a: number, b: number, t: number): number {
        return a + ((b - a) * t);
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    private seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    private createWorldSeed(): number {
        return Math.floor(Math.random() * 0x7fffffff);
    }

    private hashSeed(...parts: number[]): number {
        let value = this.worldSeed || 1;
        for (const part of parts) {
            value = Math.imul(value ^ Math.floor(part), 1664525) + 1013904223;
            value >>>= 0;
        }
        return value;
    }

    private seededValue(label: string, index: number): number {
        const labelHash = Array.from(label).reduce((total, char, charIndex) => total + (char.charCodeAt(0) * (charIndex + 1)), 0);
        return this.seededRandom(this.hashSeed(labelHash, index + 1));
    }

    private seededInt(maxExclusive: number, randomValue: number): number {
        return Math.floor(randomValue * maxExclusive);
    }

    private getCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private getCellIndex(col: number, row: number): number {
        return (row * this.grid.columns) + col;
    }

    private refreshVisibility(): void {
        this.fogRevision += 1;
        for (let index = 0; index < this.fogStatesByIndex.length; index += 1) {
            if (this.fogStatesByIndex[index] === FOG_STATE.DISCOVERED) {
                this.fogStatesByIndex[index] = FOG_STATE.HIDDEN;
            }
        }

        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            if (!this.isCellVisible(col, row)) {
                return;
            }

            this.fogStatesByIndex[this.getCellIndex(col, row)] = FOG_STATE.DISCOVERED;
        });

        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            const key = this.getCellKey(col, row);
            this.fogStates.set(key, this.fogStatesByIndex[this.getCellIndex(col, row)] ?? FOG_STATE.UNKNOWN);
        });
    }

    private getFogState(col: number, row: number): FogState {
        const storedFogState = this.fogStates.get(this.getCellKey(col, row))
            || this.fogStatesByIndex[this.getCellIndex(col, row)]
            || FOG_STATE.UNKNOWN;

        if (this.mapDisplayConfig.everythingDiscovered) {
            return FOG_STATE.DISCOVERED;
        }

        if (!this.mapDisplayConfig.fogOfWar && storedFogState === FOG_STATE.UNKNOWN) {
            return FOG_STATE.HIDDEN;
        }

        return storedFogState;
    }

    private getTerrain(col: number, row: number): TerrainData | undefined {
        return this.terrainData.get(this.getCellKey(col, row)) ?? this.terrainByIndex[this.getCellIndex(col, row)];
    }

    public isCellVisible(col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }

        const dx = col - this.playerGridPos.col;
        const dy = row - this.playerGridPos.row;
        const visibilityRadius = balanceConfig.worldMap.visibilityRadius ?? 2;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > visibilityRadius) {
            return false;
        }

        if (dx === 0 && dy === 0) {
            return true;
        }

        const line = this.getLineBetween(this.playerGridPos.col, this.playerGridPos.row, col, row);
        for (let index = 1; index < line.length; index += 1) {
            const step = line[index];
            const terrain = this.getTerrain(step.col, step.row);
            if (!terrain) {
                return false;
            }

            const isTarget = step.col === col && step.row === row;
            if (terrain.type === 'forest') {
                return isTarget;
            }

            if (terrain.type === 'mountain') {
                return isTarget;
            }
        }

        return true;
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

    private getLineBetween(startCol: number, startRow: number, endCol: number, endRow: number): GridPosition[] {
        const points: GridPosition[] = [];
        let currentCol = startCol;
        let currentRow = startRow;
        const deltaCol = Math.abs(endCol - startCol);
        const deltaRow = Math.abs(endRow - startRow);
        const stepCol = startCol < endCol ? 1 : -1;
        const stepRow = startRow < endRow ? 1 : -1;
        let error = deltaCol - deltaRow;

        while (true) {
            points.push({ col: currentCol, row: currentRow });
            if (currentCol === endCol && currentRow === endRow) {
                break;
            }

            const doubleError = error * 2;
            if (doubleError > -deltaRow) {
                error -= deltaRow;
                currentCol += stepCol;
            }
            if (doubleError < deltaCol) {
                error += deltaCol;
                currentRow += stepRow;
            }
        }

        return points;
    }

    public movePlayer(direction: Direction): { moved: boolean; isPreviouslyDiscovered: boolean } {
        const { col, row } = this.playerGridPos;
        const directionOffsets: Record<Direction, GridPosition> = {
            up: { col: 0, row: -1 },
            down: { col: 0, row: 1 },
            left: { col: -1, row: 0 },
            right: { col: 1, row: 0 },
            upLeft: { col: -1, row: -1 },
            upRight: { col: 1, row: -1 },
            downLeft: { col: -1, row: 1 },
            downRight: { col: 1, row: 1 },
        };
        const offset = directionOffsets[direction];
        const newCol = col + offset.col;
        const newRow = row + offset.row;

        if (this.grid.isValidPosition(newCol, newRow)) {
            const destinationTerrain = this.getTerrain(newCol, newRow);
            if (destinationTerrain?.type === 'water') {
                return { moved: false, isPreviouslyDiscovered: false };
            }

            const destinationKey = this.getCellKey(newCol, newRow);
            const isPreviouslyDiscovered = this.visitedCells.has(destinationKey);
            this.playerGridPos = { col: newCol, row: newRow };
            this.visitedCells.add(destinationKey);
            this.refreshVisibility();
            this.ensureCellIsVisible(newCol, newRow);
            return { moved: true, isPreviouslyDiscovered };
        }
        return { moved: false, isPreviouslyDiscovered: false };
    }

    public resizeToCanvas(canvasWidth: number, canvasHeight: number): void {
        this.canvasWidth = Math.max(1, Math.floor(canvasWidth));
        this.canvasHeight = Math.max(1, Math.floor(canvasHeight));

        const configuredCellSize = theme.worldMap.cellSize.default;
        const nextCellSize = this.grid.cellSize > 0 ? this.grid.cellSize : configuredCellSize;
        this.grid.updateLayout(nextCellSize, this.grid.offsetX, this.grid.offsetY);
        this.clampViewport();
    }

    public centerOnPlayer(): void {
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    public zoomIn(): boolean {
        return this.zoomBy(theme.worldMap.cellSize.zoomStep);
    }

    public zoomOut(): boolean {
        return this.zoomBy(-theme.worldMap.cellSize.zoomStep);
    }

    private zoomBy(delta: number): boolean {
        const minCellSize = theme.worldMap.cellSize.min;
        const maxCellSize = theme.worldMap.cellSize.max;
        const nextCellSize = Math.max(minCellSize, Math.min(maxCellSize, this.grid.cellSize + delta));
        if (nextCellSize === this.grid.cellSize) {
            return false;
        }

        const centerCol = (this.canvasWidth / 2 - this.grid.offsetX) / this.grid.cellSize;
        const centerRow = (this.canvasHeight / 2 - this.grid.offsetY) / this.grid.cellSize;
        const nextOffsetX = Math.round((this.canvasWidth / 2) - (centerCol * nextCellSize));
        const nextOffsetY = Math.round((this.canvasHeight / 2) - (centerRow * nextCellSize));
        this.grid.updateLayout(nextCellSize, nextOffsetX, nextOffsetY);
        this.clampViewport();
        return true;
    }

    public pan(direction: 'up' | 'down' | 'left' | 'right'): boolean {
        const stepCells = Math.max(1, theme.worldMap.cellSize.panStepCells);
        const step = stepCells * this.grid.cellSize;
        const offsets = { up: { x: 0, y: step }, down: { x: 0, y: -step }, left: { x: step, y: 0 }, right: { x: -step, y: 0 } }[direction];
        const beforeX = this.grid.offsetX;
        const beforeY = this.grid.offsetY;
        this.grid.updateLayout(this.grid.cellSize, beforeX + offsets.x, beforeY + offsets.y);
        this.clampViewport();
        return beforeX !== this.grid.offsetX || beforeY !== this.grid.offsetY;
    }

    public panByPixels(deltaX: number, deltaY: number): boolean {
        if (deltaX === 0 && deltaY === 0) {
            return false;
        }

        const beforeX = this.grid.offsetX;
        const beforeY = this.grid.offsetY;
        this.grid.updateLayout(this.grid.cellSize, beforeX + deltaX, beforeY + deltaY);
        this.clampViewport();
        return beforeX !== this.grid.offsetX || beforeY !== this.grid.offsetY;
    }

    private centerViewportOnCell(col: number, row: number): void {
        const offsetX = Math.round((this.canvasWidth / 2) - ((col + 0.5) * this.grid.cellSize) + theme.worldMap.gridOffset.x);
        const offsetY = Math.round((this.canvasHeight / 2) - ((row + 0.5) * this.grid.cellSize) + theme.worldMap.gridOffset.y);
        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
        this.clampViewport();
    }

    private ensureCellIsVisible(col: number, row: number): void {
        const left = this.grid.offsetX + (col * this.grid.cellSize);
        const right = left + this.grid.cellSize;
        const top = this.grid.offsetY + (row * this.grid.cellSize);
        const bottom = top + this.grid.cellSize;
        let offsetX = this.grid.offsetX;
        let offsetY = this.grid.offsetY;

        if (left < 0) {
            offsetX += -left + theme.worldMap.gridOffset.x;
        } else if (right > this.canvasWidth) {
            offsetX -= right - this.canvasWidth;
        }

        if (top < 0) {
            offsetY += -top + theme.worldMap.gridOffset.y;
        } else if (bottom > this.canvasHeight) {
            offsetY -= bottom - this.canvasHeight;
        }

        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
        this.clampViewport();
    }

    private clampViewport(): void {
        const mapWidth = this.grid.columns * this.grid.cellSize;
        const mapHeight = this.grid.rows * this.grid.cellSize;
        const maxOffsetX = theme.worldMap.gridOffset.x;
        const maxOffsetY = theme.worldMap.gridOffset.y;
        const minOffsetX = this.canvasWidth - mapWidth + theme.worldMap.gridOffset.x;
        const minOffsetY = this.canvasHeight - mapHeight + theme.worldMap.gridOffset.y;

        let offsetX = this.grid.offsetX;
        let offsetY = this.grid.offsetY;

        if (mapWidth <= this.canvasWidth) {
            offsetX = Math.round((this.canvasWidth - mapWidth) / 2) + theme.worldMap.gridOffset.x;
        } else {
            offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
        }

        if (mapHeight <= this.canvasHeight) {
            offsetY = Math.round((this.canvasHeight - mapHeight) / 2) + theme.worldMap.gridOffset.y;
        } else {
            offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
        }

        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
    }

    private getVisibleBounds(): { startCol: number; endCol: number; startRow: number; endRow: number } {
        const startCol = Math.max(0, Math.floor((-this.grid.offsetX) / this.grid.cellSize) - 1);
        const endCol = Math.min(this.grid.columns - 1, Math.ceil((this.canvasWidth - this.grid.offsetX) / this.grid.cellSize) + 1);
        const startRow = Math.max(0, Math.floor((-this.grid.offsetY) / this.grid.cellSize) - 1);
        const endRow = Math.min(this.grid.rows - 1, Math.ceil((this.canvasHeight - this.grid.offsetY) / this.grid.cellSize) + 1);
        return { startCol, endCol, startRow, endRow };
    }

    public getPlayerPixelPosition(): [number, number] {
        return this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    }


    public isRoadAt(col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }
        return this.roadIndexSet.has(this.getCellIndex(col, row));
    }

    public isPlayerOnRoad(): boolean {
        return this.isRoadAt(this.playerGridPos.col, this.playerGridPos.row);
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

    public getVillageNameAtPlayerPosition(): string {
        return this.getVillageName(this.playerGridPos.col, this.playerGridPos.row);
    }

    public getKnownVillages(): KnownVillage[] {
        return Array.from(this.villages.values())
            .map((key) => {
                const [colText, rowText] = key.split(',');
                const col = Number(colText);
                const row = Number(rowText);
                if (this.getFogState(col, row) === FOG_STATE.UNKNOWN) {
                    return null;
                }
                const terrain = this.getTerrain(col, row)?.type ?? 'grass';
                const isCurrent = col === this.playerGridPos.col && row === this.playerGridPos.row;
                return { name: this.getVillageName(col, row), col, row, terrain, status: isCurrent ? 'current' : 'mapped' };
            })
            .filter((entry): entry is KnownVillage => entry !== null)
            .sort((left, right) => left.name.localeCompare(right.name));
    }


    public getVillageDirectionHintFromPlayer(rawSettlementName: string): WorldVillageDirectionHint {
        const settlementName = rawSettlementName.trim();
        const position = this.findVillagePositionByNameInsensitive(settlementName);
        if (!position) {
            return { settlementName, exists: false };
        }

        const dx = position.col - this.playerGridPos.col;
        const dy = position.row - this.playerGridPos.row;
        return {
            settlementName,
            exists: true,
            direction: this.resolveDirection(dx, dy),
            distanceCells: Math.round(Math.sqrt((dx * dx) + (dy * dy))),
        };
    }

    public getAllVillageNames(): string[] {
        return Array.from(this.villages.values())
            .map((key) => {
                const [colText, rowText] = key.split(',');
                return this.getVillageName(Number(colText), Number(rowText));
            })
            .sort((left, right) => left.localeCompare(right));
    }

    private getVillageName(col: number, row: number): string {
        const seed = this.hashSeed((col + 11) * 92837111, (row + 17) * 689287499, 14057);
        return generateVillageName(seed);
    }

    public isPlayerOnVillage(): boolean {
        return this.villageIndexSet.has(this.getCellIndex(this.playerGridPos.col, this.playerGridPos.row));
    }

    public markVillageAtPlayerPosition(): void {
        const key = this.getCellKey(this.playerGridPos.col, this.playerGridPos.row);
        this.villages.add(key);
        this.villageIndexSet.add(this.getCellIndex(this.playerGridPos.col, this.playerGridPos.row));
    }

    public isPlayerOnEdge(): boolean {
        const { columns, rows } = this.grid.getDimensions();
        const { col, row } = this.playerGridPos;
        return col === 0 || row === 0 || col === columns - 1 || row === rows - 1;
    }

    private getRenderDetailLevel(bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): 'full' | 'medium' | 'low' {
        const visibleColumns = Math.max(0, bounds.endCol - bounds.startCol + 1);
        const visibleRows = Math.max(0, bounds.endRow - bounds.startRow + 1);
        const visibleCellCount = visibleColumns * visibleRows;

        if (this.grid.cellSize <= 10 || (!this.mapDisplayConfig.fogOfWar && visibleCellCount >= 2500)) {
            return 'low';
        }

        if (this.grid.cellSize <= 14 || visibleCellCount >= 1400) {
            return 'medium';
        }

        return 'full';
    }

    public draw(ctx: CanvasRenderingContext2D, _renderer: any): void {
        this.renderer.drawBackground(ctx, this.canvasWidth, this.canvasHeight);
        const bounds = this.getVisibleBounds();
        const detailLevel = this.getRenderDetailLevel(bounds);
        // Keep terrain seamless and avoid decorative tabletop-like cell borders.
        const drawGrid = false;
        const shouldUseTerrainCache = detailLevel === 'low' || detailLevel === 'medium';

        const terrainRenderedFromCache = shouldUseTerrainCache
            && this.drawTerrainLayerFromCache(ctx, bounds, detailLevel);

        if (!terrainRenderedFromCache) {
            for (let row = bounds.startRow; row <= bounds.endRow; row += 1) {
                for (let col = bounds.startCol; col <= bounds.endCol; col += 1) {
                    const cell = this.grid.cells[this.getCellIndex(col, row)];
                    const terrain = this.getTerrain(col, row);
                    if (!cell) {
                        continue;
                    }

                    this.renderer.drawCell(
                        ctx,
                        cell,
                        this.getFogState(col, row),
                        terrain,
                        detailLevel === 'full' && terrain ? this.getTerrainNeighbors(col, row, terrain.type) : undefined,
                        {
                            showFogOverlay: this.mapDisplayConfig.fogOfWar,
                            detailLevel,
                        },
                    );
                }
            }
        }
        if (terrainRenderedFromCache) {
            this.drawFogOverlayForVisibleCells(ctx, bounds, detailLevel);
        }

        if (drawGrid) {
            this.renderer.drawGrid(ctx, this.grid, this.canvasWidth, this.canvasHeight);
        }
        this.drawVillageRoads(ctx, bounds);
        this.drawVillages(ctx, bounds);
        this.drawNamedLocations(ctx, bounds);
        this.drawNamedLocationFocus(ctx);
        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            this.renderer.drawPlayerMarker(ctx, playerCell);
        }
        const selectedCell = this.selectedGridPos ? this.grid.getCellAt(this.selectedGridPos.col, this.selectedGridPos.row) : null;
        if (selectedCell) {
            this.renderer.drawCursorMarker(ctx, selectedCell, this.isCellVisible(selectedCell.col, selectedCell.row));
        }
        this.renderer.drawScaleLegend(ctx, this.grid, `${theme.worldMap.cellTravelMinutes} min walk / cell`, this.canvasWidth, this.canvasHeight);
    }

    public registerNamedLocation(name: string): void {
        if (this.namedLocations.has(name)) {
            return;
        }

        const villagePosition = this.findVillagePositionByName(name);
        const position = villagePosition ?? this.findNamedLocationPosition();
        if (position) {
            const terrain = this.getTerrain(position.col, position.row);
            this.namedLocations.set(name, { name, position, terrainType: terrain?.type ?? 'grass' });
        }
    }

    public revealNamedLocation(name: string): boolean {
        const location = this.namedLocations.get(name);
        if (!location || !this.isDiscovered(location.position.col, location.position.row)) {
            return false;
        }

        this.focusedLocationName = name;
        this.centerViewportOnCell(location.position.col, location.position.row);
        return true;
    }

    public clearFocusedLocation(): void {
        this.focusedLocationName = null;
    }

    public getCurrentNamedLocation(): string | null {
        const currentKey = this.getCellKey(this.playerGridPos.col, this.playerGridPos.row);
        for (const location of this.namedLocations.values()) {
            if (this.getCellKey(location.position.col, location.position.row) === currentKey) {
                return location.name;
            }
        }

        return null;
    }

    private drawVillages(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        this.villages.forEach((key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (col < bounds.startCol || col > bounds.endCol || row < bounds.startRow || row > bounds.endRow) {
                return;
            }

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

    private drawVillageRoads(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        this.villageRoadLinks.forEach((link) => {
            if (!this.isRoadLinkWithinBounds(link, bounds)) {
                return;
            }
            const visibleSegments = this.buildVisibleRoadSegments(link);
            visibleSegments.forEach((segment) => {
                this.renderer.drawVillageRoadPath(ctx, segment.points, segment.alpha);
            });
        });
    }

    private buildVillageRoadLinks(villages: GridPosition[]): Array<{ from: GridPosition; to: GridPosition }> {
        const links = new Map<string, { from: GridPosition; to: GridPosition }>();
        villages.forEach((village, index) => {
            const neighbors = villages
                .map((candidate, candidateIndex) => ({
                    candidate,
                    candidateIndex,
                    distance: Math.hypot(candidate.col - village.col, candidate.row - village.row),
                }))
                .filter((item) => item.candidateIndex !== index)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 2);

            neighbors.forEach(({ candidate }) => {
                const first = this.getCellIndex(village.col, village.row);
                const second = this.getCellIndex(candidate.col, candidate.row);
                const key = first < second ? `${first}-${second}` : `${second}-${first}`;
                if (!links.has(key)) {
                    links.set(key, { from: village, to: candidate });
                }
            });
        });
        return Array.from(links.values());
    }

    private buildVillageRoadControls(from: GridPosition, to: GridPosition): { control1: VillageRoadPoint; control2: VillageRoadPoint } {
        const fromCenter = this.getGridCenterPoint(from.col, from.row);
        const toCenter = this.getGridCenterPoint(to.col, to.row);
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const distance = Math.hypot(dx, dy);
        const unitX = distance === 0 ? 0 : dx / distance;
        const unitY = distance === 0 ? 0 : dy / distance;
        const normalX = -unitY;
        const normalY = unitX;

        const pairSeed = this.hashSeed((from.col + 1) * 911, (from.row + 1) * 353, (to.col + 1) * 719, (to.row + 1) * 197);
        const curveDirection = this.seededRandom(pairSeed) > 0.5 ? 1 : -1;
        const bendStrength = Math.max(0.55, Math.min(distance * 0.26, 1.8));
        const bendNoise = 0.8 + (this.seededRandom(pairSeed * 1.37) * 0.5);
        const bend = bendStrength * bendNoise * curveDirection;

        const control1 = { x: fromCenter.x + (dx * 0.33) + (normalX * bend), y: fromCenter.y + (dy * 0.33) + (normalY * bend) };
        const control2 = { x: fromCenter.x + (dx * 0.66) + (normalX * bend * 0.85), y: fromCenter.y + (dy * 0.66) + (normalY * bend * 0.85) };

        return { control1, control2 };
    }

    private generateVillageRoadNetwork(): void {
        const villages = Array.from(this.villages.values())
            .map((key) => {
                const [colText, rowText] = key.split(',');
                const col = Number(colText);
                const row = Number(rowText);
                return this.grid.isValidPosition(col, row) ? { col, row } : null;
            })
            .filter((value): value is GridPosition => value !== null);

        this.roadIndexSet.clear();
        if (villages.length < 2) {
            this.villageRoadLinks = [];
            return;
        }

        const links = this.buildVillageRoadLinks(villages);
        this.villageRoadLinks = links.map(({ from, to }) => {
            const controls = this.buildVillageRoadControls(from, to);
            const link: VillageRoadLink = { from, to, control1: controls.control1, control2: controls.control2 };
            this.markRoadCellsForLink(link);
            return link;
        });
    }

    private markRoadCellsForLink(link: VillageRoadLink): void {
        const samples = Math.max(28, Math.ceil(this.getRoadLinkDistance(link) * 8));
        let previous = this.sampleRoadLinkPoint(link, 0);
        this.markRoadCell(previous.x, previous.y);
        for (let index = 1; index <= samples; index += 1) {
            const point = this.sampleRoadLinkPoint(link, index / samples);
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(point.x - previous.x), Math.abs(point.y - previous.y)) * 6));
            for (let step = 1; step <= steps; step += 1) {
                const t = step / steps;
                this.markRoadCell(previous.x + ((point.x - previous.x) * t), previous.y + ((point.y - previous.y) * t));
            }
            previous = point;
        }
    }

    private markRoadCell(gridX: number, gridY: number): void {
        const col = Math.floor(gridX);
        const row = Math.floor(gridY);
        if (!this.grid.isValidPosition(col, row)) {
            return;
        }
        this.roadIndexSet.add(this.getCellIndex(col, row));
    }

    private sampleRoadLinkPoint(link: VillageRoadLink, t: number): VillageRoadPoint {
        const from = this.getGridCenterPoint(link.from.col, link.from.row);
        const to = this.getGridCenterPoint(link.to.col, link.to.row);
        const midpoint = { x: (from.x + to.x) * 0.5, y: (from.y + to.y) * 0.5 };

        if (t <= 0.5) {
            return this.quadraticPoint(from, link.control1, midpoint, t * 2);
        }
        return this.quadraticPoint(midpoint, link.control2, to, (t - 0.5) * 2);
    }

    private quadraticPoint(start: VillageRoadPoint, control: VillageRoadPoint, end: VillageRoadPoint, t: number): VillageRoadPoint {
        const oneMinusT = 1 - t;
        return {
            x: (oneMinusT * oneMinusT * start.x) + (2 * oneMinusT * t * control.x) + (t * t * end.x),
            y: (oneMinusT * oneMinusT * start.y) + (2 * oneMinusT * t * control.y) + (t * t * end.y),
        };
    }

    private buildVisibleRoadSegments(link: VillageRoadLink): Array<{ points: VillageRoadPoint[]; alpha: number }> {
        const segments: Array<{ points: VillageRoadPoint[]; alpha: number }> = [];
        const samples = Math.max(26, Math.ceil(this.getRoadLinkDistance(link) * 7));
        let active: VillageRoadPoint[] = [];

        for (let index = 0; index <= samples; index += 1) {
            const gridPoint = this.sampleRoadLinkPoint(link, index / samples);
            const col = Math.floor(gridPoint.x);
            const row = Math.floor(gridPoint.y);
            const hasRoad = this.grid.isValidPosition(col, row) && this.roadIndexSet.has(this.getCellIndex(col, row));
            const fogState = hasRoad ? this.getFogState(col, row) : FOG_STATE.UNKNOWN;
            if (fogState === FOG_STATE.UNKNOWN) {
                if (active.length >= 2) {
                    segments.push({ points: active, alpha: 0.9 });
                }
                active = [];
                continue;
            }

            const pixel = this.gridPointToCanvas(gridPoint);
            active.push(pixel);
        }

        if (active.length >= 2) {
            segments.push({ points: active, alpha: 0.9 });
        }
        return segments;
    }

    private gridPointToCanvas(point: VillageRoadPoint): VillageRoadPoint {
        return { x: this.grid.offsetX + (point.x * this.grid.cellSize), y: this.grid.offsetY + (point.y * this.grid.cellSize) };
    }

    private isRoadLinkWithinBounds(link: VillageRoadLink, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): boolean {
        const minCol = Math.min(link.from.col, link.to.col, Math.floor(link.control1.x), Math.floor(link.control2.x));
        const maxCol = Math.max(link.from.col, link.to.col, Math.floor(link.control1.x), Math.floor(link.control2.x));
        const minRow = Math.min(link.from.row, link.to.row, Math.floor(link.control1.y), Math.floor(link.control2.y));
        const maxRow = Math.max(link.from.row, link.to.row, Math.floor(link.control1.y), Math.floor(link.control2.y));
        return !(maxCol < bounds.startCol || minCol > bounds.endCol || maxRow < bounds.startRow || minRow > bounds.endRow);
    }

    private getGridCenterPoint(col: number, row: number): VillageRoadPoint {
        return { x: col + 0.5, y: row + 0.5 };
    }

    private getRoadLinkDistance(link: VillageRoadLink): number {
        return Math.hypot(link.to.col - link.from.col, link.to.row - link.from.row);
    }

    private drawNamedLocations(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        this.namedLocations.forEach((location) => {
            const { col, row } = location.position;
            if (col < bounds.startCol || col > bounds.endCol || row < bounds.startRow || row > bounds.endRow) {
                return;
            }

            const fogState = this.getFogState(col, row);
            if (fogState === FOG_STATE.UNKNOWN) {
                return;
            }

            const cell = this.grid.getCellAt(col, row);
            if (!cell) {
                return;
            }

            const isFocused = location.name === this.focusedLocationName;
            const isCurrent = this.playerGridPos.col === col && this.playerGridPos.row === row;
            this.renderer.drawNamedLocation(ctx, cell, location.name, location.terrainType, {
                emphasized: isFocused || isCurrent || fogState === FOG_STATE.DISCOVERED,
                showLabel: isFocused || isCurrent,
            });
        });
    }

    public getState(): Record<string, unknown> {
        return {
            worldSeed: this.worldSeed,
            playerGridPos: { ...this.playerGridPos },
            fogStates: Array.from(this.fogStates.entries()),
            villages: Array.from(this.villages.values()),
            visitedCells: Array.from(this.visitedCells.values()),
            viewport: { cellSize: this.grid.cellSize, offsetX: this.grid.offsetX, offsetY: this.grid.offsetY },
        };
    }

    public restoreState(state: Record<string, unknown>): void {
        if (typeof state.worldSeed === 'number' && Number.isFinite(state.worldSeed)) {
            const nextWorldSeed = Math.floor(Math.abs(state.worldSeed));
            if (nextWorldSeed !== this.worldSeed) {
                this.worldSeed = nextWorldSeed;
                this.generateWorld();
            }
        }

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
            this.fogStatesByIndex = new Array(this.grid.columns * this.grid.rows).fill(FOG_STATE.UNKNOWN);
            this.fogStates.forEach((value, key) => {
                const [colText, rowText] = key.split(',');
                const col = Number(colText);
                const row = Number(rowText);
                if (this.grid.isValidPosition(col, row)) {
                    this.fogStatesByIndex[this.getCellIndex(col, row)] = value;
                }
            });
        }

        if (Array.isArray(state.villages)) {
            this.villages = new Set(state.villages.filter((entry): entry is string => typeof entry === 'string'));
            this.villageIndexSet = new Set<number>();
            this.villages.forEach((key) => {
                const [colText, rowText] = key.split(',');
                const col = Number(colText);
                const row = Number(rowText);
                if (this.grid.isValidPosition(col, row)) {
                    this.villageIndexSet.add(this.getCellIndex(col, row));
                }
            });
        }
        this.generateVillageRoadNetwork();

        if (Array.isArray(state.visitedCells)) {
            this.visitedCells = new Set(state.visitedCells.filter((entry): entry is string => typeof entry === 'string'));
        } else {
            this.visitedCells = new Set([this.getCellKey(this.playerGridPos.col, this.playerGridPos.row)]);
        }

        const viewport = state.viewport as { cellSize?: unknown; offsetX?: unknown; offsetY?: unknown } | undefined;
        if (viewport && typeof viewport.cellSize === 'number' && typeof viewport.offsetX === 'number' && typeof viewport.offsetY === 'number') {
            const clampedCellSize = Math.max(theme.worldMap.cellSize.min, Math.min(theme.worldMap.cellSize.max, viewport.cellSize));
            this.grid.updateLayout(clampedCellSize, viewport.offsetX, viewport.offsetY);
            this.clampViewport();
        } else {
            this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
        }

        this.refreshVisibility();
    }

    public getMapDisplayConfig(): MapDisplayConfig {
        return { ...this.mapDisplayConfig };
    }

    public setMapDisplayConfig(config: Partial<MapDisplayConfig>): void {
        this.mapDisplayConfig = {
            everythingDiscovered: typeof config.everythingDiscovered === 'boolean'
                ? config.everythingDiscovered
                : this.mapDisplayConfig.everythingDiscovered,
            fogOfWar: typeof config.fogOfWar === 'boolean'
                ? config.fogOfWar
                : this.mapDisplayConfig.fogOfWar,
        };
    }

    public updateSelectedCellFromPixel(pixelX: number, pixelY: number): boolean {
        const [col, row] = this.grid.pixelToGrid(pixelX, pixelY);
        if (!this.grid.isValidPosition(col, row)) {
            this.selectedGridPos = null;
            return false;
        }

        this.selectedGridPos = { col, row };
        return true;
    }

    public clearSelectedCell(): void {
        this.selectedGridPos = null;
    }

    public getSelectedCellInfo(): SelectedWorldCellInfo | null {
        if (!this.selectedGridPos) {
            return null;
        }

        const terrain = this.getTerrain(this.selectedGridPos.col, this.selectedGridPos.row);
        if (!terrain) {
            return null;
        }

        const isVillage = this.villageIndexSet.has(this.getCellIndex(this.selectedGridPos.col, this.selectedGridPos.row));
        const isCurrentVillage = isVillage
            && this.selectedGridPos.col === this.playerGridPos.col
            && this.selectedGridPos.row === this.playerGridPos.row;

        return {
            mode: 'world',
            col: this.selectedGridPos.col,
            row: this.selectedGridPos.row,
            terrainType: terrain.type,
            fogState: this.getFogState(this.selectedGridPos.col, this.selectedGridPos.row),
            isVisible: this.isCellVisible(this.selectedGridPos.col, this.selectedGridPos.row),
            isVillage,
            villageName: isVillage ? this.getVillageName(this.selectedGridPos.col, this.selectedGridPos.row) : null,
            villageStatus: isVillage ? (isCurrentVillage ? 'current' : 'mapped') : null,
            isTraversable: terrain.type !== 'water',
        };
    }


    private findVillagePositionByNameInsensitive(name: string): GridPosition | null {
        const normalized = name.trim().toLowerCase();
        for (const key of this.villages.values()) {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.getVillageName(col, row).toLowerCase() === normalized) {
                return { col, row };
            }
        }

        return null;
    }

    private resolveDirection(dx: number, dy: number): 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west' {
        const angle = Math.atan2(dy, dx);
        const slice = Math.round(angle / (Math.PI / 4));
        const dirs: Array<'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west' | 'north' | 'north-east'> = [
            'east',
            'south-east',
            'south',
            'south-west',
            'west',
            'north-west',
            'north',
            'north-east',
        ];
        return dirs[(slice + 8) % 8];
    }

    private findVillagePositionByName(name: string): GridPosition | null {
        for (const key of this.villages.values()) {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.getVillageName(col, row) === name) {
                return { col, row };
            }
        }

        return null;
    }

    private findNamedLocationPosition(): GridPosition | null {
        const dims = this.grid.getDimensions();
        const attempts = dims.columns * dims.rows * 2;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const col = this.seededInt(dims.columns, this.seededValue('named-location-col', attempt));
            const row = this.seededInt(dims.rows, this.seededValue('named-location-row', attempt));
            const terrain = this.getTerrain(col, row);
            const key = this.getCellKey(col, row);

            if (!terrain || terrain.type === 'water' || terrain.type === 'mountain' || this.namedLocationsHasCell(key)) {
                continue;
            }

            return { col, row };
        }

        return null;
    }

    private namedLocationsHasCell(key: string): boolean {
        return Array.from(this.namedLocations.values()).some((location) => this.getCellKey(location.position.col, location.position.row) === key);
    }

    private isDiscovered(col: number, row: number): boolean {
        return this.getFogState(col, row) !== FOG_STATE.UNKNOWN;
    }

    private drawNamedLocationFocus(ctx: CanvasRenderingContext2D): void {
        if (!this.focusedLocationName) {
            return;
        }

        const location = this.namedLocations.get(this.focusedLocationName);
        if (!location) {
            return;
        }

        const cell = this.grid.getCellAt(location.position.col, location.position.row);
        if (!cell) {
            return;
        }

        this.renderer.drawNamedLocationFocus(ctx, cell, location.name);
    }

    private drawFogOverlayForVisibleCells(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'low' | 'medium',
    ): void {
        for (let row = bounds.startRow; row <= bounds.endRow; row += 1) {
            for (let col = bounds.startCol; col <= bounds.endCol; col += 1) {
                const fogState = this.getFogState(col, row);
                if (fogState === FOG_STATE.DISCOVERED) {
                    continue;
                }

                const cell = this.grid.cells[this.getCellIndex(col, row)];
                if (!cell) {
                    continue;
                }

                this.renderer.drawCell(
                    ctx,
                    cell,
                    fogState,
                    fogState === FOG_STATE.HIDDEN ? this.getTerrain(col, row) : undefined,
                    undefined,
                    { showFogOverlay: this.mapDisplayConfig.fogOfWar, detailLevel },
                );
            }
        }
    }

    private drawTerrainLayerFromCache(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'low' | 'medium',
    ): boolean {
        if (typeof document === 'undefined' || typeof (ctx as CanvasRenderingContext2D & { drawImage?: unknown }).drawImage !== 'function') {
            return false;
        }

        const cellSize = this.grid.cellSize;
        const cacheWidth = this.grid.columns * cellSize;
        const cacheHeight = this.grid.rows * cellSize;
        const existing = this.terrainLayerCaches[detailLevel];
        const shouldRebuild = !existing
            || existing.detailLevel !== detailLevel
            || existing.cellSize !== cellSize
            || existing.terrainRevision !== this.terrainRevision;

        if (shouldRebuild) {
            const cacheCanvas = document.createElement('canvas');
            cacheCanvas.width = Math.max(1, Math.floor(cacheWidth));
            cacheCanvas.height = Math.max(1, Math.floor(cacheHeight));
            const cacheCtx = cacheCanvas.getContext('2d');
            if (!cacheCtx) {
                return false;
            }

            for (let row = 0; row < this.grid.rows; row += 1) {
                for (let col = 0; col < this.grid.columns; col += 1) {
                    const terrain = this.getTerrain(col, row);
                    this.renderer.drawCell(
                        cacheCtx,
                        {
                            col,
                            row,
                            x: col * cellSize,
                            y: row * cellSize,
                            width: cellSize,
                            height: cellSize,
                            data: {},
                        },
                        FOG_STATE.DISCOVERED,
                        terrain,
                        undefined,
                        { showFogOverlay: false, detailLevel },
                    );
                }
            }

            this.terrainLayerCaches[detailLevel] = { canvas: cacheCanvas, cellSize, terrainRevision: this.terrainRevision, detailLevel };
        }

        const activeCache = this.terrainLayerCaches[detailLevel];
        if (!activeCache) {
            return false;
        }

        const sourceX = bounds.startCol * cellSize;
        const sourceY = bounds.startRow * cellSize;
        const sourceWidth = Math.max(1, (bounds.endCol - bounds.startCol + 1) * cellSize);
        const sourceHeight = Math.max(1, (bounds.endRow - bounds.startRow + 1) * cellSize);
        const destinationX = this.grid.offsetX + sourceX;
        const destinationY = this.grid.offsetY + sourceY;

        ctx.drawImage(
            activeCache.canvas,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            destinationX,
            destinationY,
            sourceWidth,
            sourceHeight,
        );
        return true;
    }
}
