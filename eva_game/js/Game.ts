import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import ScoreManager from '../../engine/core/ScoreManager.js';
import { Viewport, WorldBounds } from './types/engine.js';
import { GameOverCallback } from './types/game.js';
import Player from './entities/Player.js';
import Enemy from './entities/Enemy.js';
import AttackPositionManager from './systems/AttackPositionManager.js';
import { balanceConfig } from './config/balanceConfig.js';
import { decorationConfig } from './config/decorationConfig.js';

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
    private attackPositionManager: AttackPositionManager;
    private mouseScreenX: number = 0;
    private mouseScreenY: number = 0;
    private canvas: HTMLCanvasElement;

    public gameOver: boolean = false;
    public isPaused: boolean = false;
    public onGameOver: GameOverCallback | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;

        this.renderer = new Renderer(canvas, this.ctx);
        this.input = new InputManager();
        this.scoreManager = new ScoreManager();
        this.attackPositionManager = new AttackPositionManager();
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

        // Track mouse position for coordinate debug widgets
        this.canvas.addEventListener('mousemove', (e: MouseEvent) => this.handleMouseMove(e));
    }

    private handleMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = this.viewport?.dpr || window.devicePixelRatio || 1;
        // Screen coordinates in canvas pixel space (accounting for DPR)
        this.mouseScreenX = (e.clientX - rect.left) * dpr;
        this.mouseScreenY = (e.clientY - rect.top) * dpr;
    }

    private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const scale = this.viewport?.scale || 1;
        const offsetX = this.viewport?.offsetX || 0;
        const offsetY = this.viewport?.offsetY || 0;
        return {
            x: (screenX - offsetX) / scale,
            y: (screenY - offsetY) / scale,
        };
    }

    private initializeGame(): void {
        const centerX: number = balanceConfig.world.width / 2;
        // Spawn player in the middle of the allowed Y range
        const roadBoundaryTop: number = balanceConfig.layout.roadBoundaryTopY;
        const roadHeight: number = balanceConfig.layout.roadHeight;
        const playerHalfHeight: number = balanceConfig.player.height / 2;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        const roadBottom: number = roadBoundaryTop + roadHeight;
        const minY: number = roadBoundaryTop - playerHalfHeight + feetColliderHeight;
        const maxY: number = roadBottom - playerHalfHeight;
        const playerY: number = (minY + maxY) / 2;
        this.player = new Player(centerX, playerY);
        this.spawnEnemies(balanceConfig.spawn.initialEnemyCount);
    }

    private spawnEnemies(count: number): void {
        const roadBoundaryTop: number = balanceConfig.layout.roadBoundaryTopY;
        const roadHeight: number = balanceConfig.layout.roadHeight;
        const roadBottom: number = roadBoundaryTop + roadHeight;
        const enemyHalfHeight: number = balanceConfig.enemy.height / 2;
        const enemyHalfWidth: number = balanceConfig.enemy.width / 2;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        const waitingConfig = balanceConfig.waitingPoint;

        // Calculate waiting area X position (visible area on the right side)
        const waitingAreaX: number = balanceConfig.world.width - waitingConfig.distanceFromSpawn;

        for (let i = 0; i < count; i++) {
            // Spawn enemies off-screen to the right, with some spacing between them
            const x: number = balanceConfig.world.width + enemyHalfWidth + (i * 60);
            // Spawn enemies within allowed Y range (using feet collider bounds)
            const minY: number = roadBoundaryTop - enemyHalfHeight + feetColliderHeight;
            const maxY: number = roadBottom - enemyHalfHeight;
            const y: number = minY + Math.random() * (maxY - minY);

            // Assign a unique color to each enemy
            const color: string = ENEMY_COLORS[this.nextColorIndex % ENEMY_COLORS.length];
            this.nextColorIndex++;

            const enemy: Enemy = new Enemy(x, y, color);

            // Set up waiting point - spread enemies vertically to avoid stacking
            const verticalOffset: number = (i - (count - 1) / 2) * waitingConfig.verticalSpread;
            const waitingY: number = Math.max(minY, Math.min(maxY, (minY + maxY) / 2 + verticalOffset));
            enemy.waitingPoint = { x: waitingAreaX, y: waitingY };
            enemy.enemyState = 'movingToWaitingPoint';

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
        this.attackPositionManager.reset();
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

        // Vertical bounds: only feet collider restricted to road area
        const roadBoundaryTop: number = balanceConfig.layout.roadBoundaryTopY;
        const roadBottom: number = roadBoundaryTop + balanceConfig.layout.roadHeight;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        // Top of feet collider = y + halfHeight - feetColliderHeight, must be >= roadBoundaryTop
        const minY: number = roadBoundaryTop - halfHeight + feetColliderHeight;
        // Bottom of feet collider = y + halfHeight, must be <= roadBottom
        const maxY: number = roadBottom - halfHeight;
        this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
    }

    private keepEnemyInBounds(enemy: Enemy): void {
        const halfWidth: number = enemy.width / 2;
        const halfHeight: number = enemy.height / 2;

        // Horizontal bounds: only restrict left side, allow enemies to come from the right
        enemy.x = Math.max(halfWidth, enemy.x);

        // Vertical bounds: only feet collider restricted to road area
        const roadBoundaryTop: number = balanceConfig.layout.roadBoundaryTopY;
        const roadBottom: number = roadBoundaryTop + balanceConfig.layout.roadHeight;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;
        // Top of feet collider = y + halfHeight - feetColliderHeight, must be >= roadBoundaryTop
        const minY: number = roadBoundaryTop - halfHeight + feetColliderHeight;
        // Bottom of feet collider = y + halfHeight, must be <= roadBottom
        const maxY: number = roadBottom - halfHeight;
        enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
    }

    /**
     * Pick a random strafing target point within a circular area around the current attack position.
     * The point is clamped to stay within road bounds.
     */
    private pickStrafingTarget(enemy: Enemy): { x: number; y: number } {
        if (!this.player) {
            // Fallback to enemy's current position if no player
            return { x: enemy.x, y: enemy.y };
        }

        // Get the attack position (center of the strafing circle)
        const attackSide = this.attackPositionManager.determineSide(enemy, this.player);
        const attackPos = this.attackPositionManager.getAttackPosition(this.player, attackSide);

        // Pick a random point within the strafing area (outer ring, limited angle)
        const radius = balanceConfig.strafing.radius;
        const minRadiusFactor = balanceConfig.strafing.minRadiusFactor;
        const maxAngleRad = (balanceConfig.strafing.maxAngleDegrees * Math.PI) / 180;

        // Calculate current angle from attack position to enemy's current position
        const currentAngle = Math.atan2(enemy.y - attackPos.y, enemy.x - attackPos.x);

        // Select random angle within ±maxAngle of current angle
        const angleOffset = (Math.random() * 2 - 1) * maxAngleRad;
        const angle = currentAngle + angleOffset;

        // Select random distance from outer ring only (minRadius to radius)
        const minRadius = radius * minRadiusFactor;
        const distance = minRadius + Math.random() * (radius - minRadius);

        let targetX = attackPos.x + Math.cos(angle) * distance;
        let targetY = attackPos.y + Math.sin(angle) * distance;

        // Clamp to road bounds
        const roadBoundaryTop: number = balanceConfig.layout.roadBoundaryTopY;
        const roadBottom: number = roadBoundaryTop + balanceConfig.layout.roadHeight;
        const halfHeight: number = enemy.height / 2;
        const halfWidth: number = enemy.width / 2;
        const feetColliderHeight: number = balanceConfig.collision.feetColliderHeight;

        const minY: number = roadBoundaryTop - halfHeight + feetColliderHeight;
        const maxY: number = roadBottom - halfHeight;
        const minX: number = halfWidth;
        const maxX: number = balanceConfig.world.width - halfWidth;

        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));

        return { x: targetX, y: targetY };
    }

    private updateEnemies(deltaTime: number): void {
        if (!this.player) {
            return;
        }

        // Update attack position manager - assigns enemies to positions
        this.attackPositionManager.update(this.player, this.enemies);

        let aliveEnemyCount = 0;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy: Enemy = this.enemies[i];
            enemy.update(deltaTime);

            // Only update alive enemies
            if (enemy.animationState !== 'death' && !enemy.isDead) {
                // Movement based on enemy state
                switch (enemy.enemyState) {
                    case 'movingToWaitingPoint':
                        // Move toward waiting point after spawn
                        if (enemy.waitingPoint) {
                            enemy.moveToward(
                                enemy.waitingPoint.x,
                                enemy.waitingPoint.y,
                                deltaTime,
                                this.enemies
                            );

                            // Check if reached waiting point
                            const dx = enemy.x - enemy.waitingPoint.x;
                            const dy = enemy.y - enemy.waitingPoint.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < balanceConfig.waitingPoint.positionReachedThreshold) {
                                // Transition to strafing and pick initial strafing target
                                enemy.enemyState = 'strafing';
                                enemy.strafingTarget = this.pickStrafingTarget(enemy);
                            }
                        }
                        break;

                    case 'strafing':
                        // Move toward current strafing target point
                        if (enemy.strafingTarget) {
                            enemy.moveToward(
                                enemy.strafingTarget.x,
                                enemy.strafingTarget.y,
                                deltaTime,
                                this.enemies
                            );

                            // Check if reached strafing target
                            const strafeDx = enemy.x - enemy.strafingTarget.x;
                            const strafeDy = enemy.y - enemy.strafingTarget.y;
                            const strafeDistance = Math.sqrt(strafeDx * strafeDx + strafeDy * strafeDy);
                            if (strafeDistance < balanceConfig.strafing.positionReachedThreshold) {
                                // Pick a new random strafing target
                                enemy.strafingTarget = this.pickStrafingTarget(enemy);
                            }
                        } else {
                            // No strafing target set, pick one
                            enemy.strafingTarget = this.pickStrafingTarget(enemy);
                        }
                        break;

                    case 'movingToAttack':
                        // Move toward assigned attack position
                        if (enemy.assignedAttackPosition) {
                            enemy.moveToward(
                                enemy.assignedAttackPosition.x,
                                enemy.assignedAttackPosition.y,
                                deltaTime,
                                this.enemies
                            );
                        }
                        break;

                    case 'attacking':
                        // Enemy is at attack position - no movement, only attacking
                        // Movement back to attack position is handled by state transition
                        // to 'movingToAttack' in AttackPositionManager when player moves away
                        enemy.velocityX = 0;
                        enemy.velocityY = 0;
                        break;
                }

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
            // Start with 1 enemy, then 2, up to max 6
            const enemyCount = Math.min(this.level, 6);
            this.spawnEnemies(enemyCount);
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

            // Only enemies in 'attacking' state can attack the player
            if (enemy.enemyState === 'attacking') {
                // Check if enemy can initiate attack based on distance
                if (enemy.canAttackPlayer(this.player)) {
                    enemy.startAttack();
                }

                // Check if enemy's punch hits player during animation
                if (enemy.checkAttackHit(this.player)) {
                    this.handleEnemyAttackHit(enemy);
                }
            }

            // Check if player attack hits enemy (player can attack any enemy)
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
        // Draw attack position and strafing indicators on the ground (before entities)
        if (this.player) {
            this.attackPositionManager.drawIndicators(this.ctx, this.player, this.enemies);
        }
        this.drawEntities();
        this.renderer.endFrame();

        // Draw coordinate debug widgets (in screen space, after endFrame)
        this.drawCoordinateWidgets();

        // Draw enemy states widget on the left side
        this.drawEnemyStatesWidget();
    }

    private drawCoordinateWidgets(): void {
        const ctx = this.ctx;
        const worldCoords = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);

        // Widget styling
        const padding = 8;
        const lineHeight = 18;
        const fontSize = 14;
        const widgetWidth = 180;
        const widgetHeight = lineHeight * 2 + padding * 2;
        const cornerRadius = 6;
        const gap = 10;

        // Position at bottom-left corner
        const baseX = 10;
        const baseY = this.canvas.height - 10;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to screen space

        // Draw World Coords widget (bottom)
        const worldWidgetY = baseY - widgetHeight;
        this.drawWidgetBox(ctx, baseX, worldWidgetY, widgetWidth, widgetHeight, cornerRadius, 'rgba(0, 100, 0, 0.8)');
        ctx.fillStyle = '#00ff00';
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText('WORLD COORDS', baseX + padding, worldWidgetY + padding + fontSize);
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(`X: ${Math.round(worldCoords.x)}  Y: ${Math.round(worldCoords.y)}`, baseX + padding, worldWidgetY + padding + fontSize + lineHeight);

        // Draw Screen Coords widget (above world widget)
        const screenWidgetY = worldWidgetY - widgetHeight - gap;
        this.drawWidgetBox(ctx, baseX, screenWidgetY, widgetWidth, widgetHeight, cornerRadius, 'rgba(0, 0, 100, 0.8)');
        ctx.fillStyle = '#00aaff';
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText('SCREEN COORDS', baseX + padding, screenWidgetY + padding + fontSize);
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(`X: ${Math.round(this.mouseScreenX)}  Y: ${Math.round(this.mouseScreenY)}`, baseX + padding, screenWidgetY + padding + fontSize + lineHeight);

        ctx.restore();
    }

    private drawWidgetBox(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string): void {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    private drawEnemyStatesWidget(): void {
        const ctx = this.ctx;

        // Widget styling
        const padding = 10;
        const lineHeight = 22;
        const fontSize = 12;
        const widgetWidth = 200;
        const cornerRadius = 6;
        const colorIndicatorSize = 12;
        const gap = 6;

        // Calculate widget height based on number of enemies
        const headerHeight = 28;
        const enemyRowHeight = lineHeight;
        const aliveEnemies = this.enemies.filter(e => !e.isDead);
        const contentHeight = aliveEnemies.length > 0 ? aliveEnemies.length * enemyRowHeight : enemyRowHeight;
        const widgetHeight = headerHeight + contentHeight + padding * 2;

        // Position at top-left corner (below any potential HUD elements)
        const baseX = 10;
        const baseY = 100;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to screen space

        // Draw widget background
        this.drawWidgetBox(ctx, baseX, baseY, widgetWidth, widgetHeight, cornerRadius, 'rgba(40, 40, 60, 0.85)');

        // Draw header
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${fontSize + 2}px monospace`;
        ctx.fillText('ENEMY STATES', baseX + padding, baseY + padding + fontSize + 2);

        // Draw separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(baseX + padding, baseY + headerHeight);
        ctx.lineTo(baseX + widgetWidth - padding, baseY + headerHeight);
        ctx.stroke();

        // Draw enemy entries
        ctx.font = `${fontSize}px monospace`;

        if (aliveEnemies.length === 0) {
            ctx.fillStyle = '#888888';
            ctx.fillText('No enemies', baseX + padding, baseY + headerHeight + padding + fontSize);
        } else {
            aliveEnemies.forEach((enemy, index) => {
                const rowY = baseY + headerHeight + padding + (index * enemyRowHeight);

                // Draw color indicator (small circle)
                ctx.beginPath();
                ctx.arc(
                    baseX + padding + colorIndicatorSize / 2,
                    rowY + fontSize / 2 - 1,
                    colorIndicatorSize / 2,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = enemy.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Get state display info
                const stateInfo = this.getStateDisplayInfo(enemy.enemyState);

                // Draw state text with color coding
                ctx.fillStyle = stateInfo.color;
                ctx.fillText(
                    stateInfo.label,
                    baseX + padding + colorIndicatorSize + gap,
                    rowY + fontSize
                );

                // Draw animation state in smaller text
                ctx.fillStyle = '#888888';
                ctx.font = `${fontSize - 2}px monospace`;
                ctx.fillText(
                    `[${enemy.animationState}]`,
                    baseX + padding + colorIndicatorSize + gap + 95,
                    rowY + fontSize
                );
                ctx.font = `${fontSize}px monospace`;
            });
        }

        ctx.restore();
    }

    private getStateDisplayInfo(state: string): { label: string; color: string } {
        switch (state) {
            case 'movingToWaitingPoint':
                return { label: 'Moving to Wait', color: '#aaaaaa' };
            case 'strafing':
                return { label: 'Strafing', color: '#ffcc00' };
            case 'movingToAttack':
                return { label: 'Approaching', color: '#ff9900' };
            case 'attacking':
                return { label: 'ATTACKING', color: '#ff4444' };
            default:
                return { label: state, color: '#ffffff' };
        }
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
        this.drawRoadGrid(roadY, roadHeight);

        // Dividing line between background and road
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(balanceConfig.world.width, roadY);
        this.ctx.stroke();
    }

    private drawRoadGrid(roadY: number, roadHeight: number): void {
        const gridConfig = decorationConfig.grid;

        this.ctx.strokeStyle = gridConfig.strokeColor;
        this.ctx.lineWidth = gridConfig.lineWidth;

        const roadBottom = roadY + roadHeight;
        const centerX = balanceConfig.world.width / 2;
        const worldWidth = balanceConfig.world.width;

        // Perspective factor from config
        const perspectiveFactor = gridConfig.perspective.factor;

        // Clip to road area only - no drawing outside road bounds
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, roadY, worldWidth, roadHeight);
        this.ctx.clip();

        // Calculate extended range to cover full width at the top
        // To reach topX=0, we need bottomX = centerX * (1 - 1/perspectiveFactor)
        // To reach topX=width, we need bottomX = centerX * (1 + 1/perspectiveFactor)
        const expansionFactor = 1 / perspectiveFactor;
        const extendedLeft = centerX * (1 - expansionFactor);
        const extendedRight = centerX * (1 + expansionFactor);

        // Draw vertical lines with perspective (converging towards center)
        // Use extended range to ensure full coverage at the top
        for (let x = extendedLeft; x <= extendedRight; x += gridConfig.cellSize) {
            // Calculate how far this line is from center (normalized)
            const offsetFromCenter = (x - centerX) / centerX;

            // Top point: closer to center (perspective effect)
            const topX = centerX + (offsetFromCenter * centerX * perspectiveFactor);

            // Bottom point: at the actual x position (no perspective)
            const bottomX = x;

            this.ctx.beginPath();
            this.ctx.moveTo(topX, roadY);
            this.ctx.lineTo(bottomX, roadBottom);
            this.ctx.stroke();
        }

        // Draw horizontal lines with perspective (getting narrower towards top)
        const numHorizontalLines = Math.floor(roadHeight / gridConfig.cellSize);
        for (let i = 0; i <= numHorizontalLines; i++) {
            const y = roadY + (i * gridConfig.cellSize);

            // Calculate depth factor (0 at top, 1 at bottom)
            const depth = (y - roadY) / roadHeight;

            // Interpolate width based on depth
            const widthAtThisDepth = perspectiveFactor + (1 - perspectiveFactor) * depth;
            const halfWidth = (worldWidth / 2) * widthAtThisDepth;

            const leftX = centerX - halfWidth;
            const rightX = centerX + halfWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(leftX, y);
            this.ctx.lineTo(rightX, y);
            this.ctx.stroke();
        }

        // Restore context to remove clipping
        this.ctx.restore();
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
