import GridMap from '../../utils/GridMap.js';
import { FogState, TerrainData, GridCell, TerrainNeighbors, TerrainPattern, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';

export default class WorldMapRenderer {
    public drawNamedLocation(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        label: string,
        terrainType: TerrainType,
        options: { emphasized: boolean; showLabel: boolean },
    ): void {
        const centerX = cell.x + (cell.width / 2);
        const centerY = cell.y + (cell.height / 2);
        const alpha = options.emphasized ? 0.95 : 0.72;
        const fillColor = this.withAlpha(theme.ui.locationNameColor, alpha);
        const strokeColor = this.withAlpha(theme.ui.primaryBg, options.emphasized ? 0.95 : 0.72);
        const size = Math.max(5, cell.width * 0.17);

        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.4;

        if (terrainType === 'forest') {
            this.drawNamedLocationGrove(ctx, centerX, centerY, size);
        } else if (terrainType === 'desert') {
            this.drawNamedLocationCairn(ctx, centerX, centerY, size);
        } else {
            this.drawNamedLocationObelisk(ctx, centerX, centerY, size);
        }

        if (options.showLabel) {
            this.drawNamedLocationLabel(ctx, cell, label, alpha);
        }

        ctx.restore();
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.mixColors(theme.worldMap.background, theme.ui.panelHighlight, 0.22));
        gradient.addColorStop(1, this.mixColors(theme.worldMap.background, theme.ui.primaryAccent, 0.08));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    public drawGrid(ctx: CanvasRenderingContext2D, grid: GridMap, width: number, height: number): void {
        ctx.save();
        ctx.strokeStyle = theme.worldMap.gridLines;
        ctx.setLineDash([4, 8]);
        ctx.lineWidth = 1;
        const startX = Math.max(0, grid.offsetX);
        const startY = Math.max(0, grid.offsetY);
        const endX = Math.min(width, grid.offsetX + (grid.columns * grid.cellSize));
        const endY = Math.min(height, grid.offsetY + (grid.rows * grid.cellSize));
        const startCol = Math.max(0, Math.floor((-grid.offsetX) / grid.cellSize));
        const endCol = Math.min(grid.columns, Math.ceil((width - grid.offsetX) / grid.cellSize));
        const startRow = Math.max(0, Math.floor((-grid.offsetY) / grid.cellSize));
        const endRow = Math.min(grid.rows, Math.ceil((height - grid.offsetY) / grid.cellSize));
        for (let col = startCol; col <= endCol; col++) {
            const x = grid.offsetX + (col * grid.cellSize);
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let row = startRow; row <= endRow; row++) {
            const y = grid.offsetY + (row * grid.cellSize);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    public drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        fogState: FogState,
        terrain: TerrainData | undefined,
        neighbors?: TerrainNeighbors,
    ): void {
        if (fogState === 'unknown') {
            this.drawUnknownCell(ctx, cell);
            return;
        }
        if (!terrain) {
            return;
        }

        const brightness = fogState === 'discovered'
            ? 1
            : terrain.type === 'water'
                ? 0.84
                : 0.72;
        const path = this.createTerrainPath(cell, neighbors);
        this.drawTerrain(ctx, cell, terrain, brightness, path);
        if (fogState === 'hidden') {
            this.drawHiddenOverlay(ctx, path, terrain.type);
        }
    }

    public drawVillage(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        this.drawVillageGlow(ctx, x, y, glow);
        this.drawVillageBody(ctx, x, y, glow);
    }

    public drawPlayerMarker(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        const path = this.createRoundedRectPath(cell.x + 3, cell.y + 3, cell.width - 6, cell.height - 6, Math.max(6, cell.width * 0.18));
        ctx.save();
        ctx.fillStyle = this.withAlpha(theme.worldMap.playerMarker, 0.16);
        ctx.fill(path);
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        const characterScale = theme.worldMap.iconScale.character * Math.max(0.8, cell.width / 40);
        const markerHalfWidth = 6 * characterScale;
        const markerHeight = 8 * characterScale;
        ctx.fillStyle = theme.worldMap.playerMarker;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - markerHeight);
        ctx.lineTo(centerX - markerHalfWidth, centerY + markerHalfWidth);
        ctx.lineTo(centerX + markerHalfWidth, centerY + markerHalfWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    public drawScaleLegend(ctx: CanvasRenderingContext2D, grid: GridMap, label: string, canvasWidth: number, canvasHeight: number): void {
        const legendWidth = Math.min(190, Math.max(110, grid.cellSize * 3.5));
        const legendHeight = 28;
        const x = Math.min(canvasWidth - legendWidth - 10, Math.max(10, grid.offsetX + 10));
        const y = Math.min(canvasHeight - legendHeight - 10, Math.max(10, grid.offsetY + 10));
        const legendPath = this.createRoundedRectPath(x, y, legendWidth, legendHeight, 8);

        ctx.save();
        ctx.fillStyle = this.withAlpha(theme.ui.primaryBg, 0.86);
        ctx.fill(legendPath);
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.3);
        ctx.lineWidth = 1.5;
        ctx.stroke(legendPath);

        ctx.fillStyle = theme.ui.textPrimary;
        ctx.font = '12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 10, y + legendHeight / 2);
        ctx.restore();
    }

     public drawNamedLocationFocus(ctx: CanvasRenderingContext2D, cell: GridCell, label: string): void {
        const inset = Math.max(3, cell.width * 0.08);
        const path = this.createRoundedRectPath(
            cell.x + inset,
            cell.y + inset,
            cell.width - (inset * 2),
            cell.height - (inset * 2),
            Math.max(5, cell.width * 0.16),
        );

        ctx.save();
        ctx.strokeStyle = this.withAlpha(theme.ui.locationNameColor, 0.95);
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke(path);
        ctx.setLineDash([]);

        const textWidth = Math.min(220, Math.max(70, (label.length * 7) + 22));
        const textHeight = 24;
        const textX = Math.max(8, Math.min(cell.x, (cell.x + cell.width) - textWidth + 12));
        const textY = Math.max(8, cell.y - textHeight - 6);
        const bubble = this.createRoundedRectPath(textX, textY, textWidth, textHeight, 8);

        ctx.fillStyle = this.withAlpha(theme.ui.primaryBg, 0.95);
        ctx.fill(bubble);
        ctx.strokeStyle = this.withAlpha(theme.ui.locationNameColor, 0.75);
        ctx.lineWidth = 1.5;
        ctx.stroke(bubble);

        ctx.fillStyle = theme.ui.locationNameColor;
        ctx.font = 'bold 12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, textX + 10, textY + (textHeight / 2));
        ctx.restore();
    }

    public drawCursorMarker(ctx: CanvasRenderingContext2D, cell: GridCell, isVisible: boolean): void {
        const inset = Math.max(2, cell.width * 0.08);
        const path = this.createRoundedRectPath(
            cell.x + inset,
            cell.y + inset,
            cell.width - (inset * 2),
            cell.height - (inset * 2),
            Math.max(5, cell.width * 0.18),
        );

        ctx.save();
        ctx.strokeStyle = this.withAlpha(theme.ui.warningColor, isVisible ? 0.95 : 0.7);
        ctx.lineWidth = Math.max(2, cell.width * 0.08);
        ctx.setLineDash([6, 4]);
        ctx.stroke(path);
        ctx.fillStyle = this.withAlpha(theme.ui.warningColor, isVisible ? 0.16 : 0.08);
        ctx.fill(path);
        ctx.restore();
    }

    private drawNamedLocationLabel(ctx: CanvasRenderingContext2D, cell: GridCell, label: string, alpha: number): void {
        const textWidth = Math.min(220, Math.max(70, (label.length * 7) + 22));
        const textHeight = 24;
        const textX = Math.max(8, Math.min(cell.x, (cell.x + cell.width) - textWidth + 12));
        const textY = Math.max(8, cell.y - textHeight - 6);
        const bubble = this.createRoundedRectPath(textX, textY, textWidth, textHeight, 8);

        ctx.fillStyle = this.withAlpha(theme.ui.primaryBg, 0.92);
        ctx.fill(bubble);
        ctx.strokeStyle = this.withAlpha(theme.ui.locationNameColor, Math.min(1, alpha + 0.05));
        ctx.lineWidth = 1.4;
        ctx.stroke(bubble);

        ctx.fillStyle = theme.ui.locationNameColor;
        ctx.font = 'bold 12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, textX + 10, textY + (textHeight / 2));
    }

    private drawNamedLocationObelisk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.moveTo(x, y - (size * 1.3));
        ctx.lineTo(x - (size * 0.55), y + (size * 0.65));
        ctx.lineTo(x + (size * 0.55), y + (size * 0.65));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y - (size * 0.2), Math.max(1.6, size * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = this.withAlpha(theme.ui.panelHighlight, 0.92);
        ctx.fill();
    }

    private drawNamedLocationGrove(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.arc(x - (size * 0.45), y - (size * 0.15), size * 0.55, 0, Math.PI * 2);
        ctx.arc(x + (size * 0.45), y - (size * 0.15), size * 0.55, 0, Math.PI * 2);
        ctx.arc(x, y - (size * 0.55), size * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(x - (size * 0.18), y + (size * 0.25), size * 0.36, size * 0.7);
    }

    private drawNamedLocationCairn(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.ellipse(x, y + (size * 0.3), size * 0.8, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - (size * 0.25), size * 0.58, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - (size * 0.75), size * 0.38, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    private drawVillageGlow(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        ctx.save();
        ctx.shadowColor = this.withAlpha(this.mixColors(theme.ui.warningColor, theme.ui.panelHighlight, 0.55), 0.95);
        ctx.shadowBlur = 18;
        ctx.fillStyle = this.withAlpha(this.mixColors(theme.ui.warningColor, theme.ui.panelHighlight, 0.3), glow);
        ctx.beginPath();
        const villageScale = theme.worldMap.iconScale.village;
        ctx.arc(x, y + 1, 10 * villageScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private drawVillageBody(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        const villageScale = theme.worldMap.iconScale.village;
        ctx.fillStyle = this.withAlpha(this.mixColors(theme.ui.primaryAccent, theme.ui.secondaryAccent, 0.15), 0.65);
        ctx.fillRect(x - (8 * villageScale), y, 16 * villageScale, 11 * villageScale);
        ctx.fillStyle = this.withAlpha(this.mixColors(theme.ui.warningColor, theme.ui.secondaryAccent, 0.35), glow);
        ctx.beginPath();
        ctx.moveTo(x - (10 * villageScale), y);
        ctx.lineTo(x, y - (12 * villageScale));
        ctx.lineTo(x + (10 * villageScale), y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.withAlpha(theme.ui.panelHighlight, 0.98);
        ctx.fillRect(x - (3 * villageScale), y + (3 * villageScale), 6 * villageScale, 8 * villageScale);
    }

    private drawUnknownCell(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        const path = this.createRoundedRectPath(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2, Math.max(4, cell.width * 0.18));
        ctx.save();
        ctx.fillStyle = theme.worldMap.unknown;
        ctx.fill(path);
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.35);
        ctx.font = `${Math.max(12, Math.floor(cell.width * 0.45))}px Georgia`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const questionMarkOffset = theme.worldMap.questionMarkOffset;
        ctx.fillText('?', cell.x + (cell.width / 2) + questionMarkOffset.x, cell.y + (cell.height / 2) + questionMarkOffset.y);
        ctx.restore();
    }

    private drawTerrain(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        terrain: TerrainData,
        brightness: number,
        path: Path2D,
    ): void {
        ctx.save();
        ctx.fillStyle = this.adjustColorBrightness(terrain.color, brightness);
        ctx.fill(path);
        ctx.clip(path);
        this.drawTerrainTexture(ctx, cell, terrain, brightness);
        this.drawTerrainIcon(ctx, cell, terrain.type, brightness);
        ctx.restore();
    }

    private drawHiddenOverlay(ctx: CanvasRenderingContext2D, path: Path2D, terrainType: TerrainType): void {
        const overlayColor = terrainType === 'water'
            ? this.withAlpha(this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.18), 0.1)
            : this.withAlpha(theme.ui.primaryAccent, 0.3);

        ctx.save();
        ctx.fillStyle = overlayColor;
        ctx.fill(path);
        ctx.restore();
    }

    private drawTerrainTexture(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData, brightness: number): void {
        const textureColor = this.withAlpha(this.mixColors(theme.ui.primaryAccent, theme.ui.panelHighlight, 0.25), 0.18 * brightness);
        ctx.strokeStyle = textureColor;
        ctx.fillStyle = textureColor;
        ctx.lineWidth = 1;

        if (terrain.pattern === 'dots') {
            this.drawDotsPattern(ctx, cell, brightness);
            return;
        }
        if (terrain.pattern === 'lines') {
            this.drawLinesPattern(ctx, cell, brightness);
            return;
        }
        if (terrain.pattern === 'cross') {
            this.drawCrossPattern(ctx, cell, brightness);
            return;
        }
        if (terrain.pattern === 'waves') {
            this.drawWavePattern(ctx, cell, brightness, terrain.seed);
            return;
        }
        if (terrain.pattern === 'dunes') {
            this.drawDunePattern(ctx, cell, brightness);
            return;
        }
        if (terrain.pattern === 'groves') {
            this.drawGrovesPattern(ctx, cell, brightness, terrain.seed);
            return;
        }
        if (terrain.pattern === 'ridges') {
            this.drawRidgesPattern(ctx, cell, brightness);
        }
    }

    private drawTerrainIcon(ctx: CanvasRenderingContext2D, cell: GridCell, type: TerrainType, brightness: number): void {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.18 * brightness);
        if (type === 'mountain') {
            this.drawMountain(ctx, centerX, centerY, cell.width);
        } else if (type === 'forest') {
            this.drawForest(ctx, centerX, centerY, cell.width);
        } else if (type === 'water') {
            this.drawWater(ctx, centerX, centerY, cell.width);
        } else if (type === 'desert') {
            this.drawDesert(ctx, centerX, centerY, cell.width);
        }
    }

    private drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.moveTo(x - (7 * scale), y + (6 * scale));
        ctx.lineTo(x, y - (8 * scale));
        ctx.lineTo(x + (7 * scale), y + (6 * scale));
        ctx.closePath();
        ctx.fill();
    }

    private drawForest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.arc(x, y - (1 * scale), 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - (1.2 * scale), y + (4 * scale), 2.4 * scale, 5 * scale);
    }

    private drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.fillRect(x - (7 * scale), y - (1 * scale), 14 * scale, 2 * scale);
        ctx.fillRect(x - (5 * scale), y + (3 * scale), 10 * scale, 2 * scale);
    }

    private drawDesert(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.arc(x - (3 * scale), y + (1 * scale), 4 * scale, Math.PI, Math.PI * 2);
        ctx.arc(x + (3 * scale), y + (1 * scale), 4 * scale, Math.PI, Math.PI * 2);
        ctx.fill();
    }

    private drawDotsPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.fillStyle = this.withAlpha(theme.ui.primaryAccent, 0.08 * brightness);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const x = cell.x + ((i + 1) * cell.width / 4);
                const y = cell.y + ((j + 1) * cell.height / 4);
                ctx.beginPath();
                ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawLinesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.12 * brightness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 5; i++) {
            const x = cell.x + ((i * cell.width) / 5);
            ctx.moveTo(x, cell.y + 3);
            ctx.lineTo(x, cell.y + cell.height - 3);
        }
        ctx.stroke();
    }

    private drawCrossPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.12 * brightness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cell.x + 2, centerY);
        ctx.lineTo(cell.x + cell.width - 2, centerY);
        ctx.moveTo(centerX, cell.y + 2);
        ctx.lineTo(centerX, cell.y + cell.height - 2);
        ctx.stroke();
    }

    private drawWavePattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number, seed: number): void {
        ctx.strokeStyle = this.withAlpha(theme.ui.panelHighlight, 0.18 * brightness);
        for (let row = 0; row < 3; row++) {
            const y = cell.y + (cell.height * (0.25 + (row * 0.22)));
            ctx.beginPath();
            for (let step = 0; step <= 6; step++) {
                const t = step / 6;
                const x = cell.x + (t * cell.width);
                const wave = Math.sin((t * Math.PI * 2) + (seed * 0.001) + row) * (cell.height * 0.04);
                if (step === 0) {
                    ctx.moveTo(x, y + wave);
                } else {
                    ctx.lineTo(x, y + wave);
                }
            }
            ctx.stroke();
        }
    }

    private drawDunePattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.1 * brightness);
        for (let row = 0; row < 3; row++) {
            const y = cell.y + (cell.height * (0.28 + (row * 0.2)));
            ctx.beginPath();
            ctx.moveTo(cell.x + 4, y);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.35), y - 3, cell.x + (cell.width * 0.65), y + 2);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.82), y + 5, cell.x + cell.width - 4, y + 1);
            ctx.stroke();
        }
    }

    private drawGrovesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number, seed: number): void {
        ctx.fillStyle = this.withAlpha(theme.ui.panelHighlight, 0.14 * brightness);
        for (let index = 0; index < 4; index++) {
            const offsetX = this.seededRandom(seed + index) * (cell.width - 10);
            const offsetY = this.seededRandom(seed + (index * 13)) * (cell.height - 10);
            ctx.beginPath();
            ctx.arc(cell.x + 5 + offsetX, cell.y + 5 + offsetY, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawRidgesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.withAlpha(theme.ui.primaryAccent, 0.16 * brightness);
        for (let index = 0; index < 3; index++) {
            const startX = cell.x + 4 + (index * (cell.width / 4));
            ctx.beginPath();
            ctx.moveTo(startX, cell.y + cell.height - 4);
            ctx.lineTo(startX + (cell.width * 0.14), cell.y + 4);
            ctx.stroke();
        }
    }

    private createTerrainPath(cell: GridCell, neighbors?: TerrainNeighbors): Path2D {
        const inset = Math.max(1, cell.width * 0.03);
        const baseX = cell.x + inset;
        const baseY = cell.y + inset;
        const width = cell.width - (inset * 2);
        const height = cell.height - (inset * 2);
        const radius = Math.max(4, Math.min(theme.worldMap.cellCornerRadius, width * 0.28, height * 0.28));
        const connectorSize = Math.max(3, Math.min(theme.worldMap.connectorRadius, cell.width * 0.32));
        const path = this.createRoundedRectPath(baseX, baseY, width, height, radius);

        if (!neighbors) {
            return path;
        }

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        if (neighbors.north) {
            path.addPath(this.createRoundedRectPath(baseX + (width * 0.16), baseY - connectorSize, width * 0.68, halfHeight + connectorSize, radius * 0.9));
        }
        if (neighbors.south) {
            path.addPath(this.createRoundedRectPath(baseX + (width * 0.16), baseY + halfHeight, width * 0.68, halfHeight + connectorSize, radius * 0.9));
        }
        if (neighbors.west) {
            path.addPath(this.createRoundedRectPath(baseX - connectorSize, baseY + (height * 0.16), halfWidth + connectorSize, height * 0.68, radius * 0.9));
        }
        if (neighbors.east) {
            path.addPath(this.createRoundedRectPath(baseX + halfWidth, baseY + (height * 0.16), halfWidth + connectorSize, height * 0.68, radius * 0.9));
        }

        if (neighbors.north && neighbors.west && neighbors.northWest) {
            path.addPath(this.createRoundedRectPath(baseX - connectorSize * 0.58, baseY - connectorSize * 0.58, halfWidth + connectorSize * 0.58, halfHeight + connectorSize * 0.58, radius));
        }
        if (neighbors.north && neighbors.east && neighbors.northEast) {
            path.addPath(this.createRoundedRectPath(baseX + halfWidth, baseY - connectorSize * 0.58, halfWidth + connectorSize * 0.58, halfHeight + connectorSize * 0.58, radius));
        }
        if (neighbors.south && neighbors.west && neighbors.southWest) {
            path.addPath(this.createRoundedRectPath(baseX - connectorSize * 0.58, baseY + halfHeight, halfWidth + connectorSize * 0.58, halfHeight + connectorSize * 0.58, radius));
        }
        if (neighbors.south && neighbors.east && neighbors.southEast) {
            path.addPath(this.createRoundedRectPath(baseX + halfWidth, baseY + halfHeight, halfWidth + connectorSize * 0.58, halfHeight + connectorSize * 0.58, radius));
        }

        this.addDiagonalRibbon(path, baseX, baseY, width, height, 'northWest', neighbors.northWest && !neighbors.north && !neighbors.west);
        this.addDiagonalRibbon(path, baseX, baseY, width, height, 'northEast', neighbors.northEast && !neighbors.north && !neighbors.east);
        this.addDiagonalRibbon(path, baseX, baseY, width, height, 'southWest', neighbors.southWest && !neighbors.south && !neighbors.west);
        this.addDiagonalRibbon(path, baseX, baseY, width, height, 'southEast', neighbors.southEast && !neighbors.south && !neighbors.east);

        return path;
    }

    private addDiagonalRibbon(path: Path2D, x: number, y: number, width: number, height: number, corner: 'northWest' | 'northEast' | 'southWest' | 'southEast', active: boolean): void {
        if (!active) {
            return;
        }

        path.addPath(this.createDiagonalRibbonPath(x, y, width, height, corner));
    }

    private createDiagonalRibbonPath(x: number, y: number, width: number, height: number, corner: 'northWest' | 'northEast' | 'southWest' | 'southEast'): Path2D {
        const ribbon = new Path2D();
        const cornerPoints = {
            northWest: {
                start: [x + (width * 0.48), y + (height * 0.26)],
                tip: [x + (width * 0.08), y + (height * 0.08)],
                end: [x + (width * 0.26), y + (height * 0.48)],
                leftControl: [x + (width * 0.24), y + (height * 0.18)],
                rightControl: [x + (width * 0.18), y + (height * 0.24)],
                centerControl: [x + (width * 0.38), y + (height * 0.38)],
            },
            northEast: {
                start: [x + (width * 0.52), y + (height * 0.26)],
                tip: [x + (width * 0.92), y + (height * 0.08)],
                end: [x + (width * 0.74), y + (height * 0.48)],
                leftControl: [x + (width * 0.76), y + (height * 0.18)],
                rightControl: [x + (width * 0.82), y + (height * 0.24)],
                centerControl: [x + (width * 0.62), y + (height * 0.38)],
            },
            southWest: {
                start: [x + (width * 0.26), y + (height * 0.52)],
                tip: [x + (width * 0.08), y + (height * 0.92)],
                end: [x + (width * 0.48), y + (height * 0.74)],
                leftControl: [x + (width * 0.18), y + (height * 0.76)],
                rightControl: [x + (width * 0.24), y + (height * 0.82)],
                centerControl: [x + (width * 0.38), y + (height * 0.62)],
            },
            southEast: {
                start: [x + (width * 0.74), y + (height * 0.52)],
                tip: [x + (width * 0.92), y + (height * 0.92)],
                end: [x + (width * 0.52), y + (height * 0.74)],
                leftControl: [x + (width * 0.82), y + (height * 0.76)],
                rightControl: [x + (width * 0.76), y + (height * 0.82)],
                centerControl: [x + (width * 0.62), y + (height * 0.62)],
            },
        }[corner];

        ribbon.moveTo(cornerPoints.start[0], cornerPoints.start[1]);
        ribbon.quadraticCurveTo(cornerPoints.leftControl[0], cornerPoints.leftControl[1], cornerPoints.tip[0], cornerPoints.tip[1]);
        ribbon.quadraticCurveTo(cornerPoints.rightControl[0], cornerPoints.rightControl[1], cornerPoints.end[0], cornerPoints.end[1]);
        ribbon.quadraticCurveTo(cornerPoints.centerControl[0], cornerPoints.centerControl[1], cornerPoints.start[0], cornerPoints.start[1]);
        ribbon.closePath();
        return ribbon;
    }

    private createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): Path2D {
        const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
        const path = new Path2D();
        path.moveTo(x + safeRadius, y);
        path.lineTo(x + width - safeRadius, y);
        path.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        path.lineTo(x + width, y + height - safeRadius);
        path.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        path.lineTo(x + safeRadius, y + height);
        path.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        path.lineTo(x, y + safeRadius);
        path.quadraticCurveTo(x, y, x + safeRadius, y);
        path.closePath();
        return path;
    }

    private adjustColorBrightness(color: string, brightness: number): string {
        const hex = color.replace('#', '');
        const red = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * brightness));
        const green = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * brightness));
        const blue = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * brightness));
        const redHex = red.toString(16).padStart(2, '0');
        const greenHex = green.toString(16).padStart(2, '0');
        const blueHex = blue.toString(16).padStart(2, '0');
        return `#${redHex}${greenHex}${blueHex}`;
    }

    private withAlpha(hexColor: string, alpha: number): string {
        if (hexColor.startsWith('rgba')) {
            return hexColor.replace(/rgba\(([^)]+),\s*[^)]+\)/, (_match, channels) => `rgba(${channels}, ${alpha})`);
        }

        if (hexColor.startsWith('rgb')) {
            const matches = hexColor.match(/\d+/g) ?? ['0', '0', '0'];
            const [r, g, b] = matches;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const a = this.parseColor(colorA);
        const b = this.parseColor(colorB);
        const t = Math.max(0, Math.min(1, ratio));
        const r = Math.round((a.r * (1 - t)) + (b.r * t));
        const g = Math.round((a.g * (1 - t)) + (b.g * t));
        const blue = Math.round((a.b * (1 - t)) + (b.b * t));
        return `rgb(${r}, ${g}, ${blue})`;
    }

    private parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('rgb')) {
            const [r = '0', g = '0', b = '0'] = color.match(/\d+/g) ?? [];
            return { r: Number(r), g: Number(g), b: Number(b) };
        }

        const hex = color.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    }

    private seededRandom(seed: number): number {
        const value = Math.sin(seed * 0.001 + 1.123) * 43758.5453;
        return value - Math.floor(value);
    }
}
