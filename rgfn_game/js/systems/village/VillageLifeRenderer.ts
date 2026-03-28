import { theme } from '../../config/ThemeConfig.js';
import { WALK_KEYFRAMES, WALK_META } from '../../animations/imported/walkImported.js';
import StickFigure from '../../utils/StickFigure.js';
import VillagePopulation, { VillageSpot, VillageVillager } from './VillagePopulation.js';
import { generateVillageName } from '../world/VillageNameGenerator.js';

export type VillageHouse = {
    worldX: number;
    worldY: number;
    footprintWidth: number;
    footprintDepth: number;
    wallHeight: number;
    roofHeight: number;
    roofColor: string;
    doorOpenAmount: number;
    doorTargetOpenAmount: number;
    doorStateUntil: number;
    isShop: boolean;
};

type VillageHouseConfig = {
    gridX: number;
    gridY: number;
    footprintWidth: number;
    footprintDepth: number;
    wallHeight: number;
    roofHeight: number;
    roofColor: string;
    isShop?: boolean;
};

export default class VillageLifeRenderer {
    private static readonly OUTLINE_COLOR = '#1d1b22';
    private static readonly ISO_COS = Math.cos(Math.PI / 6);
    private static readonly ISO_SIN = Math.sin(Math.PI / 6);

    private readonly villagePopulation: VillagePopulation;
    private villageHouses: VillageHouse[] = [];
    private villageSpots: VillageSpot[] = [];
    private currentVillageName = '';
    private isoOriginX = 0;
    private isoOriginY = 0;
    private isoScale = 1;

    constructor(villagePopulation: VillagePopulation) {
        this.villagePopulation = villagePopulation;
    }

    public initialize(width: number, height: number, villageName?: string): void {
        this.currentVillageName = villageName ?? this.generateVillageName();
        const roof = this.getRoofVariants();
        this.isoScale = Math.max(18, width * 0.024);
        this.isoOriginX = width * 0.5;
        this.isoOriginY = height * 0.34;

        const houses: VillageHouseConfig[] = [
            { gridX: -4.2, gridY: -0.4, footprintWidth: 1.6, footprintDepth: 1.6, wallHeight: 1.2, roofHeight: 0.8, roofColor: roof[0] },
            { gridX: -1.6, gridY: -1.8, footprintWidth: 1.8, footprintDepth: 1.6, wallHeight: 1.28, roofHeight: 0.85, roofColor: roof[1] },
            { gridX: 1.8, gridY: -0.6, footprintWidth: 1.9, footprintDepth: 1.8, wallHeight: 1.35, roofHeight: 0.9, roofColor: roof[2], isShop: true },
            { gridX: -4.4, gridY: 2.1, footprintWidth: 1.7, footprintDepth: 1.7, wallHeight: 1.18, roofHeight: 0.82, roofColor: roof[3] },
            { gridX: -0.9, gridY: 2.8, footprintWidth: 1.65, footprintDepth: 1.65, wallHeight: 1.12, roofHeight: 0.78, roofColor: roof[4] },
            { gridX: 2.5, gridY: 2.5, footprintWidth: 1.75, footprintDepth: 1.6, wallHeight: 1.18, roofHeight: 0.82, roofColor: this.mixColors(roof[1], roof[3], 0.36) },
        ];

        this.villageHouses = houses
            .map((house) => this.createVillageHouse(house))
            .sort((a, b) => (a.worldX + a.worldY) - (b.worldX + b.worldY));

        this.villageSpots = this.buildVillageSpots();
        this.villagePopulation.initialize(this.villageSpots, performance.now() * 0.001, this.currentVillageName);
    }

    public update(now: number): void {
        this.updateHouseDoors(now);
        this.villagePopulation.update(now, (spotIndex, time) => this.triggerHouseDoorBySpot(spotIndex, time));
    }

    public render(ctx: CanvasRenderingContext2D, time: number): void {
        this.villageHouses.forEach((house) => this.drawVillageHouse(ctx, house));
        this.villagePopulation.getVillagers().forEach((villager) => this.drawVillageVillager(ctx, villager, time));
    }

    public getVillageName(): string {
        return this.currentVillageName;
    }

    private buildVillageSpots(): VillageSpot[] {
        const spots: VillageSpot[] = [];
        this.villageHouses.forEach((house, houseIndex) => {
            const frontDoor = this.projectIso(house.worldX + (house.footprintWidth * 0.5), house.worldY + house.footprintDepth + 0.26, 0);
            const nearDoor = this.projectIso(house.worldX + (house.footprintWidth * 0.5), house.worldY + house.footprintDepth + 0.9, 0);
            spots.push({ x: frontDoor.x, y: frontDoor.y, houseIndex });
            spots.push({ x: nearDoor.x, y: nearDoor.y });
        });

        const crossroads = [
            this.projectIso(-1.1, 1.1, 0),
            this.projectIso(0.4, 0.6, 0),
            this.projectIso(1.2, 2.1, 0),
            this.projectIso(-2.1, 2.0, 0),
        ];
        crossroads.forEach((spot) => spots.push({ x: spot.x, y: spot.y }));
        return spots;
    }

    private getRoofVariants(): string[] {
        return [
            theme.ui.secondaryAccent,
            this.mixColors(theme.ui.secondaryAccent, theme.ui.primaryAccent, 0.2),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.desert, 0.28),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.3),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.mountain, 0.2),
        ];
    }

    private createVillageHouse(config: VillageHouseConfig): VillageHouse {
        return {
            worldX: config.gridX,
            worldY: config.gridY,
            footprintWidth: config.footprintWidth,
            footprintDepth: config.footprintDepth,
            wallHeight: config.wallHeight,
            roofHeight: config.roofHeight,
            roofColor: config.isShop ? this.mixColors(config.roofColor, theme.ui.primaryAccent, 0.2) : config.roofColor,
            doorOpenAmount: 0,
            doorTargetOpenAmount: 0,
            doorStateUntil: 0,
            isShop: Boolean(config.isShop),
        };
    }

    private updateHouseDoors(now: number): void {
        this.villageHouses.forEach((house) => {
            const open = now < house.doorStateUntil;
            house.doorTargetOpenAmount = open ? 1 : 0;
            house.doorOpenAmount += (house.doorTargetOpenAmount - house.doorOpenAmount) * (open ? 0.18 : 0.1);
            house.doorOpenAmount = Math.max(0, Math.min(1, house.doorOpenAmount));
        });
    }

    private triggerHouseDoorBySpot(spotIndex: number, now: number): void {
        const spot = this.villageSpots[spotIndex];
        const house = spot && typeof spot.houseIndex === 'number' ? this.villageHouses[spot.houseIndex] : null;
        if (!house) {
            return;
        }

        house.doorStateUntil = Math.max(house.doorStateUntil, now + 2.2);
    }

    private drawVillageHouse(ctx: CanvasRenderingContext2D, house: VillageHouse): void {
        const edge = VillageLifeRenderer.OUTLINE_COLOR;
        const wallLight = this.mixColors(theme.worldMap.terrain.desert, theme.worldMap.terrain.mountain, 0.24);
        const wallDark = this.mixColors(theme.worldMap.terrain.mountain, theme.worldMap.terrain.forest, 0.5);

        const a = this.projectIso(house.worldX, house.worldY, 0);
        const b = this.projectIso(house.worldX + house.footprintWidth, house.worldY, 0);
        const c = this.projectIso(house.worldX + house.footprintWidth, house.worldY + house.footprintDepth, 0);
        const d = this.projectIso(house.worldX, house.worldY + house.footprintDepth, 0);

        const at = this.projectIso(house.worldX, house.worldY, house.wallHeight);
        const bt = this.projectIso(house.worldX + house.footprintWidth, house.worldY, house.wallHeight);
        const ct = this.projectIso(house.worldX + house.footprintWidth, house.worldY + house.footprintDepth, house.wallHeight);
        const dt = this.projectIso(house.worldX, house.worldY + house.footprintDepth, house.wallHeight);

        const roofPeak = this.projectIso(
            house.worldX + house.footprintWidth * 0.5,
            house.worldY + house.footprintDepth * 0.5,
            house.wallHeight + house.roofHeight,
        );

        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.8;

        this.fillPolygon(ctx, [d, c, ct, dt], wallLight);
        this.fillPolygon(ctx, [b, c, ct, bt], wallDark);
        this.fillPolygon(ctx, [at, bt, roofPeak], house.roofColor);
        this.fillPolygon(ctx, [bt, ct, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.mountain, 0.2));
        this.fillPolygon(ctx, [ct, dt, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.desert, 0.14));
        this.fillPolygon(ctx, [dt, at, roofPeak], this.mixColors(house.roofColor, theme.worldMap.terrain.forest, 0.24));

        const doorCenterX = house.worldX + house.footprintWidth * 0.58;
        const doorBottomY = house.worldY + house.footprintDepth;
        const doorHalf = house.footprintWidth * 0.11;
        const doorHeight = house.wallHeight * 0.62;

        const doorLeftBottom = this.projectIso(doorCenterX - doorHalf, doorBottomY, 0);
        const doorRightBottom = this.projectIso(doorCenterX + doorHalf, doorBottomY, 0);
        const doorRightTop = this.projectIso(doorCenterX + doorHalf, doorBottomY, doorHeight);
        const doorLeftTop = this.projectIso(doorCenterX - doorHalf, doorBottomY, doorHeight);

        this.fillPolygon(ctx, [doorLeftBottom, doorRightBottom, doorRightTop, doorLeftTop], this.mixColors(theme.ui.primaryBg, theme.worldMap.terrain.mountain, 0.35));

        const hinge = doorLeftBottom;
        const openRad = (Math.PI / 2) * house.doorOpenAmount;
        const openX = Math.cos(openRad) * (doorRightBottom.x - doorLeftBottom.x);
        const openY = Math.sin(openRad) * (doorRightBottom.x - doorLeftBottom.x) * 0.22;
        const openBottom = { x: hinge.x + openX, y: hinge.y + openY };
        const openTop = { x: doorLeftTop.x + openX, y: doorLeftTop.y + openY };
        this.fillPolygon(ctx, [hinge, openBottom, openTop, doorLeftTop], this.mixColors(theme.worldMap.terrain.desert, theme.ui.primaryBg, 0.35));

        if (house.isShop) {
            const signBottomLeft = this.projectIso(house.worldX + house.footprintWidth * 0.36, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.7);
            const signBottomRight = this.projectIso(house.worldX + house.footprintWidth * 0.72, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.7);
            const signTopRight = this.projectIso(house.worldX + house.footprintWidth * 0.72, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.95);
            const signTopLeft = this.projectIso(house.worldX + house.footprintWidth * 0.36, house.worldY + house.footprintDepth + 0.02, house.wallHeight * 0.95);
            this.fillPolygon(ctx, [signBottomLeft, signBottomRight, signTopRight, signTopLeft], this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryAccent, 0.34));
            ctx.fillStyle = theme.ui.primaryBg;
            ctx.font = 'bold 10px Arial, sans-serif';
            const textAnchor = this.projectIso(house.worldX + house.footprintWidth * 0.44, house.worldY + house.footprintDepth + 0.04, house.wallHeight * 0.88);
            ctx.fillText('SHOP', textAnchor.x, textAnchor.y);
        }
    }

    private drawVillageVillager(ctx: CanvasRenderingContext2D, villager: VillageVillager, time: number): void {
        const fromSpot = this.villageSpots[villager.fromSpot];
        const toSpot = this.villageSpots[villager.toSpot];
        const movementX = (toSpot?.x ?? villager.x) - (fromSpot?.x ?? villager.x);
        const isFacingRight = movementX >= 0;
        const walkCycleTime = (time * 1.6) + villager.armSwingOffset;
        const walkDuration = Math.max(0.0001, WALK_META.duration);
        const wrappedTime = ((walkCycleTime % walkDuration) + walkDuration) % walkDuration;
        const animationProgress = villager.isWalking ? (wrappedTime / walkDuration) : 0;
        const pose = StickFigure.getPoseFromImportedAnimation(WALK_KEYFRAMES, WALK_META, animationProgress);

        ctx.save();
        const drawX = villager.x;
        const drawY = villager.y + (villager.size * 2.2);
        const bodyColor = this.mixColors(villager.shirtColor, villager.pantsColor, 0.45);
        const renderScale = villager.size * 0.75;
        StickFigure.draw(ctx, drawX, drawY, pose, bodyColor, isFacingRight, renderScale);
        ctx.restore();
    }

    private projectIso(x: number, y: number, z: number): { x: number; y: number } {
        return {
            x: this.isoOriginX + (x - y) * VillageLifeRenderer.ISO_COS * this.isoScale,
            y: this.isoOriginY + (x + y) * VillageLifeRenderer.ISO_SIN * this.isoScale - z * this.isoScale,
        };
    }

    private fillPolygon(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, fillStyle: string): void {
        if (points.length < 3) {
            return;
        }

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private generateVillageName(): string {
        return generateVillageName(Math.floor(Math.random() * 0x7fffffff));
    }

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const blend = Math.max(0, Math.min(1, ratio));
        const rA = parseInt(colorA.slice(1, 3), 16);
        const gA = parseInt(colorA.slice(3, 5), 16);
        const bA = parseInt(colorA.slice(5, 7), 16);
        const rB = parseInt(colorB.slice(1, 3), 16);
        const gB = parseInt(colorB.slice(3, 5), 16);
        const bB = parseInt(colorB.slice(5, 7), 16);
        if ([rA, gA, bA, rB, gB, bB].some((value) => Number.isNaN(value))) {
            return colorA;
        }

        const r = Math.round(rA + (rB - rA) * blend);
        const g = Math.round(gA + (gB - gA) * blend);
        const b = Math.round(bA + (bB - bA) * blend);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
