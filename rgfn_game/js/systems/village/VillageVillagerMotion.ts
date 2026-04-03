import type { VillageActivityType, VillageSpot, VillageVillager } from './VillagePopulation.js';

type PickDifferentSpot = (spotIndex: number) => number;
type BuildRoute = (fromSpot: number, targetSpot: number) => number[];
type PickActivity = () => VillageActivityType;

export default class VillageVillagerMotion {
    public updateVillager(
        villager: VillageVillager,
        spots: VillageSpot[],
        now: number,
        pickDifferentSpot: PickDifferentSpot,
        buildRoute: BuildRoute,
        pickActivity: PickActivity,
        onSpotVisited: (spotIndex: number, now: number) => void,
    ): void {
        if (now < villager.pauseUntil) {
            villager.isWalking = false;
            return;
        }

        if (villager.fromSpot === villager.toSpot && villager.routeCursor >= villager.routeSpotIndices.length) {
            if (this.shouldPauseAtSpot()) {
                villager.pauseUntil = now + 0.8 + Math.random() * 1.6;
                villager.isWalking = false;
                return;
            }

            this.startTravel(villager, now, pickDifferentSpot, buildRoute, onSpotVisited);
        }

        this.advanceTravel(villager, spots, now, pickActivity, onSpotVisited);
    }

    public alignVillagerToSpots(villager: VillageVillager, spots: VillageSpot[], now: number): VillageVillager {
        const safeFromSpot = this.clampSpotIndex(villager.fromSpot, spots.length);
        const safeToSpot = this.clampSpotIndex(villager.toSpot, spots.length);
        const from = spots[safeFromSpot];
        const to = spots[safeToSpot];
        if (!from || !to) {
            return {
                ...villager,
                x: 0,
                y: 0,
                fromSpot: 0,
                toSpot: 0,
                routeSpotIndices: Array.isArray(villager.routeSpotIndices) ? villager.routeSpotIndices : [],
                routeCursor: typeof villager.routeCursor === 'number' ? villager.routeCursor : 0,
            };
        }

        const aligned = {
            ...villager,
            fromSpot: safeFromSpot,
            toSpot: safeToSpot,
            routeSpotIndices: Array.isArray(villager.routeSpotIndices) ? villager.routeSpotIndices : [],
            routeCursor: typeof villager.routeCursor === 'number' ? villager.routeCursor : 0,
        };

        if (now < aligned.pauseUntil || aligned.fromSpot === aligned.toSpot) {
            return { ...aligned, x: from.x, y: from.y };
        }

        return this.alignAlongPath(aligned, from, to, now);
    }

    private shouldPauseAtSpot = (): boolean => Math.random() < 0.2;

    private startTravel(
        villager: VillageVillager,
        now: number,
        pickDifferentSpot: PickDifferentSpot,
        buildRoute: BuildRoute,
        onSpotVisited: (spotIndex: number, now: number) => void,
    ): void {
        const targetSpot = pickDifferentSpot(villager.fromSpot);
        const route = buildRoute(villager.fromSpot, targetSpot);
        villager.routeSpotIndices = route;
        villager.routeCursor = 0;
        villager.toSpot = route[0] ?? targetSpot;
        villager.travelStart = now;
        villager.travelDuration = 4.8 + Math.random() * 2.4;
        villager.isWalking = true;
        onSpotVisited(villager.fromSpot, now);
        onSpotVisited(villager.toSpot, now);
    }

    private advanceTravel(
        villager: VillageVillager,
        spots: VillageSpot[],
        now: number,
        pickActivity: PickActivity,
        onSpotVisited: (spotIndex: number, now: number) => void,
    ): void {
        const from = spots[villager.fromSpot];
        const to = spots[villager.toSpot];
        const travelProgress = (now - villager.travelStart) / villager.travelDuration;

        if (travelProgress >= 1) {
            this.finishTravel(villager, now, pickActivity, onSpotVisited);
            return;
        }

        villager.isWalking = true;
        const smoothProgress = this.smoothStep(travelProgress);
        villager.x = from.x + (to.x - from.x) * smoothProgress;
        villager.y = from.y + (to.y - from.y) * smoothProgress;
    }

    private finishTravel(villager: VillageVillager, now: number, pickActivity: PickActivity, onSpotVisited: (spotIndex: number, now: number) => void): void {
        villager.fromSpot = villager.toSpot;
        if (villager.routeCursor < villager.routeSpotIndices.length - 1) {
            villager.routeCursor += 1;
            villager.toSpot = villager.routeSpotIndices[villager.routeCursor];
            villager.travelStart = now;
            villager.travelDuration = 4.8 + Math.random() * 2.4;
            villager.isWalking = true;
            onSpotVisited(villager.fromSpot, now);
            onSpotVisited(villager.toSpot, now);
            return;
        }

        villager.toSpot = villager.fromSpot;
        villager.routeCursor = villager.routeSpotIndices.length;
        villager.travelStart = now;
        villager.travelDuration = 4.8 + Math.random() * 2.4;
        villager.pauseUntil = now + 1 + Math.random() * 2;
        villager.isWalking = false;
        villager.activity = pickActivity();
        onSpotVisited(villager.fromSpot, now);
    }

    private alignAlongPath(villager: VillageVillager, from: VillageSpot, to: VillageSpot, now: number): VillageVillager {
        const travelProgress = Math.max(0, Math.min(1, (now - villager.travelStart) / Math.max(0.01, villager.travelDuration)));
        const smoothProgress = this.smoothStep(travelProgress);
        return { ...villager, x: from.x + (to.x - from.x) * smoothProgress, y: from.y + (to.y - from.y) * smoothProgress };
    }

    private clampSpotIndex(spotIndex: number, spotsLength: number): number {
        if (spotsLength === 0) {
            return 0;
        }

        if (spotIndex < 0 || spotIndex >= spotsLength) {
            return 0;
        }

        return spotIndex;
    }

    private smoothStep = (value: number): number => value * value * (3 - 2 * value);
}
