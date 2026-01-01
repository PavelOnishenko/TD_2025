import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';

export default class EncounterSystem {
    constructor(config = {}) {
        this.encounterRate = config.encounterRate ?? 0.08;
        this.minStepsBeforeEncounter = config.minStepsBeforeEncounter ?? 10;
        this.stepsSinceEncounter = 0;
    }

    onPlayerMove() {
        this.stepsSinceEncounter++;
    }

    checkEncounter() {
        if (this.stepsSinceEncounter < this.minStepsBeforeEncounter) {
            return false;
        }

        const roll = Math.random();
        if (roll < this.encounterRate) {
            this.stepsSinceEncounter = 0;
            return true;
        }

        return false;
    }

    generateEncounter() {
        const enemyCount = randomInt(1, 3);
        const enemies = [];

        for (let i = 0; i < enemyCount; i++) {
            enemies.push(new Skeleton(0, 0));
        }

        return enemies;
    }
}
