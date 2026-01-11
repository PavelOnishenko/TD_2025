import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import { Viewport, WorldBounds } from './types/engine.js';
import { GameOverCallback } from './types/game.js';
import Player from './entities/Player.js';
import Enemy from './entities/Enemy.js';
import { balanceConfig } from './config/balanceConfig.js';

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
        const centerX: number = balanceConfig.world.width / 2;
        // Spawn player in the middle of the road area
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadCenterY: number = roadY + balanceConfig.layout.roadHeight / 2;
        this.player = new Player(centerX, roadCenterY);
        this.spawnEnemies(balanceConfig.spawn.initialEnemyCount);
    }

    private spawnEnemies(count: number): void {
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadHeight: number = balanceConfig.layout.roadHeight;

        for (let i = 0; i < count; i++) {
            const x: number = Math.random() * (balanceConfig.world.width - 100) + 50;
            // Spawn enemies only in the road area
            const y: number = roadY + Math.random() * (roadHeight - 100) + 50;

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

        // Horizontal bounds: entire world width
        this.player.x = Math.max(halfWidth, Math.min(balanceConfig.world.width - halfWidth, this.player.x));

        // Vertical bounds: restricted to road area only
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadBottom: number = roadY + balanceConfig.layout.roadHeight;
        const minY: number = roadY + halfHeight;
        const maxY: number = roadBottom - halfHeight;
        this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
    }

    private keepEnemyInBounds(enemy: Enemy): void {
        const halfWidth: number = enemy.width / 2;
        const halfHeight: number = enemy.height / 2;

        // Horizontal bounds: entire world width
        enemy.x = Math.max(halfWidth, Math.min(balanceConfig.world.width - halfWidth, enemy.x));

        // Vertical bounds: restricted to road area only
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadBottom: number = roadY + balanceConfig.layout.roadHeight;
        const minY: number = roadY + halfHeight;
        const maxY: number = roadBottom - halfHeight;
        enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
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
            // Keep enemies within road bounds
            this.keepEnemyInBounds(enemy);

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
        // takeDamage() now handles setting active = false when health reaches 0
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
        const bgHeight = balanceConfig.layout.backgroundHeight;
        const roadY = bgHeight;
        const roadHeight = balanceConfig.layout.roadHeight;

        // Top part: Background wall (non-playable)
        this.renderer.fillRect(0, 0, balanceConfig.world.width, bgHeight, '#1a1a2e');

        // Add some texture to the wall with darker stripes
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < bgHeight; y += 40) {
            this.ctx.fillRect(0, y, balanceConfig.world.width, 20);
        }

        // Bottom part: Road (playable area)
        this.renderer.fillRect(0, roadY, balanceConfig.world.width, roadHeight, '#4a4a6a');

        // Draw road grid only in playable area
        this.drawRoadGrid(50, roadY, roadHeight);

        // Dividing line between background and road
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(balanceConfig.world.width, roadY);
        this.ctx.stroke();
    }

    private drawRoadGrid(gridSize: number, roadY: number, roadHeight: number): void {
        this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
        this.ctx.lineWidth = 1;

        // Vertical grid lines across the entire road
        for (let x = 0; x <= balanceConfig.world.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, roadY);
            this.ctx.lineTo(x, roadY + roadHeight);
            this.ctx.stroke();
        }

        // Horizontal grid lines only in the road area
        for (let y = roadY; y <= roadY + roadHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(balanceConfig.world.width, y);
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
            maxX: balanceConfig.world.width,
            minY: 0,
            maxY: balanceConfig.world.height,
        };
    }
}
