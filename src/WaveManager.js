import Enemy, { TankEnemy, SwarmEnemy } from './Enemy.js';
import { updateHUD, endGame } from './ui.js';

export default class WaveManager {
    constructor(game) {
        this.game = game;
    }

    getEnemyColor() {
        const { enemiesPerWave, spawned, colorProbStart, colorProbEnd } = this.game;
        const denom = enemiesPerWave - 1;
        const progress = denom > 0 ? spawned / denom : 1;
        const p = colorProbStart + (colorProbEnd - colorProbStart) * progress;
        return Math.random() < p ? 'red' : 'blue';
    }

    spawnEnemy(type) {
        const g = this.game;
        const hp = g.enemyHpPerWave[g.wave - 1] ?? g.enemyHpPerWave.at(-1);
        if (!type) {
            const cfg = g.waveConfigs[g.wave - 1] ?? g.waveConfigs.at(-1);
            type = g.wave <= 2 ? 'swarm' : (Math.random() < cfg.tankChance ? 'tank' : 'swarm');
        }
        const startY = 0;
        if (type === 'tank') {
            const color = this.getEnemyColor();
            g.enemies.push(new TankEnemy(hp * 5, color, g.pathX, startY));
        } else if (type === 'swarm') {
            const groupSize = 3;
            const swarmHp = Math.max(1, Math.floor(hp / 2));
            const spacing = 40;
            for (let i = 0; i < groupSize; i++) {
                const color = this.getEnemyColor();
                const y = startY + i * spacing;
                g.enemies.push(new SwarmEnemy(swarmHp, color, g.pathX, y));
            }
        } else {
            const color = this.getEnemyColor();
            g.enemies.push(new Enemy(hp, color, g.pathX, startY));
        }
        g.spawned += 1;
    }

    startWave() {
        const g = this.game;
        if (g.waveInProgress) return;
        g.waveInProgress = true;
        g.nextWaveBtn.disabled = true;
        const cfg = g.waveConfigs[g.wave - 1] ?? g.waveConfigs.at(-1);
        g.spawnInterval = cfg.interval;
        g.enemiesPerWave = cfg.cycles;
        g.enemies = [];
        g.spawned = 0;
        g.spawnTimer = 0;
        do {
            g.colorProbStart = Math.random();
            g.colorProbEnd = Math.random();
        } while (Math.abs(g.colorProbStart - g.colorProbEnd) <= 0.35);
        this.spawnEnemy();
    }

    spawnEnemiesIfNeeded(dt) {
        const g = this.game;
        if (g.waveInProgress && g.spawned < g.enemiesPerWave) {
            g.spawnTimer += dt;
            if (g.spawnTimer >= g.spawnInterval) {
                this.spawnEnemy();
                g.spawnTimer = 0;
            }
        }
    }

    checkWaveCompletion() {
        const g = this.game;
        if (g.waveInProgress && g.spawned === g.enemiesPerWave && g.enemies.length === 0) {
            g.waveInProgress = false;
            g.mergeTowers();
            if (g.wave === g.maxWaves) {
                endGame(g, 'WIN');
            } else {
                g.nextWaveBtn.disabled = false;
            }
            g.wave += 1;
            g.gold += 3;
            updateHUD(g);
        }
    }
}
