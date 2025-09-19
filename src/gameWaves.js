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
            if (a.occupied && b.occupied) {
                // todo remove console
                console.log(`a and b coords: ${a.x} ${a.y} and ${b.x} ${b.y}`);
                // todo need some solution to connect cells to towers. Store them connected and easily retrieve the corresponding one.
                const ta = this.getTowerAt(a);
                const tb = this.getTowerAt(b);
                // todo remove console
                console.log(`ta and tb: ${ta} ${tb}`);
                console.log(`ta and tb color and level: ${ta.color} ${tb.color} ${ta.level} ${tb.level}`);
                if (ta && tb && ta.color === tb.color && ta.level === tb.level) {
                    ta.level += 1;
                    ta.updateStats();
                    this.towers = this.towers.filter(t => t !== tb);
                    b.occupied = false;
                    i++; 
                }
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
