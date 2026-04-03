// @ts-nocheck
import GridMap from '../../../utils/GridMap.js';
import { FogState, MapDisplayConfig, TerrainData, GridPosition, GridCell, TerrainType } from '../../types/game.js';
import WorldMapRenderer from './WorldMapRenderer.js';
import { LocationFeatureId } from './locationFeatures/LocationFeatureDefinition.js';

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

export const FOG_STATE = { UNKNOWN: 'unknown' as FogState, DISCOVERED: 'discovered' as FogState, HIDDEN: 'hidden' as FogState };

const DEFAULT_MAP_DISPLAY_CONFIG: MapDisplayConfig = { everythingDiscovered: false, fogOfWar: true };

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

type FerryDockRoute = {
    from: GridPosition;
    to: GridPosition;
    waterCells: number;
};

type TerrainLayerCache = {
    canvas: HTMLCanvasElement;
    cellSize: number;
    terrainRevision: number;
    detailLevel: 'low' | 'medium';
};

export default class WorldMapCore {
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
    private ferryDockIndexSet: Set<number>;
    private ferryDockRoutesByIndex: Map<number, FerryDockRoute[]>;
    private locationFeatureIndexMap: Map<number, Set<LocationFeatureId>>;
    private terrainLayerCaches: Partial<Record<'low' | 'medium', TerrainLayerCache>>;
    private fogRevision: number;
    private terrainRevision: number;
    protected daylightFactor: number;

    constructor(columns: number, rows: number, cellSize: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.initializeCoreState(columns, rows, cellSize);
    }

    private initializeCoreState(columns: number, rows: number, cellSize: number): void {
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
        this.ferryDockIndexSet = new Set<number>();
        this.ferryDockRoutesByIndex = new Map<number, FerryDockRoute[]>();
        this.locationFeatureIndexMap = new Map<number, Set<LocationFeatureId>>();
        this.terrainLayerCaches = {};
        this.fogRevision = 0;
        this.terrainRevision = 0;
        this.daylightFactor = 1;
    }

    public setDaylightFactor(factor: number): void {
        if (!Number.isFinite(factor)) {
            return;
        }
        this.daylightFactor = Math.max(0.35, Math.min(1.1, factor));
    }

    protected initializeWorldMap(): void {
        this.initializeFogOfWar();
        this.generateWorld();
        this.visitedCells.add(this.getCellKey(this.playerGridPos.col, this.playerGridPos.row));
        this.refreshVisibility();
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private readonly createWorldSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

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

    protected clearLocationFeaturesById(featureId: LocationFeatureId): void {
        this.locationFeatureIndexMap.forEach((features, index) => {
            if (!features.has(featureId)) {
                return;
            }
            features.delete(featureId);
            if (features.size === 0) {
                this.locationFeatureIndexMap.delete(index);
            } else {
                this.locationFeatureIndexMap.set(index, features);
            }
        });
    }

    protected clearAllLocationFeatures(): void {
        this.locationFeatureIndexMap.clear();
    }

    protected addLocationFeatureAt(col: number, row: number, featureId: LocationFeatureId): void {
        if (!this.grid.isValidPosition(col, row)) {
            return;
        }
        const index = this.getCellIndex(col, row);
        const features = this.locationFeatureIndexMap.get(index) ?? new Set<LocationFeatureId>();
        features.add(featureId);
        this.locationFeatureIndexMap.set(index, features);
    }

    protected hasLocationFeatureAt(col: number, row: number, featureId: LocationFeatureId): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }
        return this.locationFeatureIndexMap.get(this.getCellIndex(col, row))?.has(featureId) ?? false;
    }

    protected getLocationFeatureCells(featureId: LocationFeatureId): number[] {
        const indexes: number[] = [];
        this.locationFeatureIndexMap.forEach((features, index) => {
            if (features.has(featureId)) {
                indexes.push(index);
            }
        });
        return indexes;
    }

    protected getLocationFeatureIdsAt(col: number, row: number): LocationFeatureId[] {
        if (!this.grid.isValidPosition(col, row)) {
            return [];
        }
        return Array.from(this.locationFeatureIndexMap.get(this.getCellIndex(col, row)) ?? []);
    }

}
