// @ts-nocheck
import WorldMapRoadNetwork from './WorldMapRoadNetwork.js';
export default class WorldMapPersistenceAndSelection extends WorldMapRoadNetwork {
    public getState = (): Record<string, unknown> => ({
        worldSeed: this.worldSeed,
        playerGridPos: { ...this.playerGridPos },
        fogStates: Array.from(this.fogStates.entries()),
        villages: Array.from(this.villages.values()),
        visitedCells: Array.from(this.visitedCells.values()),
        viewport: { cellSize: this.grid.cellSize, offsetX: this.grid.offsetX, offsetY: this.grid.offsetY },
    });

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

    public getMapDisplayConfig = (): MapDisplayConfig => ({ ...this.mapDisplayConfig });

    public setMapDisplayConfig = (config: Partial<MapDisplayConfig>): void => {
        this.mapDisplayConfig = {
            everythingDiscovered: typeof config.everythingDiscovered === 'boolean'
                ? config.everythingDiscovered
                : this.mapDisplayConfig.everythingDiscovered,
            fogOfWar: typeof config.fogOfWar === 'boolean'
                ? config.fogOfWar
                : this.mapDisplayConfig.fogOfWar,
        };
    };

    public updateSelectedCellFromPixel(pixelX: number, pixelY: number): boolean {
        const [col, row] = this.grid.pixelToGrid(pixelX, pixelY);
        if (!this.grid.isValidPosition(col, row)) {
            this.selectedGridPos = null;
            return false;
        }

        this.selectedGridPos = { col, row };
        return true;
    }

    public clearSelectedCell = (): void => {
        this.selectedGridPos = null;
    };

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

}
