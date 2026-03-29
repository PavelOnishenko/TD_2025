import { CombatEntity } from '../../types/game.js';

export default class TurnManager {
    private entities: CombatEntity[];
    private currentTurnIndex: number;
    private consumedTurnCountsByEntityId: Map<number, number>;
    public waitingForPlayer: boolean;

    constructor() {
        this.entities = [];
        this.currentTurnIndex = 0;
        this.consumedTurnCountsByEntityId = new Map();
        this.waitingForPlayer = false;
    }

    public initializeTurns(entities: CombatEntity[]): void {
        this.entities = entities.filter(e => e.active && !e.isDead());
        this.currentTurnIndex = 0;
        this.consumedTurnCountsByEntityId.clear();
        this.waitingForPlayer = false;
    }

    public getCurrentEntity(): CombatEntity | null {
        if (this.currentTurnIndex >= this.entities.length) {
            return null;
        }
        return this.entities[this.currentTurnIndex];
    }

    public isPlayerTurn(): boolean {
        const current = this.getCurrentEntity();
        return current !== null && current.constructor.name === 'Player';
    }

    public nextTurn(): CombatEntity | null {
        // Remove dead entities
        this.entities = this.entities.filter(e => e.active && !e.isDead());
        this.consumedTurnCountsByEntityId = new Map(
            [...this.consumedTurnCountsByEntityId.entries()]
                .filter(([entityId]) => this.entities.some((entity) => entity.id === entityId))
        );

        if (this.entities.length === 0) {
            return null;
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.entities.length;
        this.waitingForPlayer = this.isPlayerTurn();

        return this.getCurrentEntity();
    }

    public consumeUpcomingTurn(entity: CombatEntity): void {
        this.consumeUpcomingTurns(entity, 1);
    }

    public consumeUpcomingTurns(entity: CombatEntity, turns: number): void {
        if (!entity.active || entity.isDead()) {
            return;
        }

        const turnsToConsume = Number.isFinite(turns) ? Math.max(0, Math.floor(turns)) : 0;
        if (turnsToConsume <= 0) {
            return;
        }

        const alreadyConsumed = this.consumedTurnCountsByEntityId.get(entity.id) ?? 0;
        this.consumedTurnCountsByEntityId.set(entity.id, alreadyConsumed + turnsToConsume);
    }

    public shouldSkipCurrentTurn(): boolean {
        const current = this.getCurrentEntity();
        return current !== null && (this.consumedTurnCountsByEntityId.get(current.id) ?? 0) > 0;
    }

    public clearCurrentTurnConsumption(): void {
        const current = this.getCurrentEntity();
        if (!current) {
            return;
        }

        const remaining = (this.consumedTurnCountsByEntityId.get(current.id) ?? 0) - 1;
        if (remaining > 0) {
            this.consumedTurnCountsByEntityId.set(current.id, remaining);
            return;
        }

        this.consumedTurnCountsByEntityId.delete(current.id);
    }

    public hasActiveCombatants(): boolean {
        const players = this.entities.filter(e => e.constructor.name === 'Player' && !e.isDead());
        const enemies = this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
        return players.length > 0 && enemies.length > 0;
    }

    public getActiveEnemies = (): CombatEntity[] => this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
}
