import { theme } from '../../config/ThemeConfig.js';

export type VillageActivityType = 'chatting' | 'drinking' | 'farming' | 'building' | 'carryingWater' | 'carryingLogs';

export type VillageSpot = {
    x: number;
    y: number;
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
};

export default class VillagePopulation {
    private static readonly ACTIVITIES: VillageActivityType[] = ['chatting', 'drinking', 'farming', 'building', 'carryingWater', 'carryingLogs'];

    private spots: VillageSpot[] = [];
    private villagers: VillageVillager[] = [];

    public initialize(spots: VillageSpot[], now: number): void {
        this.spots = spots;
        const villagerCount = 4 + Math.floor(Math.random() * 3);
        this.villagers = Array.from({ length: villagerCount }, () => this.createVillager(now));
    }

    public update(now: number, onSpotVisited: (spotIndex: number, now: number) => void): void {
        this.villagers.forEach((villager) => {
            if (now < villager.pauseUntil) {
                villager.isWalking = false;
                return;
            }

            if (villager.fromSpot === villager.toSpot) {
                if (Math.random() < 0.62) {
                    villager.pauseUntil = now + 5 + Math.random() * 10;
                    villager.isWalking = false;
                    return;
                }

                villager.toSpot = this.pickDifferentSpot(villager.fromSpot);
                villager.travelStart = now;
                villager.travelDuration = 5 + Math.random() * 4;
                villager.isWalking = true;
                onSpotVisited(villager.fromSpot, now);
                onSpotVisited(villager.toSpot, now);
            }

            const from = this.spots[villager.fromSpot];
            const to = this.spots[villager.toSpot];
            const travelProgress = (now - villager.travelStart) / villager.travelDuration;

            if (travelProgress >= 1) {
                villager.fromSpot = villager.toSpot;
                villager.toSpot = villager.fromSpot;
                villager.travelStart = now;
                villager.travelDuration = 5 + Math.random() * 4;
                villager.pauseUntil = now + 6 + Math.random() * 14;
                villager.isWalking = false;
                villager.activity = this.pickActivity();
                onSpotVisited(villager.fromSpot, now);
                return;
            }

            villager.isWalking = true;
            const smoothProgress = travelProgress * travelProgress * (3 - 2 * travelProgress);
            villager.x = from.x + (to.x - from.x) * smoothProgress;
            villager.y = from.y + (to.y - from.y) * smoothProgress;
        });

        this.villagers.sort((a, b) => a.y - b.y);
    }

    public getVillagers(): VillageVillager[] {
        return this.villagers;
    }

    private createVillager(now: number): VillageVillager {
        const fromSpot = Math.floor(Math.random() * this.spots.length);
        const toSpot = this.pickDifferentSpot(fromSpot);
        const skinPalette = this.getSkinPalette();
        const hairPalette = this.getHairPalette();
        const shirtPalette = this.getShirtPalette();
        const pantsPalette = this.getPantsPalette();
        const hatPalette = this.getHatPalette();
        const startSpot = this.spots[fromSpot];

        return {
            x: startSpot.x,
            y: startSpot.y,
            fromSpot,
            toSpot,
            travelStart: now - Math.random() * 1.5,
            travelDuration: 4.8 + Math.random() * 3.6,
            pauseUntil: now + 4 + Math.random() * 8,
            skinColor: this.pickFrom(skinPalette),
            hairColor: this.pickFrom(hairPalette),
            shirtColor: this.pickFrom(shirtPalette),
            pantsColor: this.pickFrom(pantsPalette),
            hatColor: this.pickFrom(hatPalette),
            size: 0.86 + Math.random() * 0.26,
            activity: this.pickActivity(),
            propSwingOffset: Math.random() * Math.PI * 2,
            armSwingOffset: Math.random() * Math.PI * 2,
            isWalking: true,
        };
    }


    private getSkinPalette(): string[] {
        return [
            theme.ui.panelHighlight,
            theme.ui.primaryAccent,
            theme.ui.secondaryAccent,
            theme.worldMap.terrain.desert,
        ];
    }

    private getHairPalette(): string[] {
        return [
            theme.worldMap.terrain.forest,
            theme.worldMap.terrain.mountain,
            theme.ui.primaryBg,
            theme.ui.secondaryBg,
            theme.ui.secondaryAccent,
        ];
    }

    private getShirtPalette(): string[] {
        return [
            theme.entities.player.body,
            theme.worldMap.terrain.water,
            theme.worldMap.terrain.grass,
            theme.ui.secondaryAccent,
            theme.ui.primaryAccent,
        ];
    }

    private getPantsPalette(): string[] {
        return [
            theme.ui.primaryBg,
            theme.ui.secondaryBg,
            theme.worldMap.terrain.mountain,
            theme.worldMap.terrain.forest,
        ];
    }

    private getHatPalette(): string[] {
        return [
            theme.ui.secondaryAccent,
            theme.worldMap.terrain.water,
            theme.worldMap.terrain.forest,
            theme.worldMap.terrain.desert,
            theme.ui.primaryAccent,
        ];
    }

    private pickActivity(): VillageActivityType {
        return this.pickFrom(VillagePopulation.ACTIVITIES);
    }

    private pickDifferentSpot(spotIndex: number): number {
        let nextSpot = Math.floor(Math.random() * this.spots.length);
        if (nextSpot === spotIndex) {
            nextSpot = (nextSpot + 1) % this.spots.length;
        }

        return nextSpot;
    }

    private pickFrom<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }
}
