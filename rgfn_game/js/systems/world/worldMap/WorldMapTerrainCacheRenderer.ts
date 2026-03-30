// @ts-nocheck
import WorldMapFocusAndFogOverlay from './WorldMapFocusAndFogOverlay.js';
import { FOG_STATE } from './WorldMapCore.js';
export default class WorldMapTerrainCacheRenderer extends WorldMapFocusAndFogOverlay {
    private drawTerrainLayerFromCache(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'low' | 'medium',
    ): boolean {
        if (typeof document === 'undefined' || typeof (ctx as CanvasRenderingContext2D & { drawImage?: unknown }).drawImage !== 'function') {
            return false;
        }

        const cellSize = this.grid.cellSize;
        const cacheWidth = this.grid.columns * cellSize;
        const cacheHeight = this.grid.rows * cellSize;
        const existing = this.terrainLayerCaches[detailLevel];
        const shouldRebuild = !existing
            || existing.detailLevel !== detailLevel
            || existing.cellSize !== cellSize
            || existing.terrainRevision !== this.terrainRevision;

        if (shouldRebuild) {
            const cacheCanvas = document.createElement('canvas');
            cacheCanvas.width = Math.max(1, Math.floor(cacheWidth));
            cacheCanvas.height = Math.max(1, Math.floor(cacheHeight));
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
}
