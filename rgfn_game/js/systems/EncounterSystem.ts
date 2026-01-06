import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';
import { balanceConfig } from '../config/balanceConfig.js';

export default class EncounterSystem {
    private encounterRate: number;
    private stepsSinceEncounter: number;
    private minStepsBeforeEncounter: number;

    constructor(encounterRate?: number) {
        this.encounterRate = encounterRate ?? balanceConfig.encounters.encounterRate;
        this.stepsSinceEncounter = 0;
        this.minStepsBeforeEncounter = balanceConfig.encounters.minStepsBeforeEncounter;
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
        const enemyCount = randomInt(
            balanceConfig.encounters.minEnemies,
            balanceConfig.encounters.maxEnemies
        );
        const enemies: Skeleton[] = [];

        for (let i = 0; i < enemyCount; i++) {
            enemies.push(new Skeleton(0, 0));
        }

        return enemies;
    }
}
