// @ts-nocheck
import WorldMapVillageNavigationAndRender from '../WorldMapVillageNavigationAndRender.js';
import { FOG_STATE } from '../WorldMapCore.js';
export default class WorldMapNamedLocationAndVillageOverlays extends WorldMapVillageNavigationAndRender {
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

    public clearFocusedLocation = (): void => {
        this.focusedLocationName = null;
    };

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

    private drawFerryDocks(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        this.ferryDockIndexSet.forEach((index) => {
            const col = index % this.grid.columns;
            const row = Math.floor(index / this.grid.columns);
            if (col < bounds.startCol || col > bounds.endCol || row < bounds.startRow || row > bounds.endRow) {return;}
            if (this.getFogState(col, row) === FOG_STATE.UNKNOWN) {return;}
            const cell = this.grid.getCellAt(col, row);
            if (!cell) {return;}
            this.renderer.drawFerryDock(ctx, cell.x + (cell.width / 2), cell.y + (cell.height / 2), 0.9);
        });
    }

}
