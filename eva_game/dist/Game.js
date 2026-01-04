import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import Player from './entities/Player';
import Enemy from './entities/Enemy';
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
export default class Game {
    constructor(canvas) {
        this.player = null;
        this.enemies = [];
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.onGameOver = null;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;
        this.renderer = new Renderer(canvas, this.ctx);
        this.input = new InputManager();
        this.loop = new GameLoop((dt) => this.update(dt), () => this.render());
        this.setupInput();
        this.initializeGame();
    }
    setupInput() {
        this.input.mapAction('attack', ['Space', 'KeyZ']);
        this.input.mapAxis('horizontal', ['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
        this.input.mapAxis('vertical', ['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS']);
        document.addEventListener('keydown', (e) => this.input.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.input.handleKeyUp(e));
    }
    initializeGame() {
        const centerX = WORLD_WIDTH / 2;
        const centerY = WORLD_HEIGHT / 2;
        this.player = new Player(centerX, centerY);
        this.spawnEnemies(3);
    }
    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (WORLD_WIDTH - 100) + 50;
            const y = Math.random() * (WORLD_HEIGHT - 100) + 50;
            const enemy = new Enemy(x, y);
            this.enemies.push(enemy);
        }
    }
    start() {
        this.loop.start();
    }
    pause() {
        this.isPaused = true;
        this.loop.pause();
    }
    resume() {
        this.isPaused = false;
        this.loop.resume();
    }
    restart() {
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.enemies = [];
        this.initializeGame();
        this.updateHUD();
        this.loop.start();
    }
    update(deltaTime) {
        if (this.gameOver || this.isPaused) {
            return;
        }
        this.updatePlayer(deltaTime);
        this.updateEnemies(deltaTime);
        this.checkCollisions();
        this.updateHUD();
        this.input.update();
    }
    updatePlayer(deltaTime) {
        if (!this.player) {
            return;
        }
        const horizontalInput = this.input.getAxis('horizontal');
        const verticalInput = this.input.getAxis('vertical');
        this.player.handleInput(horizontalInput, verticalInput, this.input);
        this.player.update(deltaTime);
        this.keepPlayerInBounds();
    }
    keepPlayerInBounds() {
        if (!this.player) {
            return;
        }
        const halfWidth = this.player.width / 2;
        const halfHeight = this.player.height / 2;
        this.player.x = Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, this.player.x));
        this.player.y = Math.max(halfHeight, Math.min(WORLD_HEIGHT - halfHeight, this.player.y));
    }
    updateEnemies(deltaTime) {
        if (!this.player) {
            return;
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);
            enemy.moveToward(this.player.x, this.player.y, deltaTime);
            if (!enemy.active) {
                this.enemies.splice(i, 1);
                this.score += 10;
            }
        }
        if (this.enemies.length === 0) {
            this.level += 1;
            this.spawnEnemies(this.level + 2);
        }
    }
    checkCollisions() {
        if (!this.player) {
            return;
        }
        for (const enemy of this.enemies) {
            if (this.player.checkCollision(enemy)) {
                this.handlePlayerEnemyCollision(enemy);
            }
            if (this.player.isAttacking && this.player.checkAttackHit(enemy)) {
                this.handlePlayerAttackHit(enemy);
            }
        }
    }
    handlePlayerEnemyCollision(enemy) {
        if (!this.player) {
            return;
        }
        if (!this.player.invulnerable) {
            this.player.takeDamage(10);
            if (this.player.health <= 0) {
                this.endGame();
            }
        }
    }
    handlePlayerAttackHit(enemy) {
        if (!this.player) {
            return;
        }
        enemy.takeDamage(this.player.attackDamage);
        if (enemy.health <= 0) {
            enemy.active = false;
        }
    }
    endGame() {
        this.gameOver = true;
        this.loop.stop();
        if (typeof this.onGameOver === 'function') {
            this.onGameOver(this.score);
        }
    }
    updateHUD() {
        if (!this.player) {
            return;
        }
        const healthElement = document.getElementById('health-value');
        const scoreElement = document.getElementById('score-value');
        const levelElement = document.getElementById('level-value');
        if (healthElement)
            healthElement.textContent = String(this.player.health);
        if (scoreElement)
            scoreElement.textContent = String(this.score);
        if (levelElement)
            levelElement.textContent = String(this.level);
    }
    render() {
        this.renderer.beginFrame();
        this.drawBackground();
        this.drawEntities();
        this.renderer.endFrame();
    }
    drawBackground() {
        this.renderer.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#2a2a4a');
        this.drawGrid(50);
    }
    drawGrid(gridSize) {
        this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, WORLD_HEIGHT);
            this.ctx.stroke();
        }
        for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(WORLD_WIDTH, y);
            this.ctx.stroke();
        }
    }
    drawEntities() {
        if (!this.player) {
            return;
        }
        const allEntities = [this.player, ...this.enemies];
        this.renderer.drawEntities(allEntities, true);
    }
    updateViewport(viewport) {
        this.viewport = viewport;
        this.renderer.setViewport(viewport);
    }
    computeWorldBounds() {
        return {
            minX: 0,
            maxX: WORLD_WIDTH,
            minY: 0,
            maxY: WORLD_HEIGHT,
        };
    }
}
//# sourceMappingURL=Game.js.map