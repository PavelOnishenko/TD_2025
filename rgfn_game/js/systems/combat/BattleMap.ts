import GridMap from '../../utils/GridMap.js';
import { CombatEntity, Direction, GridPosition, SelectedBattleCellInfo, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import BattleMapView, { BattleObstacle, BattleObstacleKind } from './BattleMapView.js';

const CARDINAL_STEPS: GridPosition[] = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
];

type PathOptions = {
    ignoreEntity?: CombatEntity | null;
    allowDestinationOccupied?: boolean;
};

type TerrainObstacleProfile = {
    min: number;
    max: number;
    kinds: BattleObstacleKind[];
};

export default class BattleMap {
    private readonly grid: GridMap;
    private readonly view: BattleMapView;
    private entities: CombatEntity[];
    private terrainType: TerrainType;
    private obstacles: Map<string, BattleObstacle>;
    private selectedGridPos: GridPosition | null;

    constructor() {
        this.grid = new GridMap(theme.battleMap.gridSize.columns, theme.battleMap.gridSize.rows, 48);
        this.terrainType = 'grass';
        this.obstacles = new Map();
        this.selectedGridPos = null;
        this.view = new BattleMapView(this.grid, () => this.terrainType, () => this.getObstacles());
        this.entities = [];
    }

    public setup(player: CombatEntity, enemies: CombatEntity[], terrainType: TerrainType = 'grass'): void {
        this.entities = [];
        this.terrainType = terrainType;
        const playerSpawn = this.getPlayerSpawnPosition();
        const enemySpawns = this.getEnemySpawnPositions(enemies.length);
        this.generateObstacles(playerSpawn, enemySpawns);
        this.placeEntity(player, playerSpawn.col, playerSpawn.row);
        enemies.forEach((enemy, index) => this.placeEntity(enemy, enemySpawns[index].col, enemySpawns[index].row));
    }

    public isInMeleeRange(attacker: CombatEntity, target: CombatEntity): boolean {
        const source = this.getEntityGridPosition(attacker);
        const destination = this.getEntityGridPosition(target);
        return this.grid.areAdjacent(source.col, source.row, destination.col, destination.row);
    }

    public isInAttackRange(attacker: CombatEntity, target: CombatEntity, range: number): boolean {
        const source = this.getEntityGridPosition(attacker);
        const destination = this.getEntityGridPosition(target);
        const distance = this.getPathDistance(source, destination, {
            ignoreEntity: attacker,
            allowDestinationOccupied: true,
        });
        return distance !== null && distance <= range;
    }

    public moveEntityToward(entity: CombatEntity, targetEntity: CombatEntity, desiredRange: number = 1): boolean {
        const source = this.getEntityGridPosition(entity);
        const target = this.getEntityGridPosition(targetEntity);
        const nextStep = this.findNextStepTowardRange(source, target, entity, desiredRange);
        if (!nextStep) {
            return false;
        }
        return this.tryMove(entity, nextStep.col, nextStep.row);
    }

    public moveEntity(entity: CombatEntity, direction: Direction): boolean {
        const source = this.getEntityGridPosition(entity);
        const next = this.getDirectionalStep(source, direction);
        return this.tryMove(entity, next.col, next.row);
    }

    public resizeToCanvas(canvasWidth: number, canvasHeight: number): void {
        const { columns, rows } = this.grid.getDimensions();
        const nextCellSize = Math.max(1, Math.floor(Math.min(canvasWidth / columns, canvasHeight / rows)));
        const mapWidth = columns * nextCellSize;
        const mapHeight = rows * nextCellSize;
        const offsetX = Math.floor((canvasWidth - mapWidth) / 2);
        const offsetY = Math.floor((canvasHeight - mapHeight) / 2);
        this.grid.updateLayout(nextCellSize, offsetX, offsetY);
        this.entities.forEach((entity) => {
            if (entity.gridCol === undefined || entity.gridRow === undefined) {
                return;
            }
            const [x, y] = this.grid.gridToPixel(entity.gridCol, entity.gridRow);
            entity.x = x;
            entity.y = y;
        });
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        _renderer: unknown,
        currentEntity: CombatEntity | null = null,
        selectedEnemy: CombatEntity | null = null,
    ): void {
        this.view.draw(ctx, currentEntity, selectedEnemy, this.selectedGridPos);
    }

    public updateSelectedCellFromPixel(pixelX: number, pixelY: number): boolean {
        const [col, row] = this.grid.pixelToGrid(pixelX, pixelY);
        if (!this.grid.isValidPosition(col, row)) {
            this.selectedGridPos = null;
            return false;
        }

        this.selectedGridPos = { col, row };
        return true;
    }

    public clearSelectedCell(): void {
        this.selectedGridPos = null;
    }

    public getSelectedCellInfo(): SelectedBattleCellInfo | null {
        if (!this.selectedGridPos) {
            return null;
        }

        const obstacle = this.obstacles.get(this.getCellKey(this.selectedGridPos.col, this.selectedGridPos.row));
        const occupant = this.entities.find((entity) => entity.gridCol === this.selectedGridPos?.col && entity.gridRow === this.selectedGridPos?.row && !entity.isDead()) ?? null;
        const occupantType = occupant ? (occupant.constructor.name === 'Player' ? 'player' : 'enemy') : null;
        const occupantName = this.getOccupantDisplayName(occupant);

        return {
            mode: 'battle',
            col: this.selectedGridPos.col,
            row: this.selectedGridPos.row,
            terrainType: this.terrainType,
            obstacleName: obstacle ? this.formatObstacleName(obstacle.kind) : null,
            isTraversable: !obstacle && occupant === null,
            occupantType,
            occupantName,
            occupantHp: occupant?.hp ?? null,
            occupantMaxHp: occupant?.maxHp ?? null,
        };
    }

    private getOccupantDisplayName(occupant: CombatEntity | null): string | null {
        if (!occupant) {
            return null;
        }

        if (occupant.constructor.name === 'Player') {
            return 'Hero';
        }

        const maybeNamedOccupant = occupant as CombatEntity & { name?: unknown };
        if (typeof maybeNamedOccupant.name === 'string' && maybeNamedOccupant.name.trim().length > 0) {
            return maybeNamedOccupant.name;
        }

        return occupant.constructor?.name ?? null;
    }

    public isEntityOnEdge(entity: CombatEntity): boolean {
        const col = entity.gridCol;
        const row = entity.gridRow;

        if (col === undefined || row === undefined) {
            return false;
        }

        const lastCol = this.grid.columns - 1;
        const lastRow = this.grid.rows - 1;

        return col === 0 || col === lastCol || row === 0 || row === lastRow;
    }

    public isObstacle(col: number, row: number): boolean {
        return this.obstacles.has(this.getCellKey(col, row));
    }

    public getObstacles(): BattleObstacle[] {
        return Array.from(this.obstacles.values());
    }

    private getPlayerSpawnPosition(): GridPosition {
        return {
            col: Math.floor(this.grid.columns / 2),
            row: this.grid.rows - 2,
        };
    }

    private getEnemySpawnPositions(enemyCount: number): GridPosition[] {
        const clampedCount = Math.max(1, enemyCount);
        const spacing = 2;
        const formationWidth = Math.max(1, ((clampedCount - 1) * spacing) + 1);
        const startCol = Math.max(1, Math.floor((this.grid.columns - formationWidth) / 2));
        const row = 1;
        const positions: GridPosition[] = [];
        for (let index = 0; index < clampedCount; index++) {
            const col = Math.min(this.grid.columns - 2, startCol + (index * spacing));
            positions.push({ col, row });
        }
        return positions;
    }

    private generateObstacles(playerSpawn: GridPosition, enemySpawns: GridPosition[]): void {
        this.obstacles.clear();
        const profile = this.getObstacleProfile(this.terrainType);
        const reserved = this.buildReservedCells(playerSpawn, enemySpawns);
        const candidates = this.getObstacleCandidates(reserved);
        const targetCount = Math.min(candidates.length, this.randomInt(profile.min, profile.max));

        for (const candidate of this.shuffle(candidates)) {
            if (this.obstacles.size >= targetCount) {
                break;
            }

            const key = this.getCellKey(candidate.col, candidate.row);
            if (reserved.has(key)) {
                continue;
            }

            if (this.countAdjacentObstacles(candidate.col, candidate.row) > 1) {
                continue;
            }

            const obstacle: BattleObstacle = {
                col: candidate.col,
                row: candidate.row,
                kind: profile.kinds[this.randomInt(0, profile.kinds.length - 1)],
            };
            this.obstacles.set(key, obstacle);

            if (!this.isWalkableArenaConnected() || !this.allEnemiesHaveMeleeLane(playerSpawn, enemySpawns)) {
                this.obstacles.delete(key);
            }
        }
    }

    private getObstacleProfile(terrainType: TerrainType): TerrainObstacleProfile {
        if (terrainType === 'forest') {
            return { min: 14, max: 24, kinds: ['tree', 'bush', 'stump'] };
        }
        if (terrainType === 'mountain') {
            return { min: 12, max: 20, kinds: ['rock', 'pillar'] };
        }
        if (terrainType === 'desert') {
            return { min: 8, max: 15, kinds: ['cactus', 'rock', 'bones'] };
        }
        if (terrainType === 'water') {
            return { min: 10, max: 18, kinds: ['reed', 'stone', 'driftwood'] };
        }
        return { min: 9, max: 16, kinds: ['bush', 'rock', 'stump'] };
    }

    private buildReservedCells(playerSpawn: GridPosition, enemySpawns: GridPosition[]): Set<string> {
        const reserved = new Set<string>();
        const centerCol = Math.floor(this.grid.columns / 2);

        for (let row = 0; row < this.grid.rows; row++) {
            for (let delta = -1; delta <= 1; delta++) {
                const col = centerCol + delta;
                if (this.grid.isValidPosition(col, row)) {
                    reserved.add(this.getCellKey(col, row));
                }
            }
        }

        reserved.add(this.getCellKey(playerSpawn.col, playerSpawn.row));
        enemySpawns.forEach((spawn) => {
            reserved.add(this.getCellKey(spawn.col, spawn.row));
            CARDINAL_STEPS.forEach((step) => {
                const nextCol = spawn.col + step.col;
                const nextRow = spawn.row + step.row;
                if (this.grid.isValidPosition(nextCol, nextRow)) {
                    reserved.add(this.getCellKey(nextCol, nextRow));
                }
            });
        });

        return reserved;
    }

    private getObstacleCandidates(reserved: Set<string>): GridPosition[] {
        const candidates: GridPosition[] = [];
        for (let row = 1; row < this.grid.rows - 1; row++) {
            for (let col = 1; col < this.grid.columns - 1; col++) {
                const key = this.getCellKey(col, row);
                if (reserved.has(key)) {
                    continue;
                }
                candidates.push({ col, row });
            }
        }
        return candidates;
    }

    private allEnemiesHaveMeleeLane(playerSpawn: GridPosition, enemySpawns: GridPosition[]): boolean {
        return enemySpawns.every((spawn) => {
            const reachableAdjacentCells = CARDINAL_STEPS
                .map((step) => ({ col: spawn.col + step.col, row: spawn.row + step.row }))
                .filter((candidate) => this.grid.isValidPosition(candidate.col, candidate.row) && !this.isObstacle(candidate.col, candidate.row));

            return reachableAdjacentCells.some((candidate) => this.findPath(playerSpawn, candidate, {
                allowDestinationOccupied: false,
            }) !== null);
        });
    }

    private isWalkableArenaConnected(): boolean {
        const walkableCells: GridPosition[] = [];
        this.grid.forEachCell((_cell, col, row) => {
            if (!this.isObstacle(col, row)) {
                walkableCells.push({ col, row });
            }
        });

        if (walkableCells.length === 0) {
            return true;
        }

        const visited = new Set<string>();
        const queue: GridPosition[] = [walkableCells[0]];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const key = this.getCellKey(current.col, current.row);
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);

            CARDINAL_STEPS.forEach((step) => {
                const nextCol = current.col + step.col;
                const nextRow = current.row + step.row;
                const nextKey = this.getCellKey(nextCol, nextRow);
                if (!this.grid.isValidPosition(nextCol, nextRow) || this.isObstacle(nextCol, nextRow) || visited.has(nextKey)) {
                    return;
                }
                queue.push({ col: nextCol, row: nextRow });
            });
        }

        return visited.size === walkableCells.length;
    }

    private countAdjacentObstacles(col: number, row: number): number {
        return CARDINAL_STEPS.reduce((count, step) => count + (this.isObstacle(col + step.col, row + step.row) ? 1 : 0), 0);
    }

    private placeEntity(entity: CombatEntity, col: number, row: number): void {
        entity.gridCol = col;
        entity.gridRow = row;
        const [x, y] = this.grid.gridToPixel(col, row);
        entity.x = x;
        entity.y = y;
        this.entities.push(entity);
    }

    private getEntityGridPosition(entity: CombatEntity): GridPosition {
        return { col: entity.gridCol ?? 0, row: entity.gridRow ?? 0 };
    }

    private getDirectionalStep(source: GridPosition, direction: Direction): GridPosition {
        if (direction === 'up') {
            return { col: source.col, row: source.row - 1 };
        }
        if (direction === 'down') {
            return { col: source.col, row: source.row + 1 };
        }
        if (direction === 'left') {
            return { col: source.col - 1, row: source.row };
        }
        return { col: source.col + 1, row: source.row };
    }

    private tryMove(entity: CombatEntity, col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }
        if (this.isObstacle(col, row) || this.isOccupiedByLivingEntity(entity, col, row)) {
            return false;
        }
        this.placeEntityAtCurrentGridPosition(entity, col, row);
        return true;
    }

    private isOccupiedByLivingEntity(entity: CombatEntity, col: number, row: number): boolean {
        return this.entities.some((currentEntity) => {
            const isSameEntity = currentEntity === entity;
            const sharesGridPosition = currentEntity.gridCol === col && currentEntity.gridRow === row;
            return !isSameEntity && sharesGridPosition && !currentEntity.isDead();
        });
    }

    private placeEntityAtCurrentGridPosition(entity: CombatEntity, col: number, row: number): void {
        entity.gridCol = col;
        entity.gridRow = row;
        const [x, y] = this.grid.gridToPixel(col, row);
        entity.x = x;
        entity.y = y;
    }

    private findNextStepTowardRange(source: GridPosition, target: GridPosition, entity: CombatEntity, desiredRange: number): GridPosition | null {
        const candidateTargets: Array<{ goal: GridPosition; path: GridPosition[] }> = [];
        this.grid.forEachCell((_cell, col, row) => {
            if (this.isObstacle(col, row)) {
                return;
            }

            const distanceToTarget = Math.abs(target.col - col) + Math.abs(target.row - row);
            if (distanceToTarget > desiredRange) {
                return;
            }
            if ((col !== source.col || row !== source.row) && this.isOccupiedByLivingEntity(entity, col, row)) {
                return;
            }

            const path = this.findPath(source, { col, row }, {
                ignoreEntity: entity,
                allowDestinationOccupied: false,
            });
            if (path && path.length > 1) {
                candidateTargets.push({ goal: { col, row }, path });
            }
        });

        if (candidateTargets.length === 0) {
            return null;
        }

        candidateTargets.sort((left, right) => {
            if (left.path.length !== right.path.length) {
                return left.path.length - right.path.length;
            }
            const leftDistance = Math.abs(left.goal.col - target.col) + Math.abs(left.goal.row - target.row);
            const rightDistance = Math.abs(right.goal.col - target.col) + Math.abs(right.goal.row - target.row);
            return leftDistance - rightDistance;
        });

        return candidateTargets[0].path[1] ?? null;
    }

    private getPathDistance(start: GridPosition, end: GridPosition, options: PathOptions): number | null {
        const path = this.findPath(start, end, options);
        return path ? path.length - 1 : null;
    }

    private findPath(start: GridPosition, end: GridPosition, options: PathOptions = {}): GridPosition[] | null {
        if (!this.grid.isValidPosition(start.col, start.row) || !this.grid.isValidPosition(end.col, end.row)) {
            return null;
        }

        const queue: GridPosition[] = [start];
        const visited = new Set<string>([this.getCellKey(start.col, start.row)]);
        const cameFrom = new Map<string, string | null>();
        cameFrom.set(this.getCellKey(start.col, start.row), null);

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.col === end.col && current.row === end.row) {
                return this.reconstructPath(cameFrom, current);
            }

            CARDINAL_STEPS.forEach((step) => {
                const nextCol = current.col + step.col;
                const nextRow = current.row + step.row;
                const nextKey = this.getCellKey(nextCol, nextRow);
                if (visited.has(nextKey) || !this.grid.isValidPosition(nextCol, nextRow)) {
                    return;
                }

                const destinationCell = nextCol === end.col && nextRow === end.row;
                const blockedByEntity = this.entities.some((candidate) => {
                    if (candidate === options.ignoreEntity || candidate.isDead()) {
                        return false;
                    }
                    if (options.allowDestinationOccupied && destinationCell) {
                        return false;
                    }
                    return candidate.gridCol === nextCol && candidate.gridRow === nextRow;
                });

                if (this.isObstacle(nextCol, nextRow) || blockedByEntity) {
                    return;
                }

                visited.add(nextKey);
                cameFrom.set(nextKey, this.getCellKey(current.col, current.row));
                queue.push({ col: nextCol, row: nextRow });
            });
        }

        return null;
    }

    private reconstructPath(cameFrom: Map<string, string | null>, end: GridPosition): GridPosition[] {
        const path: GridPosition[] = [];
        let currentKey: string | null = this.getCellKey(end.col, end.row);
        while (currentKey) {
            const [colText, rowText] = currentKey.split(',');
            path.push({ col: Number(colText), row: Number(rowText) });
            currentKey = cameFrom.get(currentKey) ?? null;
        }
        return path.reverse();
    }

    private getCellKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private shuffle<T>(items: T[]): T[] {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index--) {
            const target = this.randomInt(0, index);
            const current = result[index];
            result[index] = result[target];
            result[target] = current;
        }
        return result;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * ((max - min) + 1)) + min;
    }

    private formatObstacleName(kind: BattleObstacleKind): string {
        return kind.charAt(0).toUpperCase() + kind.slice(1);
    }
}
