import { theme } from '../../config/ThemeConfig.js';

export default class VillageEnvironmentRenderer {
    private static readonly OUTLINE_COLOR = '#1d1b22';

    public render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
        this.drawSky(ctx, width, height, time);
        this.drawClouds(ctx, width, time);
        this.drawHills(ctx, width, height);
        this.drawField(ctx, width * 0.08, height * 0.71, width * 0.33, height * 0.18, time);
        this.drawBuildSite(ctx, width * 0.72, height * 0.74, width * 0.17, height * 0.14);
        this.drawWell(ctx, width * 0.51, height * 0.71, width * 0.08, height * 0.1, time);
        this.drawPath(ctx, width, height);
    }

    private drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, this.mixColors(theme.worldMap.terrain.water, theme.worldMap.background, 0.28));
        skyGradient.addColorStop(0.58, this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.55));
        skyGradient.addColorStop(0.59, this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.35));
        skyGradient.addColorStop(1, this.mixColors(theme.worldMap.terrain.forest, theme.worldMap.terrain.grass, 0.45));
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        const sunPulse = 10 + Math.sin(time * 1.8) * 2;
        ctx.fillStyle = theme.ui.panelHighlight;
        ctx.beginPath();
        ctx.arc(width * 0.84, height * 0.2, 42 + sunPulse, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawClouds(ctx: CanvasRenderingContext2D, width: number, time: number): void {
        const cloudOffset = (time * 22) % (width + 260);
        this.drawCloud(ctx, width - cloudOffset, 95, 1.1);
        this.drawCloud(ctx, width - cloudOffset * 0.7 - 220, 150, 0.85);
        this.drawCloud(ctx, width - cloudOffset * 1.2 + 120, 72, 0.7);
    }

    private drawHills(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.forest, theme.worldMap.terrain.grass, 0.35);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.6);
        ctx.quadraticCurveTo(width * 0.22, height * 0.5, width * 0.44, height * 0.62);
        ctx.quadraticCurveTo(width * 0.7, height * 0.72, width, height * 0.58);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    }

    private drawField(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number): void {
        const outlineColor = VillageEnvironmentRenderer.OUTLINE_COLOR;
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.grass, theme.worldMap.terrain.forest, 0.55);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        for (let row = 0; row < 5; row += 1) {
            for (let col = 0; col < 10; col += 1) {
                const px = x + 12 + col * ((width - 24) / 9);
                const py = y + 14 + row * ((height - 24) / 4);
                const sway = Math.sin(time * 0.9 + col * 0.5 + row * 0.7) * 2.2;
                ctx.strokeStyle = this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.25);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px - 2 + sway, py - 2);
                ctx.stroke();

                ctx.strokeStyle = this.withOpacity(outlineColor, 0.55);
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px + 2 + sway * 0.6, py - 1);
                ctx.stroke();
            }
        }
    }

    private drawWell(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number): void {
        const outlineColor = VillageEnvironmentRenderer.OUTLINE_COLOR;
        ctx.fillStyle = this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryBg, 0.4);
        ctx.fillRect(x, y + height * 0.25, width, height * 0.75);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y + height * 0.25, width, height * 0.75);

        ctx.beginPath();
        ctx.moveTo(x + width * 0.2, y + height * 0.25);
        ctx.lineTo(x + width * 0.2, y - height * 0.48);
        ctx.moveTo(x + width * 0.8, y + height * 0.25);
        ctx.lineTo(x + width * 0.8, y - height * 0.48);
        ctx.moveTo(x + width * 0.2, y - height * 0.48);
        ctx.lineTo(x + width * 0.8, y - height * 0.48);
        ctx.stroke();

        const bucketOffset = Math.sin(time * 1.4) * (height * 0.1);
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.4);
        ctx.fillRect(x + width * 0.4, y - height * 0.22 + bucketOffset, width * 0.22, height * 0.18);
    }

    private drawBuildSite(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        const outlineColor = VillageEnvironmentRenderer.OUTLINE_COLOR;
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.desert, theme.worldMap.terrain.mountain, 0.3);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.2);
        const planks = [
            [x + width * 0.08, y + height * 0.25, width * 0.62, height * 0.08],
            [x + width * 0.12, y + height * 0.42, width * 0.68, height * 0.08],
            [x + width * 0.2, y + height * 0.6, width * 0.56, height * 0.08],
        ];

        planks.forEach(([px, py, pw, ph]) => {
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeRect(px, py, pw, ph);
        });
    }

    private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
        const outlineColor = VillageEnvironmentRenderer.OUTLINE_COLOR;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = this.withOpacity(theme.ui.panelHighlight, 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.arc(28, -8, 30, 0, Math.PI * 2);
        ctx.arc(62, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.withOpacity(outlineColor, 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    private drawPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        ctx.strokeStyle = this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryBg, 0.45);
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        ctx.quadraticCurveTo(width * 0.4, height * 0.75, width * 0.8, height * 0.88);
        ctx.lineTo(width, height * 0.92);
        ctx.stroke();
    }

    private withOpacity(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if ([r, g, b].some((value) => Number.isNaN(value))) {
            return hex;
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
