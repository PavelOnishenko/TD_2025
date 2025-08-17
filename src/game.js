class Enemy {
  constructor(maxHp = 3) {
    this.x = 0;
    this.y = 365;
    this.w = 30;
    this.h = 30;
    this.speed = 50;
    this.maxHp = maxHp;
    this.hp = this.maxHp;
  }

  update(dt) {
    this.x += this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    const barWidth = this.w;
    const barHeight = 4;
    const barX = this.x;
    const barY = this.y - barHeight - 2;

    ctx.fillStyle = 'red';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = 'green';
    ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  isOutOfBounds(width) {
    return this.x + this.w >= width;
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
    this.range = 120;
    this.lastShot = 0;
  }

  center() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2
    };
  }

  draw(ctx) {
    const c = this.center();
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,255,0.3)';
    ctx.stroke();

    ctx.fillStyle = 'blue';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.projectileSpeed = 400;
    this.projectileRadius = 6;
    this.lastTime = 0;
    this.target = null;

    this.lives = 10;
    this.gold = 20;
    this.wave = 1;
    this.maxWaves = 5;
    this.buildMode = false;
    this.hoverCell = null;
    this.towerCost = 10;

    this.waveInProgress = false;
    this.spawnInterval = 1;
    this.enemiesPerWave = 5;
    this.spawned = 0;
    this.spawnTimer = 0;

    this.enemyHpPerWave = [3, 4, 5, 6, 7];

    this.livesEl = document.getElementById('lives');
    this.goldEl = document.getElementById('gold');
    this.waveEl = document.getElementById('wave');
    this.statusEl = document.getElementById('status');
    this.nextWaveBtn = document.getElementById('nextWave');
    this.placeTowerBtn = document.getElementById('placeTower');
    this.statusEl = document.getElementById('status');
    this.gameOver = false;
	this.shootingInterval = 500;

    this.placeTowerBtn.addEventListener('click', () => {
      this.buildMode = !this.buildMode;
      this.placeTowerBtn.classList.toggle('active', this.buildMode);
      if (!this.buildMode) this.hoverCell = null;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.hoverCell = null;
      if (!this.buildMode) return;
      for (const cell of this.grid) {
        if (mx >= cell.x && mx <= cell.x + cell.w && my >= cell.y && my <= cell.y + cell.h) {
          this.hoverCell = cell;
          break;
        }
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCell = null;
    });
    this.canvas.addEventListener('click', () => {
      if (!this.buildMode || !this.hoverCell) return;
      const affordable = this.gold >= this.towerCost;
      const placeable = !this.hoverCell.occupied;
      if (affordable && placeable) {
        this.towers.push(new Tower(this.hoverCell.x, this.hoverCell.y));
        this.hoverCell.occupied = true;
        this.gold -= this.towerCost;
        this.updateHUD();
      }
    });
    this.nextWaveBtn.addEventListener('click', () => this.startWave());

    this.updateHUD();

    this.grid = [];
    for (let i = 0; i < 10; i++) {
      this.grid.push({ x: 20 + i * 80, y: 340, w: 40, h: 40, occupied: false });
    }

    this.base = { x: this.canvas.width - 40, y: 360, w: 40, h: 40 };

    this.update = this.update.bind(this);
  }

  showEnd(text, color) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = color;
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
  }

  updateHUD() {
    this.livesEl.textContent = `Lives: ${this.lives}`;
    this.goldEl.textContent = `Gold: ${this.gold}`;
    this.waveEl.textContent = `Wave: ${this.wave}/${this.maxWaves}`;
  }

  endGame(text) {
    this.statusEl.textContent = text;
    this.statusEl.style.color = 'red';
    this.nextWaveBtn.disabled = true;
    this.placeTowerBtn.disabled = true;
    this.gameOver = true;
  }

  spawnProjectile(angle, tower) {
    const c = tower.center();
    this.projectiles.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed
    });
  }

  spawnEnemy() {
    const hp = this.enemyHpPerWave[this.wave - 1] ?? this.enemyHpPerWave[this.enemyHpPerWave.length - 1];
    this.enemies.push(new Enemy(hp));
    this.spawned++;
  }

  startWave() {
    if (this.waveInProgress) return;
    this.waveInProgress = true;
    this.nextWaveBtn.disabled = true;
    this.enemies = [];
    this.spawned = 0;
    this.spawnTimer = 0;
    this.spawnEnemy();
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (
          p.x >= e.x &&
          p.x <= e.x + e.w &&
          p.y >= e.y &&
          p.y <= e.y + e.h
        ) {
          e.hp -= 1;
          this.projectiles.splice(i, 1);
          if (e.hp <= 0) {
            this.enemies.splice(j, 1);
            this.gold += 1;
            this.updateHUD();
          }
          hit = true;
          break;
        }
      }
      if (hit) continue;

      if (
        p.x < 0 ||
        p.x > this.canvas.width ||
        p.y < 0 ||
        p.y > this.canvas.height
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#888';
    ctx.fillRect(0, 380, this.canvas.width, 20);

    ctx.fillStyle = 'green';
    ctx.fillRect(this.base.x, this.base.y, this.base.w, this.base.h);

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.grid.forEach(cell => {
      ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
    });
    if (this.buildMode && this.hoverCell) {
      const affordable = this.gold >= this.towerCost;
      const placeable = !this.hoverCell.occupied;
      ctx.fillStyle = affordable && placeable ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
      ctx.fillRect(this.hoverCell.x, this.hoverCell.y, this.hoverCell.w, this.hoverCell.h);
    }

    this.towers.forEach(t => t.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));

    ctx.fillStyle = 'black';
    this.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.projectileRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  update(timestamp) {
    if (this.gameOver) return;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Спавн волн
    if (this.waveInProgress && this.spawned < this.enemiesPerWave) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
    }

    // Обновление врагов + удаление тех, кто ушёл за край
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.x + e.w >= this.base.x) {
        this.enemies.splice(i, 1);
        this.lives -= 1;
        this.updateHUD();
        if (this.lives <= 0) {
          this.endGame('LOSE');
        }
      } else if (e.isOutOfBounds(this.canvas.width)) {
        this.enemies.splice(i, 1);
      }
    }

    // Атаки башен по врагам
    for (const tower of this.towers) {
      for (const target of this.enemies) {
        const towerCenter = tower.center();
        const enemyCenter = {
          x: target.x + target.w / 2,
          y: target.y + target.h / 2
        };
        const dx = enemyCenter.x - towerCenter.x;
        const dy = enemyCenter.y - towerCenter.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= tower.range && timestamp - tower.lastShot >= 1000) {
          const angle = Math.atan2(dy, dx);
          this.spawnProjectile(angle, tower);
          tower.lastShot = timestamp;
          break;
        }
      }
    }

    // Движение и столкновения снарядов
    this.updateProjectiles(dt);

    // Завершение волны
    if (
      this.waveInProgress &&
      this.spawned === this.enemiesPerWave &&
      this.enemies.length === 0
    ) {
      this.waveInProgress = false;
      
       if (this.wave === this.maxWaves) {
        this.statusEl.textContent = 'WIN';
        this.nextWaveBtn.disabled = true;
        this.placeTowerBtn.disabled = true;
        this.gameOver = true;
      } else {
        this.nextWaveBtn.disabled = false;
      }
      this.wave += 1;
      this.gold += 3;
      this.updateHUD();
    }

    this.draw();
    if (!this.gameOver) requestAnimationFrame(this.update);
  }

  run() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.update);
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.run();

