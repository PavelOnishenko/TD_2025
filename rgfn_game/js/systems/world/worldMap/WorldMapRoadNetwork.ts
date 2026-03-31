// @ts-nocheck
import WorldMapNamedLocationAndVillageOverlays from './layers/WorldMapNamedLocationAndVillageOverlays.js';
import { FOG_STATE } from './WorldMapCore.js';
type FerryRouteOption = {
    destinationVillage: string;
    destinationDock: GridPosition;
    waterPathLength: number;
    priceGold: number;
};
export default class WorldMapRoadNetwork extends WorldMapNamedLocationAndVillageOverlays {
    private buildVillageRoadLinks(villages: GridPosition[]): Array<{ from: GridPosition; to: GridPosition }> {
        const links = new Map<string, { from: GridPosition; to: GridPosition }>();
        villages.forEach((village, index) => {
            const neighbors = villages
                .map((candidate, candidateIndex) => ({ candidate, candidateIndex, distance: Math.hypot(candidate.col - village.col, candidate.row - village.row) }))
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

    private getAdjacentWaterCells(col: number, row: number): GridPosition[] {
        const cardinalOffsets = [{ col: 0, row: -1 }, { col: 0, row: 1 }, { col: -1, row: 0 }, { col: 1, row: 0 }];
        return cardinalOffsets
            .map((offset) => ({ col: col + offset.col, row: row + offset.row }))
            .filter((position) => this.grid.isValidPosition(position.col, position.row))
            .filter((position) => this.getTerrain(position.col, position.row)?.type === 'water');
    }

    private getVillageDockPositions(): GridPosition[] {
        return Array.from(this.villages.values())
            .map((key) => {
                const [colText, rowText] = key.split(',');
                return { col: Number(colText), row: Number(rowText) };
            })
            .filter((position) => this.getAdjacentWaterCells(position.col, position.row).length > 0);
    }

    private getWaterPathLengthBetweenDocks(sourceDock: GridPosition, destinationDock: GridPosition): number | null {
        const startWaterCells = this.getAdjacentWaterCells(sourceDock.col, sourceDock.row);
        const targetWaterCells = this.getAdjacentWaterCells(destinationDock.col, destinationDock.row);
        if (startWaterCells.length === 0 || targetWaterCells.length === 0) {
            return null;
        }

        const targetKeys = new Set(targetWaterCells.map((cell) => this.getCellKey(cell.col, cell.row)));
        const queue: Array<{ col: number; row: number; distance: number }> = startWaterCells.map((cell) => ({ ...cell, distance: 1 }));
        const visited = new Set(queue.map((cell) => this.getCellKey(cell.col, cell.row)));
        const cardinalOffsets = [{ col: 0, row: -1 }, { col: 0, row: 1 }, { col: -1, row: 0 }, { col: 1, row: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentKey = this.getCellKey(current.col, current.row);
            if (targetKeys.has(currentKey)) {
                return current.distance;
            }

            cardinalOffsets.forEach((offset) => {
                const nextCol = current.col + offset.col;
                const nextRow = current.row + offset.row;
                if (!this.grid.isValidPosition(nextCol, nextRow)) {
                    return;
                }
                if (this.getTerrain(nextCol, nextRow)?.type !== 'water') {
                    return;
                }
                const nextKey = this.getCellKey(nextCol, nextRow);
                if (visited.has(nextKey)) {
                    return;
                }
                visited.add(nextKey);
                queue.push({ col: nextCol, row: nextRow, distance: current.distance + 1 });
            });
        }

        return null;
    }

    private computeFerryPrice(pathLength: number): number {
        return Math.max(1, Math.round(pathLength * 0.75));
    }

    public isPlayerOnFerryDock(): boolean {
        const terrain = this.getTerrain(this.playerGridPos.col, this.playerGridPos.row);
        if (!terrain || terrain.type === 'water') {
            return false;
        }
        return this.getAdjacentWaterCells(this.playerGridPos.col, this.playerGridPos.row).length > 0;
    }

    public getFerryRoutesAtPlayerDock(): FerryRouteOption[] {
        if (!this.isPlayerOnFerryDock()) {
            return [];
        }

        const sourceDock = { col: this.playerGridPos.col, row: this.playerGridPos.row };
        const routes = this.getVillageDockPositions()
            .filter((dock) => dock.col !== sourceDock.col || dock.row !== sourceDock.row)
            .map((dock) => {
                const waterPathLength = this.getWaterPathLengthBetweenDocks(sourceDock, dock);
                if (!waterPathLength) {
                    return null;
                }
                return {
                    destinationVillage: this.getVillageName(dock.col, dock.row),
                    destinationDock: dock,
                    waterPathLength,
                    priceGold: this.computeFerryPrice(waterPathLength),
                };
            })
            .filter((route): route is FerryRouteOption => route !== null)
            .sort((left, right) => {
                if (left.priceGold === right.priceGold) {
                    return left.destinationVillage.localeCompare(right.destinationVillage);
                }
                return left.priceGold - right.priceGold;
            });

        return routes;
    }

    public travelByFerryToDock(destinationDock: GridPosition): boolean {
        const moved = this.movePlayerToCell(destinationDock.col, destinationDock.row);
        if (!moved) {
            return false;
        }

        const destinationKey = this.getCellKey(destinationDock.col, destinationDock.row);
        this.visitedCells.add(destinationKey);
        this.centerOnPlayer();
        return true;
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

    private gridPointToCanvas = (point: VillageRoadPoint): VillageRoadPoint => ({
        x: this.grid.offsetX + (point.x * this.grid.cellSize),
        y: this.grid.offsetY + (point.y * this.grid.cellSize),
    });

    private isRoadLinkWithinBounds(link: VillageRoadLink, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): boolean {
        const minCol = Math.min(link.from.col, link.to.col, Math.floor(link.control1.x), Math.floor(link.control2.x));
        const maxCol = Math.max(link.from.col, link.to.col, Math.floor(link.control1.x), Math.floor(link.control2.x));
        const minRow = Math.min(link.from.row, link.to.row, Math.floor(link.control1.y), Math.floor(link.control2.y));
        const maxRow = Math.max(link.from.row, link.to.row, Math.floor(link.control1.y), Math.floor(link.control2.y));
        return !(maxCol < bounds.startCol || minCol > bounds.endCol || maxRow < bounds.startRow || minRow > bounds.endRow);
    }

    private getGridCenterPoint = (col: number, row: number): VillageRoadPoint => ({ x: col + 0.5, y: row + 0.5 });

    private getRoadLinkDistance = (link: VillageRoadLink): number => Math.hypot(link.to.col - link.from.col, link.to.row - link.from.row);

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

}
