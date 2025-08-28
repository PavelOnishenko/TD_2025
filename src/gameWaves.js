import { updateHUD, endGame } from './ui.js';

export const waveActions = {
    startWave() {
        if (this.waveInProgress) return;
        this.waveInProgress = true;
        this.nextWaveBtn.disabled = true;
        const cfg = this.waveConfigs[this.wave - 1] ?? this.waveConfigs.at(-1);
        this.spawnInterval = cfg.interval;
        this.enemiesPerWave = cfg.cycles;
        this.enemies = [];
        this.spawned = 0;
        this.spawnTimer = 0;
        do {
            this.colorProbStart = Math.random();
            this.colorProbEnd = Math.random();
        } while (Math.abs(this.colorProbStart - this.colorProbEnd) <= 0.35);
        this.spawnEnemy();
    },

    mergeTowers() {
        for (const start of [0, 1]) {
            for (let i = start; i < this.grid.length - 2; i += 2) {
                const a = this.grid[i];
                const b = this.grid[i + 2];
                if (a.occupied && b.occupied) {
                    const ta = this.getTowerAt(a);
                    const tb = this.getTowerAt(b);
                    if (ta && tb && ta.color === tb.color && ta.level === tb.level) {
                        ta.level += 1;
                        ta.updateStats();
                        this.towers = this.towers.filter(t => t !== tb);
                        b.occupied = false;
                        i += 2;
                    }
                }
            }
        }
    },

    checkWaveCompletion() {
        if (this.waveInProgress && this.spawned === this.enemiesPerWave && this.enemies.length === 0) {
            this.waveInProgress = false;
            this.mergeTowers();
            if (this.wave === this.maxWaves) {
                endGame(this, 'WIN');
            } else {
                this.nextWaveBtn.disabled = false;
            }
            this.wave += 1;
            this.gold += 3;
            updateHUD(this);
        }
    }
};
