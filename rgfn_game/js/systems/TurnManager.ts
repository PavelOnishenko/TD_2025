import { CombatEntity } from '../types/game.js';

export default class TurnManager {
    private entities: CombatEntity[];
    private currentTurnIndex: number;
    public waitingForPlayer: boolean;

    constructor() {
        this.entities = [];
        this.currentTurnIndex = 0;
        this.waitingForPlayer = false;
    }

    public initializeTurns(entities: CombatEntity[]): void {
        this.entities = entities.filter(e => e.active && !e.isDead());
        this.currentTurnIndex = 0;
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

        if (this.entities.length === 0) {
            return null;
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.entities.length;
        this.waitingForPlayer = this.isPlayerTurn();

        return this.getCurrentEntity();
    }

    public hasActiveCombatants(): boolean {
        const players = this.entities.filter(e => e.constructor.name === 'Player' && !e.isDead());
        const enemies = this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
        return players.length > 0 && enemies.length > 0;
    }

    public getActiveEnemies(): CombatEntity[] {
        return this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
    }
}
