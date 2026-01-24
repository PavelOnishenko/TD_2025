import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import ScoreManager from '../../engine/core/ScoreManager.js';
import { Viewport, WorldBounds } from './types/engine.js';
import { GameOverCallback, AttackPosition } from './types/game.js';
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
    private scoreManager: ScoreManager;
    private player: Player | null = null;
    private enemies: Enemy[] = [];
    private level: number = 1;
    private viewport?: Viewport;
    private nextColorIndex: number = 0;
    private attackPositions: AttackPosition[] = [];

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
        this.scoreManager = new ScoreManager();
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
        // Spawn player in the middle of the allowed Y range
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadHeight: number = balanceConfig.layout.roadHeight;
        const playerHalfHeight: number = balanceConfig.player.height / 2;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        const roadBottom: number = roadY + roadHeight;
        const minY: number = roadY - playerHalfHeight + feetColliderHeight;
        const maxY: number = roadBottom - playerHalfHeight;
        const playerY: number = (minY + maxY) / 2;
        this.player = new Player(centerX, playerY);
        this.spawnEnemies(balanceConfig.spawn.initialEnemyCount);
    }

    private spawnEnemies(count: number): void {
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadHeight: number = balanceConfig.layout.roadHeight;
        const roadBottom: number = roadY + roadHeight;
        const enemyHalfHeight: number = balanceConfig.enemy.height / 2;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;

        for (let i = 0; i < count; i++) {
            const x: number = Math.random() * (balanceConfig.world.width - 100) + 50;
            // Spawn enemies within allowed Y range (using feet collider bounds)
            const minY: number = roadY - enemyHalfHeight + feetColliderHeight;
            const maxY: number = roadBottom - enemyHalfHeight;
            const y: number = minY + Math.random() * (maxY - minY);

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
        this.scoreManager.reset();
        this.level = 1;
        this.enemies = [];
        this.nextColorIndex = 0;
        this.attackPositions = [];
        this.initializeGame();
        this.updateHUD();
        this.loop.start();
    }

    /**
     * Update attack positions based on player location
     * Two positions: left and right side of the player
     */
    private updateAttackPositions(): void {
        if (!this.player) {
            return;
        }

        const distance = balanceConfig.enemy.attackPositions.distanceFromPlayer;

        // Left attack position
        const leftPos: AttackPosition = {
            x: this.player.x - distance,
            y: this.player.y,
            side: 'left',
            occupied: false,
            occupiedBy: null,
        };

        // Right attack position
        const rightPos: AttackPosition = {
            x: this.player.x + distance,
            y: this.player.y,
            side: 'right',
            occupied: false,
            occupiedBy: null,
        };

        this.attackPositions = [leftPos, rightPos];
    }

    /**
     * Assign each enemy to their preferred attack position
     * Enemies prefer the closest available position
     */
    private assignEnemyAttackPositions(): void {
        if (!this.player || this.attackPositions.length === 0) {
            return;
        }

        // Clear all occupation data
        for (const pos of this.attackPositions) {
            pos.occupied = false;
            pos.occupiedBy = null;
        }

        // Get all alive enemies and sort by distance to player
        const aliveEnemies = this.enemies.filter(
            e => e.animationState !== 'death' && !e.isDead
        );

        // For each enemy, find their preferred attack position
        for (const enemy of aliveEnemies) {
            let closestPos: AttackPosition | null = null;
            let closestDistance = Infinity;

            // Find the closest available position
            for (const pos of this.attackPositions) {
                if (pos.occupied) {
                    continue;
                }

                const dx = pos.x - enemy.x;
                const dy = pos.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPos = pos;
                }
            }

            // If we found an available position, assign it
            if (closestPos) {
                closestPos.occupied = true;
                closestPos.occupiedBy = enemy.id;
            }
        }
    }

    /**
     * Get the target attack position for a specific enemy
     */
    private getEnemyTargetPosition(enemy: Enemy): { x: number; y: number } {
        // Find which position this enemy should go to
        for (const pos of this.attackPositions) {
            if (pos.occupiedBy === enemy.id) {
                return { x: pos.x, y: pos.y };
            }
        }

        // If no position is assigned, find the closest one
        let closestPos = this.attackPositions[0];
        let closestDistance = Infinity;

        for (const pos of this.attackPositions) {
            const dx = pos.x - enemy.x;
            const dy = pos.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestPos = pos;
            }
        }

        return { x: closestPos.x, y: closestPos.y };
    }

    private update(deltaTime: number): void {
        if (this.gameOver || this.isPaused) {
            return;
        }

        this.updatePlayer(deltaTime);
        this.updateAttackPositions();
        this.assignEnemyAttackPositions();
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

        // Vertical bounds: only feet collider restricted to road area
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadBottom: number = roadY + balanceConfig.layout.roadHeight;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        // Top of feet collider = y + halfHeight - feetColliderHeight, must be >= roadY
        const minY: number = roadY - halfHeight + feetColliderHeight;
        // Bottom of feet collider = y + halfHeight, must be <= roadBottom
        const maxY: number = roadBottom - halfHeight;
        this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
    }

    private keepEnemyInBounds(enemy: Enemy): void {
        const halfWidth: number = enemy.width / 2;
        const halfHeight: number = enemy.height / 2;

        // Horizontal bounds: entire world width
        enemy.x = Math.max(halfWidth, Math.min(balanceConfig.world.width - halfWidth, enemy.x));

        // Vertical bounds: only feet collider restricted to road area
        const roadY: number = balanceConfig.layout.backgroundHeight;
        const roadBottom: number = roadY + balanceConfig.layout.roadHeight;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        // Top of feet collider = y + halfHeight - feetColliderHeight, must be >= roadY
        const minY: number = roadY - halfHeight + feetColliderHeight;
        // Bottom of feet collider = y + halfHeight, must be <= roadBottom
        const maxY: number = roadBottom - halfHeight;
        enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
    }

    private updateEnemies(deltaTime: number): void {
        if (!this.player) {
            return;
        }

        let aliveEnemyCount = 0;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy: Enemy = this.enemies[i];
            enemy.update(deltaTime);

            // Only update alive enemies
            if (enemy.animationState !== 'death' && !enemy.isDead) {
                // Get the target attack position for this enemy
                const targetPos = this.getEnemyTargetPosition(enemy);

                // Move toward the assigned attack position, not directly to the player
                enemy.moveToward(targetPos.x, targetPos.y, deltaTime, this.enemies);

                // Keep enemies within road bounds
                this.keepEnemyInBounds(enemy);
                aliveEnemyCount++;
            }

            // Award score when enemy just died
            if (enemy.justDied) {
                this.scoreManager.addScore(10);
            }
        }

        // Spawn new enemies when all are dead
        if (aliveEnemyCount === 0) {
            this.level += 1;
            this.spawnEnemies(this.level + 2);
        }
    }

    private checkCollisions(): void {
        if (!this.player) {
            return;
        }

        for (const enemy of this.enemies) {
            // Skip dead enemies for collision detection
            if (enemy.animationState === 'death' || enemy.isDead) {
                continue;
            }

            // Check if enemy can initiate attack based on distance
            if (enemy.canAttackPlayer(this.player)) {
                enemy.startAttack();
            }

            // Check if enemy's punch hits player during animation
            if (enemy.checkAttackHit(this.player)) {
                this.handleEnemyAttackHit(enemy);
            }

            // Check if player attack hits enemy
            if (this.player.isAttacking && this.player.checkAttackHit(enemy)) {
                this.handlePlayerAttackHit(enemy);
            }
        }
    }

    private handleEnemyAttackHit(enemy: Enemy): void {
        if (!this.player) {
            return;
        }

        this.player.takeDamage(balanceConfig.enemy.attack.damage);
        if (this.player.health <= 0) {
            this.endGame();
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
            this.onGameOver(this.scoreManager.getCurrentScore());
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
        if (scoreElement) scoreElement.textContent = String(this.scoreManager.getCurrentScore());
        if (levelElement) levelElement.textContent = String(this.level);
    }

    private render(): void {
        this.renderer.beginFrame();
        this.drawBackground();
        this.drawAttackPositions();
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

    /**
     * Draw visual indicators for attack positions on the floor
     */
    private drawAttackPositions(): void {
        const radius = balanceConfig.enemy.attackPositions.visualRadius;

        for (const pos of this.attackPositions) {
            // Draw outer circle (always visible)
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = pos.occupied ? '#ff4444' : '#44ff44';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw inner circle with transparency
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius * 0.6, 0, Math.PI * 2);
            this.ctx.fillStyle = pos.occupied ? 'rgba(255, 68, 68, 0.3)' : 'rgba(68, 255, 68, 0.3)';
            this.ctx.fill();

            // Draw crosshair in the center
            this.ctx.strokeStyle = pos.occupied ? '#ff4444' : '#44ff44';
            this.ctx.lineWidth = 1;

            // Horizontal line
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x - radius * 0.4, pos.y);
            this.ctx.lineTo(pos.x + radius * 0.4, pos.y);
            this.ctx.stroke();

            // Vertical line
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y - radius * 0.4);
            this.ctx.lineTo(pos.x, pos.y + radius * 0.4);
            this.ctx.stroke();

            // Add label (L or R) below the position
            this.ctx.font = '10px monospace';
            this.ctx.fillStyle = pos.occupied ? '#ff4444' : '#44ff44';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                pos.side === 'left' ? 'L' : 'R',
                pos.x,
                pos.y + radius + 12
            );
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
