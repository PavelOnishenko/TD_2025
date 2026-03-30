// @ts-nocheck
import WorldMapCore from './WorldMapCore.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
export default class WorldMapTerrainModeling extends WorldMapCore {
    private generateTerrain(): void {
        this.terrainRevision += 1;
        const dims = this.grid.getDimensions();
        const climates: ClimateCell[] = [];

        for (let row = 0; row < dims.rows; row += 1) {
            for (let col = 0; col < dims.columns; col += 1) {
                climates.push(this.createClimateCell(col, row, dims.columns, dims.rows));
            }
        }

        const climateByKey = new Map(climates.map((climate) => [this.getCellKey(climate.col, climate.row), climate]));
        const lakeCells = this.generateLakeCells(climateByKey, dims.columns, dims.rows);
        const riverCells = this.generateRiverCells(climateByKey, dims.columns, dims.rows);
        const forestTarget = this.getForestCoverageTarget();
        const forestThreshold = this.getQuantileThreshold(
            climates.filter((climate) => !lakeCells.has(this.getCellKey(climate.col, climate.row)) && !riverCells.has(this.getCellKey(climate.col, climate.row))),
            (climate) => climate.forestSuitability,
            forestTarget,
        );

        this.terrainData.clear();
        this.terrainByIndex = new Array(dims.columns * dims.rows);
        climates.forEach((climate) => {
            const key = this.getCellKey(climate.col, climate.row);
            const type = this.resolveTerrainType(climate, forestThreshold, lakeCells.has(key), riverCells.has(key));
            const terrain = {
                type,
                color: this.getTerrainColor(type),
                pattern: this.generateTerrainPattern(type, climate.seed),
                elevation: climate.elevation,
                moisture: climate.moisture,
                heat: climate.heat,
                seed: climate.seed,
            };
            this.terrainData.set(key, terrain);
            this.terrainByIndex[this.getCellIndex(climate.col, climate.row)] = terrain;
        });
    }

    private createClimateCell(col: number, row: number, columns: number, rows: number): ClimateCell {
        const nx = columns <= 1 ? 0 : col / (columns - 1);
        const ny = rows <= 1 ? 0 : row / (rows - 1);
        const seed = this.hashSeed((col + 1) * 92837111, (row + 1) * 689287499);
        const weights = balanceConfig.worldMap.terrainWeights;

        const elevationNoise = this.fractalNoise(nx * 1.4, ny * 1.4, 4, 0.52, 2.05);
        const moistureNoise = this.fractalNoise((nx + 17.2) * 1.72, (ny - 5.4) * 1.72, 4, 0.56, 2.1);
        const heatNoise = this.fractalNoise((nx - 8.1) * 1.28, (ny + 13.7) * 1.28, 3, 0.5, 2.15);
        const forestNoise = this.fractalNoise((nx + 3.4) * 2.15, (ny + 7.9) * 2.15, 3, 0.58, 2.0);
        const waterNoise = this.fractalNoise((nx + 11.8) * 2.4, (ny - 6.6) * 2.4, 2, 0.6, 2.0);

        const elevation = this.clamp01((elevationNoise * 0.85) + (forestNoise * 0.08));
        const moisture = this.clamp01((moistureNoise * 0.76) + ((1 - elevation) * 0.16) + (waterNoise * 0.08));
        const temperateBand = 1 - Math.min(1, Math.abs((ny - 0.5) * 1.15));
        const heat = this.clamp01((heatNoise * 0.44) + (temperateBand * 0.28) + ((1 - moisture) * 0.28));
        const waterLowlands = this.clamp01((1 - elevation) * 0.7 + (moisture * 0.3));

        return {
            col,
            row,
            seed,
            elevation,
            moisture,
            heat,
            forestSuitability: (weights.forest * 1.4) + (moisture * 0.9) + (forestNoise * 0.55) + (temperateBand * 0.22),
            grassSuitability: (weights.grass * 1.2) + ((1 - Math.abs(moisture - 0.52)) * 0.58) + (temperateBand * 0.22) + ((1 - elevation) * 0.1),
            inlandWaterSuitability: (weights.water * 1.35) + (waterLowlands * 1.1) + (waterNoise * 0.3),
        };
    }

    private getForestCoverageTarget(): number {
        const configuredRange = balanceConfig.worldMap.forestCoverage ?? { min: 0.3, max: 0.6 };
        const min = this.clamp01(Math.min(configuredRange.min, configuredRange.max));
        const max = this.clamp01(Math.max(configuredRange.min, configuredRange.max));
        return min + ((max - min) * this.seededValue('forest-coverage', 0));
    }

    private resolveTerrainType(climate: ClimateCell, forestThreshold: number, isLake: boolean, isRiver: boolean): TerrainType {
        const highlandThreshold = balanceConfig.worldMap.highlandThreshold ?? 0.86;
        const inlandWaterThreshold = balanceConfig.worldMap.inlandWaterThreshold ?? 0.79;

        if (isLake || isRiver) {
            return 'water';
        }
        if (climate.forestSuitability >= forestThreshold) {
            return 'forest';
        }
        if (climate.elevation >= highlandThreshold && climate.moisture >= 0.48) {
            return 'forest';
        }
        if (climate.inlandWaterSuitability >= inlandWaterThreshold && climate.elevation < highlandThreshold - 0.08) {
            return 'water';
        }
        return 'grass';
    }

    private generateLakeCells(climateByKey: Map<string, ClimateCell>, columns: number, rows: number): Set<string> {
        const lakeConfig = balanceConfig.worldMap.lakes ?? { count: 7, minRadius: 2, maxRadius: 5, jitter: 0.38 };
        const cells = new Set<string>();
        const attempts = Math.max(lakeConfig.count * 10, 12);
        let created = 0;

        for (let attempt = 0; attempt < attempts && created < lakeConfig.count; attempt += 1) {
            const col = 2 + this.seededInt(Math.max(1, columns - 4), this.seededValue('lake-col', attempt));
            const row = 2 + this.seededInt(Math.max(1, rows - 4), this.seededValue('lake-row', attempt));
            const climate = climateByKey.get(this.getCellKey(col, row));
            if (!climate || climate.elevation > 0.62) {
                continue;
            }

            const minRadius = Math.max(1, lakeConfig.minRadius ?? 2);
            const maxRadius = Math.max(minRadius, lakeConfig.maxRadius ?? 5);
            const radius = minRadius + Math.floor(this.seededValue('lake-radius', attempt) * ((maxRadius - minRadius) + 1));
            const jitter = lakeConfig.jitter ?? 0.38;

            for (let y = row - radius - 1; y <= row + radius + 1; y += 1) {
                for (let x = col - radius - 1; x <= col + radius + 1; x += 1) {
                    if (!this.grid.isValidPosition(x, y)) {
                        continue;
                    }

                    const dx = x - col;
                    const dy = y - row;
                    const distance = Math.sqrt((dx * dx) + (dy * dy));
                    const ripple = this.seededRandom(this.hashSeed(x * 101, y * 313, attempt * 997));
                    const edge = radius + ((ripple - 0.5) * jitter * radius);
                    if (distance <= edge) {
                        cells.add(this.getCellKey(x, y));
                    }
                }
            }

            created += 1;
        }

        return cells;
    }

}
