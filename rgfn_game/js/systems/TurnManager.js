export default class TurnManager {
    constructor() {
        this.entities = [];
        this.currentTurnIndex = 0;
        this.waitingForPlayer = false;
    }

    initializeTurns(entities) {
        this.entities = entities.filter(e => e.active && !e.isDead());
        this.currentTurnIndex = 0;
        this.waitingForPlayer = false;
    }

    getCurrentEntity() {
        if (this.currentTurnIndex >= this.entities.length) {
            return null;
        }
        return this.entities[this.currentTurnIndex];
    }

    isPlayerTurn() {
        const current = this.getCurrentEntity();
        return current && current.constructor.name === 'Player';
    }

    nextTurn() {
        // Remove dead entities
        this.entities = this.entities.filter(e => e.active && !e.isDead());

        if (this.entities.length === 0) {
            return null;
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.entities.length;
        this.waitingForPlayer = this.isPlayerTurn();

        return this.getCurrentEntity();
    }

    hasActiveCombatants() {
        const players = this.entities.filter(e => e.constructor.name === 'Player' && !e.isDead());
        const enemies = this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
        return players.length > 0 && enemies.length > 0;
    }

    getActiveEnemies() {
        return this.entities.filter(e => e.constructor.name !== 'Player' && !e.isDead());
    }
}
