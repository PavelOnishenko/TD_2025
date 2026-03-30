// @ts-nocheck
import WorldMapFocusAndFogOverlay from './WorldMapFocusAndFogOverlay.js';
import { FOG_STATE } from '../WorldMapCore.js';
export default class WorldMapTerrainCacheRenderer extends WorldMapFocusAndFogOverlay {
    private drawTerrainLayerFromCache(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'low' | 'medium',
    ): boolean {
        if (!this.supportsTerrainLayerCaching(ctx)) {
            return false;
        }

        const cellSize = this.grid.cellSize;
        if (this.shouldRebuildTerrainLayerCache(detailLevel, cellSize)) {
            if (!this.rebuildTerrainLayerCache(detailLevel, cellSize)) {
                return false;
            }
        }

        const activeCache = this.terrainLayerCaches[detailLevel];
        if (!activeCache) {
            return false;
        }

        const sourceX = bounds.startCol * cellSize;
        const sourceY = bounds.startRow * cellSize;
        const sourceWidth = Math.max(1, (bounds.endCol - bounds.startCol + 1) * cellSize);
        const sourceHeight = Math.max(1, (bounds.endRow - bounds.startRow + 1) * cellSize);
        const destinationX = this.grid.offsetX + sourceX;
        const destinationY = this.grid.offsetY + sourceY;

        ctx.drawImage(
            activeCache.canvas,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            destinationX,
            destinationY,
            sourceWidth,
            sourceHeight,
        );
        return true;
    }

    private supportsTerrainLayerCaching = (ctx: CanvasRenderingContext2D): boolean => typeof document !== 'undefined' && typeof (ctx as CanvasRenderingContext2D & { drawImage?: unknown }).drawImage === 'function';

    private shouldRebuildTerrainLayerCache(detailLevel: 'low' | 'medium', cellSize: number): boolean {
        const existing = this.terrainLayerCaches[detailLevel];
        return !existing
            || existing.detailLevel !== detailLevel
            || existing.cellSize !== cellSize
            || existing.terrainRevision !== this.terrainRevision;
    }

    private rebuildTerrainLayerCache(detailLevel: 'low' | 'medium', cellSize: number): boolean {
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = Math.max(1, Math.floor(this.grid.columns * cellSize));
        cacheCanvas.height = Math.max(1, Math.floor(this.grid.rows * cellSize));
        const cacheCtx = cacheCanvas.getContext('2d');
        if (!cacheCtx) {
            return false;
        }

        for (let row = 0; row < this.grid.rows; row += 1) {
            for (let col = 0; col < this.grid.columns; col += 1) {
                const terrain = this.getTerrain(col, row);
                this.renderer.drawCell(
                    cacheCtx,
                    { col, row, x: col * cellSize, y: row * cellSize, width: cellSize, height: cellSize, data: {} },
                    FOG_STATE.DISCOVERED,
                    terrain,
                    undefined,
                    { showFogOverlay: false, detailLevel },
                );
            }
        }

        this.terrainLayerCaches[detailLevel] = { canvas: cacheCanvas, cellSize, terrainRevision: this.terrainRevision, detailLevel };
        return true;
    }
}
