class Enemy {
  constructor() {
    this.x = 0;
    this.y = 365;
    this.w = 30;
    this.h = 30;
    this.speed = 50;
    this.hp = 3;
  }

  update(dt) {
    this.x += this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }

  isOutOfBounds(width) {
    return this.x + this.w >= width;
  }
}

class Tower {
  constructor() {
    this.x = 400;
    this.y = 280;
    this.w = 40;
    this.h = 40;
    this.range = 120;
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
    this.enemy = new Enemy();
    this.tower = new Tower();
    this.projectiles = [];
    this.projectileSpeed = 400;
    this.projectileRadius = 6;
    this.lastShot = 0;
    this.lastTime = 0;
    this.gameOver = false;
    this.win = false;

    this.lives = 10;
    this.gold = 15;
    this.wave = 1;
    this.maxWaves = 5;
    this.buildMode = false;
    this.hoverCell = null;
    this.towerCost = 10;

    this.livesEl = document.getElementById('lives');
    this.goldEl = document.getElementById('gold');
    this.waveEl = document.getElementById('wave');
    this.nextWaveBtn = document.getElementById('nextWave');
    this.placeTowerBtn = document.getElementById('placeTower');

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

    this.updateHUD();

    this.grid = [];
    for (let i = 0; i < 10; i++) {
      this.grid.push({ x: 20 + i * 80, y: 340, w: 40, h: 40, occupied: false });
    }

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

  spawnProjectile(angle) {
    const c = this.tower.center();
    this.projectiles.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (
        p.x >= this.enemy.x &&
        p.x <= this.enemy.x + this.enemy.w &&
        p.y >= this.enemy.y &&
        p.y <= this.enemy.y + this.enemy.h
      ) {
        this.enemy.hp -= 1;
        this.projectiles.splice(i, 1);
        if (this.enemy.hp <= 0) {
          this.gameOver = true;
          this.win = true;
        }
        continue;
      }

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

    this.tower.draw(ctx);
    this.enemy.draw(ctx);

    ctx.fillStyle = 'black';
    this.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.projectileRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  update(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (this.gameOver) {
      this.showEnd(this.win ? 'YOU WIN' : 'GAME OVER', this.win ? 'green' : 'red');
      return;
    }

    this.enemy.update(dt);
    if (this.enemy.isOutOfBounds(this.canvas.width)) {
      this.gameOver = true;
      this.win = false;
    }

    const towerCenter = this.tower.center();
    const enemyCenter = {
      x: this.enemy.x + this.enemy.w / 2,
      y: this.enemy.y + this.enemy.h / 2
    };
    const dx = enemyCenter.x - towerCenter.x;
    const dy = enemyCenter.y - towerCenter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.tower.range && timestamp - this.lastShot >= 1000) {
      const angle = Math.atan2(dy, dx);
      this.spawnProjectile(angle);
      this.lastShot = timestamp;
    }

    this.updateProjectiles(dt);

    if (this.gameOver) {
      this.showEnd(this.win ? 'YOU WIN' : 'GAME OVER', this.win ? 'green' : 'red');
      return;
    }

    this.draw();
    requestAnimationFrame(this.update);
  }

  run() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.update);
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.run();

