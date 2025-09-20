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

    mergeTowers(row) {
        for (let i = 0; i < row.length - 1; i++) {
            const a = row[i];
            const b = row[i + 1];
            if (!a.occupied || !b.occupied) continue;

            const ta = this.getTowerAt(a);
            const tb = this.getTowerAt(b);
            if (!ta || !tb) continue;

            if (ta.color === tb.color && ta.level === tb.level) {
                a.tower = ta;
                ta.level += 1;
                ta.updateStats();
                this.towers = this.towers.filter(t => t !== tb);
                if (tb.cell) {
                    tb.cell.tower = null;
                    tb.cell = null;
                }
                b.occupied = false;
                b.tower = null;
                i++;
            }
        }
    },

    checkWaveCompletion() {
        if (this.waveInProgress && this.spawned === this.enemiesPerWave && this.enemies.length === 0) {
            this.waveInProgress = false;
            this.mergeTowers(this.bottomCells);
            this.mergeTowers(this.topCells);
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
