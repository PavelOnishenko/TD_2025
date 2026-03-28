import { theme } from '../../config/ThemeConfig.js';
import VillagePopulation, { VillageSpot, VillageVillager } from './VillagePopulation.js';

export type VillageHouse = { x: number; y: number; width: number; height: number; roofColor: string; doorOpenAmount: number; doorTargetOpenAmount: number; doorStateUntil: number; isShop: boolean; };
type VillageHouseConfig = { gridX: number; gridY: number; width: number; height: number; roofColor: string; isShop?: boolean; };

export default class VillageLifeRenderer {
    private static readonly OUTLINE_COLOR = '#1d1b22';
    private readonly villagePopulation: VillagePopulation;
    private villageHouses: VillageHouse[] = [];
    private villageSpots: VillageSpot[] = [];
    private currentVillageName = '';

    constructor(villagePopulation: VillagePopulation) {
        this.villagePopulation = villagePopulation;
    }

    public initialize(width: number, height: number, villageName?: string): void {
        this.currentVillageName = villageName ?? this.generateVillageName();
        const roof = this.getRoofVariants();
        const tileW = Math.max(56, width * 0.075);
        const tileH = tileW * 0.5;
        const centerX = width * 0.5;
        const topY = height * 0.28;
        const houses: VillageHouseConfig[] = [
            { gridX: -2, gridY: 0, width: 74, height: 44, roofColor: roof[0] },
            { gridX: 0, gridY: -1, width: 80, height: 48, roofColor: roof[1] },
            { gridX: 2, gridY: 0, width: 72, height: 43, roofColor: roof[2], isShop: true },
            { gridX: -2, gridY: 2, width: 76, height: 46, roofColor: roof[3] },
            { gridX: 0, gridY: 3, width: 70, height: 42, roofColor: roof[4] },
            { gridX: 2, gridY: 2, width: 74, height: 44, roofColor: this.mixColors(roof[1], roof[3], 0.4) },
        ];
        this.villageHouses = houses.map((config) => {
            const point = this.isoToScreen(centerX, topY, tileW, tileH, config.gridX, config.gridY);
            const house = this.createVillageHouse(point.x - config.width * 0.5, point.y - config.height * 0.85, config.width, config.height, config.roofColor, Boolean(config.isShop));
            if (house.isShop) {
                house.roofColor = this.mixColors(config.roofColor, theme.ui.primaryAccent, 0.2);
            }

            return house;
        });
        this.villageSpots = [
            { ...this.isoToScreen(centerX, topY, tileW, tileH, -2, 1), houseIndex: 0 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, -1, 1) },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 0, 0), houseIndex: 1 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 1, 1) },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 2, 1), houseIndex: 2 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, -2, 3), houseIndex: 3 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, -1, 3) },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 0, 4), houseIndex: 4 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 1, 3) },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 2, 3), houseIndex: 5 },
            { ...this.isoToScreen(centerX, topY, tileW, tileH, 0, 2) },
        ];
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

    private getRoofVariants(): string[] {
        return [theme.ui.secondaryAccent, this.mixColors(theme.ui.secondaryAccent, theme.ui.primaryAccent, 0.2), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.desert, 0.28), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.3), this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.mountain, 0.2)];
    }

    private createVillageHouse(x: number, y: number, width: number, height: number, roofColor: string, isShop: boolean): VillageHouse {
        return { x, y, width, height, roofColor, doorOpenAmount: 0, doorTargetOpenAmount: 0, doorStateUntil: 0, isShop };
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
        const { x, y, width, height, roofColor, doorOpenAmount, isShop } = house;
        const edge = VillageLifeRenderer.OUTLINE_COLOR;
        const roofHeight = height * 0.5;
        const isoDepth = width * 0.18;
        const doorX = x + width * 0.42;
        const doorY = y + height * 0.5;
        const doorWidth = width * 0.16;
        const doorHeight = height * 0.5;
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

        if (isShop) {
            ctx.fillStyle = this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryAccent, 0.3);
            ctx.fillRect(x + width * 0.3, y + height * 0.18, width * 0.4, height * 0.14);
            ctx.strokeRect(x + width * 0.3, y + height * 0.18, width * 0.4, height * 0.14);
            ctx.fillStyle = theme.ui.primaryBg;
            ctx.font = 'bold 11px Arial, sans-serif';
            ctx.fillText('SHOP', x + width * 0.34, y + height * 0.29);
        }
    }

    private drawVillageVillager(ctx: CanvasRenderingContext2D, villager: VillageVillager, time: number): void {
        const speed = villager.isWalking ? 4.1 : 1.1;
        const amp = villager.isWalking ? 2.8 : 0.6;
        const step = Math.sin(time * speed + villager.propSwingOffset) * amp;
        const arm = Math.sin(time * speed + villager.armSwingOffset + Math.PI * 0.5) * amp;
        ctx.save();
        ctx.translate(villager.x, villager.y);
        ctx.scale(villager.size * 0.72, villager.size * 0.72);
        ctx.fillStyle = villager.shirtColor;
        ctx.strokeStyle = VillageLifeRenderer.OUTLINE_COLOR;
        ctx.lineWidth = 1.8;
        ctx.fillRect(-8, -8, 16, 20);
        ctx.strokeRect(-8, -8, 16, 20);
        ctx.fillStyle = villager.skinColor;
        ctx.beginPath();
        ctx.arc(0, -16, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = villager.pantsColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-4, 12);
        ctx.lineTo(-5 + step * 0.2, 25);
        ctx.moveTo(4, 12);
        ctx.lineTo(5 - step * 0.2, 25);
        ctx.stroke();
        ctx.strokeStyle = villager.skinColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -1);
        ctx.lineTo(-13 + arm * 0.3, 10 + Math.abs(step) * 0.14);
        ctx.moveTo(8, -1);
        ctx.lineTo(13 - arm * 0.3, 10 + Math.abs(step) * 0.14);
        ctx.stroke();
        ctx.restore();
    }

    private isoToScreen(centerX: number, topY: number, tileWidth: number, tileHeight: number, gridX: number, gridY: number): { x: number; y: number } {
        return {
            x: centerX + (gridX - gridY) * (tileWidth * 0.5),
            y: topY + (gridX + gridY) * (tileHeight * 0.5),
        };
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
