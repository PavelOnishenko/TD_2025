import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import { Viewport, WorldBounds } from './types/engine.js';
import { GameOverCallback } from './types/game.js';
import Player from './entities/Player.js';
import Enemy from './entities/Enemy.js';

const WORLD_WIDTH: number = 800;
const WORLD_HEIGHT: number = 600;

// Color palette for enemies - each enemy gets a unique color
const ENEMY_COLORS: string[] = [
    '#ff6b6b', // Red
    '#4ecdc4', // Teal
    '#45b7d1', // Blue
    '#f9ca24', // Yellow
    '#6c5ce7', // Purple
    '#fd79a8', // Pink
    '#00b894', // Green
    '#ff7675', // Light Red
    '#fdcb6e', // Orange
    '#a29bfe', // Light Purple
    '#74b9ff', // Light Blue
    '#55efc4', // Mint
    '#fab1a0', // Peach
    '#e17055', // Dark Orange
    '#0984e3', // Dark Blue
    '#d63031', // Dark Red
];

export default class Game {
    private ctx: CanvasRenderingContext2D;
    private renderer: Renderer;
    private input: InputManager;
    private loop: GameLoop;
    private player: Player | null = null;
    private enemies: Enemy[] = [];
    private score: number = 0;
    private level: number = 1;
    private viewport?: Viewport;
    private nextColorIndex: number = 0;

    public gameOver: boolean = false;
    public isPaused: boolean = false;
    public onGameOver: GameOverCallback | null = null;

    constructor(canvas: HTMLCanvasElement) {

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;

        this.renderer = new Renderer(canvas, this.ctx);
        this.input = new InputManager();
        this.loop = new GameLoop(
            (dt: number) => this.update(dt),
            () => this.render()
        );

        this.setupInput();
        this.initializeGame();
    }

    private setupInput(): void {
        this.input.mapAction('attack', ['Space', 'KeyZ']);
        this.input.mapAxis('horizontal', ['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
        this.input.mapAxis('vertical', ['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS']);

        document.addEventListener('keydown', (e: KeyboardEvent) => this.input.handleKeyDown(e));
        document.addEventListener('keyup', (e: KeyboardEvent) => this.input.handleKeyUp(e));
    }

    private initializeGame(): void {
        const centerX: number = WORLD_WIDTH / 2;
        const centerY: number = WORLD_HEIGHT / 2;
        this.player = new Player(centerX, centerY);
        this.spawnEnemies(3);
    }

    private spawnEnemies(count: number): void {
        for (let i = 0; i < count; i++) {
            const x: number = Math.random() * (WORLD_WIDTH - 100) + 50;
            const y: number = Math.random() * (WORLD_HEIGHT - 100) + 50;

            // Assign a unique color to each enemy
            const color: string = ENEMY_COLORS[this.nextColorIndex % ENEMY_COLORS.length];
            this.nextColorIndex++;

            const enemy: Enemy = new Enemy(x, y, color);
            this.enemies.push(enemy);
        }
    }

    public start(): void {
        this.loop.start();
    }

    public pause(): void {
        this.isPaused = true;
        this.loop.pause();
    }

    public resume(): void {
        this.isPaused = false;
        this.loop.resume();
    }

    public restart(): void {
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.enemies = [];
        this.nextColorIndex = 0;
        this.initializeGame();
        this.updateHUD();
        this.loop.start();
    }

    private update(deltaTime: number): void {
        if (this.gameOver || this.isPaused) {
            return;
        }

        this.updatePlayer(deltaTime);
        this.updateEnemies(deltaTime);
        this.checkCollisions();
        this.updateHUD();
        this.input.update();
    }

    private updatePlayer(deltaTime: number): void {
        if (!this.player) {
            return;
        }

        const horizontalInput: number = this.input.getAxis('horizontal');
        const verticalInput: number = this.input.getAxis('vertical');
        this.player.handleInput(horizontalInput, verticalInput, this.input);
        this.player.update(deltaTime);
        this.keepPlayerInBounds();
    }

    private keepPlayerInBounds(): void {
        if (!this.player) {
            return;
        }

        const halfWidth: number = this.player.width / 2;
        const halfHeight: number = this.player.height / 2;
        this.player.x = Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, this.player.x));
        this.player.y = Math.max(halfHeight, Math.min(WORLD_HEIGHT - halfHeight, this.player.y));
    }

    private updateEnemies(deltaTime: number): void {
        if (!this.player) {
            return;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy: Enemy = this.enemies[i];
            enemy.update(deltaTime);
            // Pass all enemies so they can avoid clustering
            enemy.moveToward(this.player.x, this.player.y, deltaTime, this.enemies);

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

    private checkCollisions(): void {
        if (!this.player) {
            return;
        }

        for (const enemy of this.enemies) {
            // Check if enemy can attack based on distance (not just collision)
            if (enemy.canAttackPlayer(this.player)) {
                this.handlePlayerEnemyCollision(enemy);
            }

            if (this.player.isAttacking && this.player.checkAttackHit(enemy)) {
                this.handlePlayerAttackHit(enemy);
            }
        }
    }

    private handlePlayerEnemyCollision(enemy: Enemy): void {
        if (!this.player) {
            return;
        }

        if (!this.player.invulnerable) {
            enemy.attackPlayer(this.player);
            if (this.player.health <= 0) {
                this.endGame();
            }
        }
    }

    private handlePlayerAttackHit(enemy: Enemy): void {
        if (!this.player) {
            return;
        }

        enemy.takeDamage(this.player.attackDamage);
        if (enemy.health <= 0) {
            enemy.active = false;
        }
    }

    private endGame(): void {
        this.gameOver = true;
        this.loop.stop();

        if (typeof this.onGameOver === 'function') {
            this.onGameOver(this.score);
        }
    }

    private updateHUD(): void {
        if (!this.player) {
            return;
        }

        const healthElement = document.getElementById('health-value');
        const scoreElement = document.getElementById('score-value');
        const levelElement = document.getElementById('level-value');

        if (healthElement) healthElement.textContent = String(this.player.health);
        if (scoreElement) scoreElement.textContent = String(this.score);
        if (levelElement) levelElement.textContent = String(this.level);
    }

    private render(): void {
        this.renderer.beginFrame();
        this.drawBackground();
        this.drawEntities();
        this.renderer.endFrame();
    }

    private drawBackground(): void {
        this.renderer.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#2a2a4a');
        this.drawGrid(50);
    }

    private drawGrid(gridSize: number): void {
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

    private drawEntities(): void {
        if (!this.player) {
            return;
        }

        const allEntities = [this.player, ...this.enemies];
        this.renderer.drawEntities(allEntities, true);
    }

    public updateViewport(viewport: Viewport): void {
        this.viewport = viewport;
        this.renderer.setViewport(viewport);
    }

    public computeWorldBounds(): WorldBounds {
        return {
            minX: 0,
            maxX: WORLD_WIDTH,
            minY: 0,
            maxY: WORLD_HEIGHT,
        };
    }
}
