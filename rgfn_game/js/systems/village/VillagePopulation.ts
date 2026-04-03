import VillageVillagerFactory from './VillageVillagerFactory.js';
import VillageVillagerMotion from './VillageVillagerMotion.js';

export type VillageActivityType = 'chatting' | 'drinking' | 'farming' | 'building' | 'carryingWater' | 'carryingLogs';

export type VillageSpot = {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    houseIndex?: number;
};

export type VillageVillager = {
    x: number;
    y: number;
    fromSpot: number;
    toSpot: number;
    travelStart: number;
    travelDuration: number;
    pauseUntil: number;
    skinColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    hatColor: string;
    size: number;
    activity: VillageActivityType;
    propSwingOffset: number;
    armSwingOffset: number;
    isWalking: boolean;
    routeSpotIndices: number[];
    routeCursor: number;
};

type HouseFootprint = { x: number; y: number; width: number; depth: number };

export default class VillagePopulation {
    private static readonly HOUSE_COLLISION_PADDING = 0.2;
    private static readonly MAX_EDGE_LENGTH = 4.2;

    private spots: VillageSpot[] = [];
    private villagers: VillageVillager[] = [];
    private villageSnapshots: Map<string, VillageVillager[]> = new Map();
    private activeVillageId = '';
    private spotGraph: number[][] = [];
    private villagerFactory = new VillageVillagerFactory();
    private villagerMotion = new VillageVillagerMotion();

    public initialize(spots: VillageSpot[], houseFootprints: HouseFootprint[], now: number, villageId: string): void {
        this.spots = spots;
        this.spotGraph = this.buildSpotGraph(spots, houseFootprints);
        this.activeVillageId = villageId;
        const snapshot = this.villageSnapshots.get(villageId);
        if (snapshot) {
            this.villagers = snapshot.map((villager) => this.villagerMotion.alignVillagerToSpots(villager, this.spots, now));
            return;
        }

        const villagerCount = 4 + Math.floor(Math.random() * 3);
        this.villagers = Array.from({ length: villagerCount }, () => this.villagerFactory.createVillager(this.spots, now));
        this.persistActiveVillageSnapshot();
    }

    public update(now: number, onSpotVisited: (spotIndex: number, now: number) => void): void {
        this.villagers.forEach((villager) => {
            this.villagerMotion.updateVillager(
                villager,
                this.spots,
                now,
                (spotIndex: number) => this.villagerFactory.pickDifferentSpot(spotIndex, this.spots.length),
                (fromSpot: number, targetSpot: number) => this.findRoute(fromSpot, targetSpot),
                this.villagerFactory.pickActivity,
                onSpotVisited,
            );
        });

        this.villagers.sort((a, b) => a.y - b.y);
        this.persistActiveVillageSnapshot();
    }

    public getVillagers = (): VillageVillager[] => this.villagers;

    private persistActiveVillageSnapshot(): void {
        if (!this.activeVillageId) {
            return;
        }

        this.villageSnapshots.set(this.activeVillageId, this.villagers.map((villager) => ({ ...villager })));
    }

    private findRoute(fromSpot: number, targetSpot: number): number[] {
        if (fromSpot === targetSpot) {
            return [];
        }

        if (!this.spotGraph.length) {
            return [targetSpot];
        }

        const previous = this.findRoutePredecessors(fromSpot, targetSpot);
        if (!previous) {
            return [targetSpot];
        }

        return this.buildRouteFromPredecessors(previous, fromSpot, targetSpot);
    }

    private findRoutePredecessors(fromSpot: number, targetSpot: number): Map<number, number> | null {
        const queue: number[] = [fromSpot];
        const visited = new Set<number>([fromSpot]);
        const previous = new Map<number, number>();

        while (queue.length > 0) {
            const current = queue.shift();
            if (typeof current !== 'number') {
                continue;
            }

            if (current === targetSpot) {
                break;
            }

            this.spotGraph[current].forEach((nextSpot) => {
                if (visited.has(nextSpot)) {
                    return;
                }

                visited.add(nextSpot);
                previous.set(nextSpot, current);
                queue.push(nextSpot);
            });
        }

        if (!visited.has(targetSpot)) {
            return null;
        }

        return previous;
    }

    private buildRouteFromPredecessors(previous: Map<number, number>, fromSpot: number, targetSpot: number): number[] {
        const route: number[] = [];
        let current: number | undefined = targetSpot;
        while (typeof current === 'number' && current !== fromSpot) {
            route.push(current);
            current = previous.get(current);
        }

        route.reverse();
        return route;
    }

    private buildSpotGraph(spots: VillageSpot[], houseFootprints: HouseFootprint[]): number[][] {
        const graph: number[][] = Array.from({ length: spots.length }, () => []);
        for (let fromIndex = 0; fromIndex < spots.length; fromIndex += 1) {
            for (let toIndex = fromIndex + 1; toIndex < spots.length; toIndex += 1) {
                const from = spots[fromIndex];
                const to = spots[toIndex];
                const distance = Math.hypot(to.worldX - from.worldX, to.worldY - from.worldY);
                if (distance > VillagePopulation.MAX_EDGE_LENGTH) {
                    continue;
                }

                if (this.isSegmentBlocked(from, to, houseFootprints)) {
                    continue;
                }

                graph[fromIndex].push(toIndex);
                graph[toIndex].push(fromIndex);
            }
        }

        return graph;
    }

    private isSegmentBlocked(from: VillageSpot, to: VillageSpot, houseFootprints: HouseFootprint[]): boolean {
        return houseFootprints.some((house) => {
            const minX = house.x - VillagePopulation.HOUSE_COLLISION_PADDING;
            const maxX = house.x + house.width + VillagePopulation.HOUSE_COLLISION_PADDING;
            const minY = house.y - VillagePopulation.HOUSE_COLLISION_PADDING;
            const maxY = house.y + house.depth + VillagePopulation.HOUSE_COLLISION_PADDING;
            return this.segmentIntersectsRectangle(from.worldX, from.worldY, to.worldX, to.worldY, minX, minY, maxX, maxY);
        });
    }

    private segmentIntersectsRectangle(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    ): boolean {
        if (this.isPointInsideRectangle(x1, y1, minX, minY, maxX, maxY) || this.isPointInsideRectangle(x2, y2, minX, minY, maxX, maxY)) {
            return true;
        }

        return (
            this.segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY)
            || this.segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY)
            || this.segmentsIntersect(x1, y1, x2, y2, maxX, maxY, minX, maxY)
            || this.segmentsIntersect(x1, y1, x2, y2, minX, maxY, minX, minY)
        );
    }

    private segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
        const first = this.orientation(ax, ay, bx, by, cx, cy);
        const second = this.orientation(ax, ay, bx, by, dx, dy);
        const third = this.orientation(cx, cy, dx, dy, ax, ay);
        const fourth = this.orientation(cx, cy, dx, dy, bx, by);

        if (first !== second && third !== fourth) {
            return true;
        }

        if (first === 0 && this.isPointOnSegment(ax, ay, cx, cy, bx, by)) {
            return true;
        }

        if (second === 0 && this.isPointOnSegment(ax, ay, dx, dy, bx, by)) {
            return true;
        }

        if (third === 0 && this.isPointOnSegment(cx, cy, ax, ay, dx, dy)) {
            return true;
        }

        if (fourth === 0 && this.isPointOnSegment(cx, cy, bx, by, dx, dy)) {
            return true;
        }

        return false;
    }

    private orientation(px: number, py: number, qx: number, qy: number, rx: number, ry: number): number {
        const value = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        if (Math.abs(value) < 0.00001) {
            return 0;
        }

        return value > 0 ? 1 : -1;
    }

    private isPointOnSegment(px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean {
        return qx >= Math.min(px, rx) && qx <= Math.max(px, rx) && qy >= Math.min(py, ry) && qy <= Math.max(py, ry);
    }

    private isPointInsideRectangle(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
        return x > minX && x < maxX && y > minY && y < maxY;
    }
}
