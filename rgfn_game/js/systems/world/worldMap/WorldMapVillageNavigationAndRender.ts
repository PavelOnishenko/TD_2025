// @ts-nocheck
import WorldMapMovementAndViewport from './WorldMapMovementAndViewport.js';
import { theme } from '../../../config/ThemeConfig.js';
import { generateVillageName } from '../VillageNameGenerator.js';
import { FOG_STATE } from './WorldMapCore.js';
export default class WorldMapVillageNavigationAndRender extends WorldMapMovementAndViewport {
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

    public getPlayerPixelPosition = (): [number, number] => this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    public isRoadAt(col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {return false;}
        return this.roadIndexSet.has(this.getCellIndex(col, row));
    }

    public isPlayerOnRoad = (): boolean => this.isRoadAt(this.playerGridPos.col, this.playerGridPos.row);
    public isFerryDockAt(col: number, row: number): boolean {
        return this.hasLocationFeatureAt(col, row, 'ferry-dock');
    }
    public isPlayerOnFerryDock = (): boolean => this.isFerryDockAt(this.playerGridPos.col, this.playerGridPos.row);

    public getFerryRoutesAtPlayerPosition(): Array<{ from: GridPosition; to: GridPosition; waterCells: number }> {
        const from = { col: this.playerGridPos.col, row: this.playerGridPos.row };
        const routes = this.ferryDockRoutesByIndex.get(this.getCellIndex(from.col, from.row)) ?? [];
        return routes.map((route) => ({ from, to: route.to, waterCells: route.waterCells }));
    }

    public travelByFerryAtPlayerPosition(routeIndex: number): { traveled: boolean; from?: GridPosition; to?: GridPosition; waterCells?: number } {
        const routes = this.getFerryRoutesAtPlayerPosition();
        if (routes.length === 0) {return { traveled: false };}
        const route = routes[Math.max(0, Math.min(routeIndex, routes.length - 1))];
        if (!route) {return { traveled: false };}
        const destinationKey = this.getCellKey(route.to.col, route.to.row);
        this.playerGridPos = { col: route.to.col, row: route.to.row };
        this.visitedCells.add(destinationKey);
        this.refreshVisibility();
        this.ensureCellIsVisible(route.to.col, route.to.row);
        return { traveled: true, from: route.from, to: route.to, waterCells: route.waterCells };
    }

    public getSettlementNameAt(col: number, row: number): string {
        if (this.villageIndexSet.has(this.getCellIndex(col, row))) {
            return this.getVillageName(col, row);
        }
        const namedLocation = Array.from(this.namedLocations.values()).find((location) => location.position.col === col && location.position.row === row);
        if (namedLocation) {
            return namedLocation.name;
        }
        return `Dock (${col}, ${row})`;
    }

    public getCurrentTerrain = (): TerrainData => this.getTerrain(this.playerGridPos.col, this.playerGridPos.row) ?? { type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain', elevation: 0.5, moisture: 0.5, heat: 0.5, seed: 0 };

    public getVillageNameAtPlayerPosition = (): string => this.getVillageName(this.playerGridPos.col, this.playerGridPos.row);
    public getKnownVillages = (): KnownVillage[] => Array.from(this.villages.values())
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

    public getVillageDirectionHintFromPlayer(rawSettlementName: string): WorldVillageDirectionHint {
        const settlementName = rawSettlementName.trim();
        const position = this.findVillagePositionByNameInsensitive(settlementName);
        if (!position) {
            return { settlementName, exists: false };
        }

        const dx = position.col - this.playerGridPos.col;
        const dy = position.row - this.playerGridPos.row;
        return { settlementName, exists: true, direction: this.resolveDirection(dx, dy), distanceCells: Math.round(Math.sqrt((dx * dx) + (dy * dy))) };
    }

    public getAllVillageNames = (): string[] => Array.from(this.villages.values())
        .map((key) => {
            const [colText, rowText] = key.split(',');
            return this.getVillageName(Number(colText), Number(rowText));
        })
        .sort((left, right) => left.localeCompare(right));

    private getVillageName(col: number, row: number): string {
        const seed = this.hashSeed((col + 11) * 92837111, (row + 17) * 689287499, 14057);
        return generateVillageName(seed);
    }

    public isPlayerOnVillage = (): boolean => this.hasLocationFeatureAt(this.playerGridPos.col, this.playerGridPos.row, 'village');

    public markVillageAtPlayerPosition(): void {
        const key = this.getCellKey(this.playerGridPos.col, this.playerGridPos.row);
        this.villages.add(key);
        this.villageIndexSet.add(this.getCellIndex(this.playerGridPos.col, this.playerGridPos.row));
        this.addLocationFeatureAt(this.playerGridPos.col, this.playerGridPos.row, 'village');
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
        if (this.grid.cellSize <= 10 || (!this.mapDisplayConfig.fogOfWar && visibleCellCount >= 2500)) {return 'low';}
        if (this.grid.cellSize <= 14 || visibleCellCount >= 1400) {return 'medium';}
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
                        { showFogOverlay: this.mapDisplayConfig.fogOfWar, detailLevel },
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
        this.drawLocationFeatures(ctx, bounds);
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

}
