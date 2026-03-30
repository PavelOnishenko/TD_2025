import WorldMapTerrainCacheRenderer from './WorldMapTerrainCacheRenderer.js';
export { KnownVillage, WorldVillageDirectionHint } from './WorldMapCore.js';

export default class WorldMap extends WorldMapTerrainCacheRenderer {
    constructor(columns: number, rows: number, cellSize: number) {
        super(columns, rows, cellSize);
        this.initializeWorldMap();
    }
}
