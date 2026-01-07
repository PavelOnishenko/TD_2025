import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';
import Zombie from '../entities/Zombie.js';
import { balanceConfig } from '../config/balanceConfig.js';
import { CombatEntity } from '../types/game.js';

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

    public generateEncounter(): CombatEntity[] {
        const enemyCount = randomInt(
            balanceConfig.encounters.minEnemies,
            balanceConfig.encounters.maxEnemies
        );
        const enemies: CombatEntity[] = [];

        for (let i = 0; i < enemyCount; i++) {
            // 50/50 chance to spawn either a skeleton or zombie
            const spawnZombie = Math.random() < 0.5;
            if (spawnZombie) {
                enemies.push(new Zombie(0, 0));
            } else {
                enemies.push(new Skeleton(0, 0));
            }
        }

        return enemies;
    }
}
