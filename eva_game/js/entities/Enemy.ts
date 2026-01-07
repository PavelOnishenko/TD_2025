import Entity from '../../../engine/core/Entity.js';
import { Viewport } from '../types/engine.js';
import { AnimationState } from '../types/game.js';
import Player from './Player.js';
import StickFigure from '../utils/StickFigure.js';

const ENEMY_SPEED: number = 80;
const ENEMY_ATTACK_RANGE: number = 40;
const ENEMY_ATTACK_COOLDOWN: number = 1500;
const ENEMY_DAMAGE: number = 10;
const ENEMY_PUNCH_DURATION: number = 300; // ms

export default class Enemy extends Entity {
    // Explicitly declare inherited properties from Entity
    declare x: number;
    declare y: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;
    declare width: number;
    declare height: number;

    // Explicitly declare inherited methods from Entity
    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    // Enemy-specific properties
    public health: number = 50;
    public maxHealth: number = 50;
    public facingRight: boolean = true;
    public animationState: AnimationState = 'idle';

    private attackCooldownTimer: number = 0;

    // Animation progress (0-1) for gradual animations
    public animationProgress: number = 0;
    private walkAnimationTime: number = 0;
    private deathAnimationTimer: number = 0;
    private punchAnimationTimer: number = 0;

    private static readonly WALK_ANIMATION_SPEED: number = 2.5; // cycles per second
    private static readonly DEATH_ANIMATION_DURATION: number = 1000; // ms

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 35;
        this.height = 55;
    }

    public update(deltaTime: number): void {
        this.move(deltaTime);
        this.updateAttackCooldown(deltaTime);
        this.updatePunchAnimation(deltaTime);
        this.updateAnimationState();
        this.updateAnimationProgress(deltaTime);
    }

    private updateAttackCooldown(deltaTime: number): void {
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime * 1000;
        }
    }

    private updatePunchAnimation(deltaTime: number): void {
        if (this.punchAnimationTimer > 0) {
            this.punchAnimationTimer -= deltaTime * 1000;
            if (this.punchAnimationTimer <= 0) {
                this.punchAnimationTimer = 0;
            }
        }
    }

    private updateAnimationState(): void {
        // Don't change animation state if dead
        if (this.animationState === 'death') {
            return;
        }

        // Punch animation takes priority when active
        if (this.punchAnimationTimer > 0) {
            this.animationState = 'punch';
            return;
        }

        this.animationState = (this.velocityX !== 0 || this.velocityY !== 0) ? 'walk' : 'idle';
    }

    private updateAnimationProgress(deltaTime: number): void {
        // Update animation progress based on current state
        switch (this.animationState) {
            case 'walk':
                // Continuous cycling animation for walking
                this.walkAnimationTime += deltaTime * Enemy.WALK_ANIMATION_SPEED;
                this.animationProgress = (this.walkAnimationTime % 1);
                break;

            case 'punch':
                // Progress through punch animation
                const punchProgress = 1 - (this.punchAnimationTimer / ENEMY_PUNCH_DURATION);
                this.animationProgress = Math.max(0, Math.min(1, punchProgress));
                break;

            case 'death':
                // Progress through death animation
                if (this.deathAnimationTimer > 0) {
                    this.deathAnimationTimer -= deltaTime * 1000;
                    const deathProgress = 1 - (this.deathAnimationTimer / Enemy.DEATH_ANIMATION_DURATION);
                    this.animationProgress = Math.max(0, Math.min(1, deathProgress));
                }
                break;

            case 'idle':
            default:
                // Reset animation progress for idle
                this.animationProgress = 0;
                this.walkAnimationTime = 0;
                break;
        }
    }

    public moveToward(targetX: number, targetY: number, deltaTime: number): void {
        const dx: number = targetX - this.x;
        const dy: number = targetY - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        if (distance < ENEMY_ATTACK_RANGE) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        this.updateFacingDirection(dx);
        this.setVelocityTowardTarget(dx, dy, distance);
    }

    private updateFacingDirection(dx: number): void {
        this.facingRight = dx > 0;
    }

    private setVelocityTowardTarget(dx: number, dy: number, distance: number): void {
        const dirX: number = dx / distance;
        const dirY: number = dy / distance;
        this.velocityX = dirX * ENEMY_SPEED;
        this.velocityY = dirY * ENEMY_SPEED;
    }

    public canAttackPlayer(player: Player): boolean {
        if (this.attackCooldownTimer > 0) {
            return false;
        }

        const dx: number = player.x - this.x;
        const dy: number = player.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        return distance <= ENEMY_ATTACK_RANGE;
    }

    public attackPlayer(player: Player): void {
        if (!this.canAttackPlayer(player)) {
            return;
        }

        player.takeDamage(ENEMY_DAMAGE);
        this.attackCooldownTimer = ENEMY_ATTACK_COOLDOWN;
        this.punchAnimationTimer = ENEMY_PUNCH_DURATION;
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.triggerDeathAnimation();
        }
    }

    private triggerDeathAnimation(): void {
        this.animationState = 'death';
        this.deathAnimationTimer = Enemy.DEATH_ANIMATION_DURATION;
        this.animationProgress = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        // Deactivate after death animation completes
        setTimeout(() => {
            this.active = false;
        }, Enemy.DEATH_ANIMATION_DURATION);
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
        const screenX: number = this.x;
        const screenY: number = this.y;

        this.drawStickFigure(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawStickFigure(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        // Get pose based on current animation state
        let pose = StickFigure.getIdlePose();

        switch (this.animationState) {
            case 'walk':
                pose = StickFigure.getWalkPose(this.animationProgress);
                break;
            case 'punch':
                pose = StickFigure.getPunchPose(this.animationProgress, this.facingRight);
                break;
            case 'death':
                pose = StickFigure.getDeathPose(this.animationProgress);
                break;
            case 'idle':
            default:
                pose = StickFigure.getIdlePose();
                break;
        }

        const color: string = '#ff6b6b'; // Red for enemies

        StickFigure.draw(ctx, screenX, screenY, pose, color, this.facingRight);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth: number = this.width;
        const barHeight: number = 3;
        const barY: number = screenY - this.height / 2 - 8;

        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent: number = this.health / this.maxHealth;
        const healthBarWidth: number = barWidth * healthPercent;
        const color: string = healthPercent > 0.5 ? '#ff4444' : '#ff8888';

        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
