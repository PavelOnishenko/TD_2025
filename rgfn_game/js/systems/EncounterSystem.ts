import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private minStepsBeforeEncounter: number;

    constructor(encounterRate: number = 0.08) {
        this.encounterRate = encounterRate;
        this.stepsSinceEncounter = 0;
        this.minStepsBeforeEncounter = 10;
    }

    public onPlayerMove(): void {
        this.stepsSinceEncounter++;
    }

    public checkEncounter(): boolean {
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

    public generateEncounter(): Skeleton[] {
        const enemyCount = randomInt(1, 3);
        const enemies: Skeleton[] = [];

        for (let i = 0; i < enemyCount; i++) {
            enemies.push(new Skeleton(0, 0));
        }

        return enemies;
    }
}
