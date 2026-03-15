import GridMap from '../../utils/GridMap.js';
import { FogState, TerrainData, GridCell } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';

export default class WorldMapRenderer {
    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        ctx.fillStyle = theme.worldMap.background;
        ctx.fillRect(0, 0, width, height);
    }
    public drawGrid(ctx: CanvasRenderingContext2D, grid: GridMap, width: number, height: number): void {
        ctx.strokeStyle = theme.worldMap.gridLines;
        ctx.lineWidth = 1;
        for (let col = 0; col <= grid.columns; col++) {
            const x = col * grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let row = 0; row <= grid.rows; row++) {
            const y = row * grid.cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    public drawCell(ctx: CanvasRenderingContext2D, cell: GridCell, fogState: FogState, terrain: TerrainData | undefined): void {
        if (fogState === 'unknown') {
            this.drawUnknownCell(ctx, cell);
            return;
        }
        const brightness = fogState === 'discovered' ? 1 : 0.7;
        this.drawTerrain(ctx, cell, terrain, brightness);
        if (fogState === 'hidden') {
            ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.16);
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        }
    }
    public drawVillage(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        this.drawVillageGlow(ctx, x, y, glow);
        this.drawVillageBody(ctx, x, y, glow);
    }
    public drawPlayerMarker(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.fillStyle = this.withAlpha(theme.worldMap.playerMarker, 0.2);
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        const characterScale = theme.worldMap.iconScale.character;
        console.log(`characterScale: ${characterScale}`)
        const markerHalfWidth = 6 * characterScale;
        const markerHeight = 8 * characterScale;
        ctx.fillStyle = theme.worldMap.playerMarker;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - markerHeight);
        ctx.lineTo(centerX - markerHalfWidth, centerY + markerHalfWidth);
        ctx.lineTo(centerX + markerHalfWidth, centerY + markerHalfWidth);
        ctx.closePath();
        ctx.fill();
    }
    private drawVillageGlow(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        ctx.save();
        ctx.shadowColor = this.withAlpha('#FFF3A8', 0.95);
        ctx.shadowBlur = 18;
        ctx.fillStyle = this.withAlpha('#FFE66D', glow);
        ctx.beginPath();
        const villageScale = theme.worldMap.iconScale.village;
        ctx.arc(x, y + 1, 10 * villageScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    private drawVillageBody(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        ctx.fillStyle = this.withAlpha('#2E1400', 0.55);
        const villageScale = theme.worldMap.iconScale.village;
        ctx.fillRect(x - (8 * villageScale), y, 16 * villageScale, 11 * villageScale);
        ctx.fillStyle = this.withAlpha('#FF7E2D', glow);
        ctx.beginPath();
        ctx.moveTo(x - (10 * villageScale), y);
        ctx.lineTo(x, y - (12 * villageScale));
        ctx.lineTo(x + (10 * villageScale), y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.withAlpha('#FFF8D0', 0.98);
        ctx.fillRect(x - (3 * villageScale), y + (3 * villageScale), 6 * villageScale, 8 * villageScale);
    }
    private drawUnknownCell(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.fillStyle = theme.worldMap.unknown;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.35);
        ctx.font = '18px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const questionMarkOffset = theme.worldMap.questionMarkOffset;
        ctx.fillText('?', cell.x + (cell.width / 2) + questionMarkOffset.x, cell.y + (cell.height / 2) + questionMarkOffset.y);
    }
    private drawTerrain(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData | undefined, brightness: number): void {
        if (!terrain) {
            return;
        }
        ctx.fillStyle = this.adjustColorBrightness(terrain.color, brightness);
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        this.drawTerrainIcon(ctx, cell, terrain.type, brightness);
        this.drawTerrainPattern(ctx, cell, terrain.pattern, brightness);
    }
    private drawTerrainIcon(ctx: CanvasRenderingContext2D, cell: GridCell, type: TerrainData['type'], brightness: number): void {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.26 * brightness);
        if (type === 'mountain') {
            this.drawMountain(ctx, centerX, centerY);
        } else if (type === 'forest') {
            this.drawForest(ctx, centerX, centerY);
        } else if (type === 'water') {
            ctx.fillRect(centerX - 7, centerY - 1, 14, 2);
            ctx.fillRect(centerX - 5, centerY + 3, 10, 2);
        } else if (type === 'desert') {
            this.drawDesert(ctx, centerX, centerY);
        }
    }
    private drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 6);
        ctx.lineTo(x, y - 7);
        ctx.lineTo(x + 6, y + 6);
        ctx.closePath();
        ctx.fill();
    }
    private drawForest(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.beginPath();
        ctx.arc(x, y - 1, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 1, y + 4, 2, 5);
    }
    private drawDesert(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.beginPath();
        ctx.arc(x - 3, y + 1, 4, Math.PI, Math.PI * 2);
        ctx.arc(x + 3, y + 1, 4, Math.PI, Math.PI * 2);
        ctx.fill();
    }
    private drawTerrainPattern(ctx: CanvasRenderingContext2D, cell: GridCell, pattern: TerrainData['pattern'], brightness: number): void {
        if (pattern === 'dots') {
            this.drawDotsPattern(ctx, cell, brightness);
        } else if (pattern === 'lines') {
            this.drawLinesPattern(ctx, cell, brightness);
        } else if (pattern === 'cross') {
            this.drawCrossPattern(ctx, cell, brightness);
        }
    }
    private drawDotsPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.1 * brightness);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const x = cell.x + (i + 1) * cell.width / 4;
                const y = cell.y + (j + 1) * cell.height / 4;
                ctx.beginPath();
                ctx.arc(x, y, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    private drawLinesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.15 * brightness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 5; i++) {
            const x = cell.x + i * cell.width / 5;
            ctx.moveTo(x, cell.y);
            ctx.lineTo(x, cell.y + cell.height);
        }
        ctx.stroke();
    }
    private drawCrossPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.16 * brightness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cell.x, centerY);
        ctx.lineTo(cell.x + cell.width, centerY);
        ctx.moveTo(centerX, cell.y);
        ctx.lineTo(centerX, cell.y + cell.height);
        ctx.stroke();
    }
    private adjustColorBrightness(color: string, brightness: number): string {
        const hex = color.replace('#', '');
        const red = Math.floor(parseInt(hex.substring(0, 2), 16) * brightness);
        const green = Math.floor(parseInt(hex.substring(2, 4), 16) * brightness);
        const blue = Math.floor(parseInt(hex.substring(4, 6), 16) * brightness);
        const redHex = red.toString(16).padStart(2, '0');
        const greenHex = green.toString(16).padStart(2, '0');
        const blueHex = blue.toString(16).padStart(2, '0');
        return `#${redHex}${greenHex}${blueHex}`;
    }
    private withAlpha(hexColor: string, alpha: number): string {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
