import GridMap from '../utils/GridMap.js';
import { CombatEntity, Direction } from '../types/game.js';
import BattleMapView from './BattleMapView.js';

export default class BattleMap {
    private readonly grid: GridMap;
    private readonly view: BattleMapView;
    private entities: CombatEntity[];

    constructor() {
        this.grid = new GridMap(10, 8, 48);
        this.view = new BattleMapView(this.grid);
        this.entities = [];
    }

    public setup(player: CombatEntity, enemies: CombatEntity[]): void {
        this.entities = [];
        this.placePlayer(player);
        this.placeEnemies(enemies);
    }

    public isInMeleeRange(attacker: CombatEntity, target: CombatEntity): boolean {
        const source = this.getEntityGridPosition(attacker);
        const destination = this.getEntityGridPosition(target);
        return this.grid.areAdjacent(source.col, source.row, destination.col, destination.row);
    }

    public isInAttackRange(attacker: CombatEntity, target: CombatEntity, range: number): boolean {
        const source = this.getEntityGridPosition(attacker);
        const destination = this.getEntityGridPosition(target);
        const distance = this.grid.getDistance(source.col, source.row, destination.col, destination.row);
        return distance <= range;
    }

    public moveEntityToward(entity: CombatEntity, targetEntity: CombatEntity): boolean {
        const source = this.getEntityGridPosition(entity);
        const target = this.getEntityGridPosition(targetEntity);
        const primaryStep = this.getPrimaryStep(source, target);
        if (this.tryMove(entity, primaryStep.col, primaryStep.row)) {
            return true;
        }
        const alternateStep = this.getAlternateStep(source, target, primaryStep.movesColumnFirst);
        return this.tryMove(entity, alternateStep.col, alternateStep.row);
    }

    public moveEntity(entity: CombatEntity, direction: Direction): boolean {
        const source = this.getEntityGridPosition(entity);
        const next = this.getDirectionalStep(source, direction);
        return this.tryMove(entity, next.col, next.row);
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        _renderer: unknown,
        currentEntity: CombatEntity | null = null,
        selectedEnemy: CombatEntity | null = null
    ): void {
        this.view.draw(ctx, currentEntity, selectedEnemy);
    }

    private placePlayer(player: CombatEntity): void {
        const col = Math.floor(this.grid.columns / 2);
        const row = this.grid.rows - 2;
        this.placeEntity(player, col, row);
    }

    private placeEnemies(enemies: CombatEntity[]): void {
        const startCol = Math.floor((this.grid.columns - enemies.length * 2) / 2);
        enemies.forEach((enemy, index) => {
            this.placeEntity(enemy, startCol + index * 2, 1);
        });
    }

    private placeEntity(entity: CombatEntity, col: number, row: number): void {
        entity.gridCol = col;
        entity.gridRow = row;
        const [x, y] = this.grid.gridToPixel(col, row);
        entity.x = x;
        entity.y = y;
        this.entities.push(entity);
    }

    private getEntityGridPosition(entity: CombatEntity): { col: number; row: number } {
        return { col: entity.gridCol ?? 0, row: entity.gridRow ?? 0 };
    }

    private getPrimaryStep(
        source: { col: number; row: number },
        target: { col: number; row: number }
    ): { col: number; row: number; movesColumnFirst: boolean } {
        const colDiff = target.col - source.col;
        const rowDiff = target.row - source.row;
        const movesColumnFirst = Math.abs(colDiff) > Math.abs(rowDiff);
        if (movesColumnFirst && colDiff !== 0) {
            return { col: source.col + Math.sign(colDiff), row: source.row, movesColumnFirst };
        }
        if (!movesColumnFirst && rowDiff !== 0) {
            return { col: source.col, row: source.row + Math.sign(rowDiff), movesColumnFirst };
        }
        return { col: source.col, row: source.row, movesColumnFirst };
    }

    private getAlternateStep(
        source: { col: number; row: number },
        target: { col: number; row: number },
        primaryMovesColumnFirst: boolean
    ): { col: number; row: number } {
        const colDiff = target.col - source.col;
        const rowDiff = target.row - source.row;
        if (!primaryMovesColumnFirst && colDiff !== 0) {
            return { col: source.col + Math.sign(colDiff), row: source.row };
        }
        if (primaryMovesColumnFirst && rowDiff !== 0) {
            return { col: source.col, row: source.row + Math.sign(rowDiff) };
        }
        return source;
    }

    private getDirectionalStep(source: { col: number; row: number }, direction: Direction): { col: number; row: number } {
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
        if (this.isOccupiedByLivingEntity(entity, col, row)) {
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
}
