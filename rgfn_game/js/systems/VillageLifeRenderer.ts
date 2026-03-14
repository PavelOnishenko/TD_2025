import { theme } from '../config/ThemeConfig.js';
import VillagePopulation, { VillageSpot, VillageVillager } from './VillagePopulation.js';

export type VillageHouse = { x: number; y: number; width: number; height: number; roofColor: string; doorOpenAmount: number; doorTargetOpenAmount: number; doorStateUntil: number; };

export default class VillageLifeRenderer {
    private static readonly OUTLINE_COLOR = '#1d1b22';
    private readonly villagePopulation: VillagePopulation;
    private villageHouses: VillageHouse[] = [];
    private villageSpots: VillageSpot[] = [];
    private currentVillageName = '';

    constructor(villagePopulation: VillagePopulation) {
        this.villagePopulation = villagePopulation;
    }

    public initialize(width: number, height: number): void {
        this.currentVillageName = this.generateVillageName();
        const roof = this.getRoofVariants();
        this.villageHouses = [
            this.createVillageHouse(width * 0.1, height * 0.61, 104, 68, roof[0]), this.createVillageHouse(width * 0.26, height * 0.58, 116, 74, roof[1]),
            this.createVillageHouse(width * 0.45, height * 0.57, 108, 70, roof[2]), this.createVillageHouse(width * 0.64, height * 0.56, 124, 78, roof[3]),
            this.createVillageHouse(width * 0.82, height * 0.61, 96, 64, roof[4]),
        ];
        this.villageSpots = [
            { x: width * 0.13, y: height * 0.8, houseIndex: 0 }, { x: width * 0.23, y: height * 0.84 }, { x: width * 0.33, y: height * 0.8, houseIndex: 1 },
            { x: width * 0.43, y: height * 0.84 }, { x: width * 0.55, y: height * 0.8, houseIndex: 2 }, { x: width * 0.67, y: height * 0.84 },
            { x: width * 0.79, y: height * 0.81, houseIndex: 3 }, { x: width * 0.57, y: height * 0.7 }, { x: width * 0.78, y: height * 0.7, houseIndex: 4 },
            { x: width * 0.31, y: height * 0.7 },
        ];
        this.villagePopulation.initialize(this.villageSpots, performance.now() * 0.001);
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

    private getRoofVariants(): string[] {
        return [theme.ui.secondaryAccent, this.mixColors(theme.ui.secondaryAccent, theme.ui.primaryAccent, 0.2), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.desert, 0.28), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.3), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.mountain, 0.2)];
    }

    private createVillageHouse(x: number, y: number, width: number, height: number, roofColor: string): VillageHouse {
        return { x, y, width, height, roofColor, doorOpenAmount: 0, doorTargetOpenAmount: 0, doorStateUntil: 0 };
    }

    private updateHouseDoors(now: number): void {
        this.villageHouses.forEach((house) => {
            const open = now < house.doorStateUntil;
            house.doorTargetOpenAmount = open ? 1 : 0;
            house.doorOpenAmount += (house.doorTargetOpenAmount - house.doorOpenAmount) * (open ? 0.17 : 0.1);
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
        const { x, y, width, height, roofColor, doorOpenAmount } = house;
        const edge = VillageLifeRenderer.OUTLINE_COLOR;
        const roofHeight = height * 0.44;
        const isoDepth = width * 0.16;
        const doorX = x + width * 0.4;
        const doorY = y + height * 0.46;
        const doorWidth = width * 0.2;
        const doorHeight = height * 0.54;
        const openAngle = (Math.PI / 2) * doorOpenAmount;
        const openEdgeX = doorX + Math.cos(openAngle) * doorWidth;
        const openEdgeY = doorY - Math.sin(openAngle) * doorWidth * 0.34;

        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.desert, theme.worldMap.terrain.mountain, 0.35);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.mountain, theme.worldMap.terrain.forest, 0.45);
        ctx.beginPath();
        ctx.moveTo(x + width, y);
        ctx.lineTo(x + width + isoDepth, y - isoDepth * 0.35);
        ctx.lineTo(x + width + isoDepth, y + height - isoDepth * 0.35);
        ctx.lineTo(x + width, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + width * 0.48, y - roofHeight);
        ctx.lineTo(x + width + 10, y);
        ctx.lineTo(x + width + isoDepth, y - isoDepth * 0.35);
        ctx.lineTo(x + width * 0.48 + isoDepth, y - roofHeight - isoDepth * 0.35);
        ctx.lineTo(x - 10 + isoDepth, y - isoDepth * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.mixColors(theme.ui.primaryBg, theme.worldMap.terrain.mountain, 0.35);
        ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
        ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.desert, theme.ui.primaryBg, 0.35);
        ctx.beginPath();
        ctx.moveTo(doorX, doorY);
        ctx.lineTo(openEdgeX, openEdgeY);
        ctx.lineTo(openEdgeX, openEdgeY + doorHeight);
        ctx.lineTo(doorX, doorY + doorHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawVillageVillager(ctx: CanvasRenderingContext2D, villager: VillageVillager, time: number): void {
        const speed = villager.isWalking ? 4.4 : 1.2;
        const amp = villager.isWalking ? 4.2 : 0.9;
        const step = Math.sin(time * speed + villager.propSwingOffset) * amp;
        const arm = Math.sin(time * speed + villager.armSwingOffset + Math.PI * 0.5) * amp;
        ctx.save();
        ctx.translate(villager.x, villager.y);
        ctx.scale(villager.size, villager.size);
        ctx.fillStyle = villager.shirtColor;
        ctx.strokeStyle = VillageLifeRenderer.OUTLINE_COLOR;
        ctx.lineWidth = 2;
        ctx.fillRect(-9, -10, 18, 24);
        ctx.strokeRect(-9, -10, 18, 24);
        ctx.fillStyle = villager.skinColor;
        ctx.beginPath();
        ctx.arc(0, -20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = villager.pantsColor;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-5, 14);
        ctx.lineTo(-6 + step * 0.24, 34);
        ctx.moveTo(5, 14);
        ctx.lineTo(6 - step * 0.24, 34);
        ctx.stroke();
        ctx.strokeStyle = villager.skinColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(-17 + arm * 0.45, 12 + Math.abs(step) * 0.2);
        ctx.moveTo(9, -2);
        ctx.lineTo(17 - arm * 0.45, 12 + Math.abs(step) * 0.2);
        ctx.stroke();
        ctx.restore();
    }

    private generateVillageName(): string {
        const first = ['Oak', 'River', 'Sun', 'Stone', 'Amber', 'Willow', 'Moss', 'Silver', 'Pine', 'Moon'];
        const second = ['ford', 'field', 'brook', 'haven', 'hill', 'cross', 'watch', 'stead', 'rest', 'meadow'];
        return `${first[Math.floor(Math.random() * first.length)]}${second[Math.floor(Math.random() * second.length)]}`;
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
