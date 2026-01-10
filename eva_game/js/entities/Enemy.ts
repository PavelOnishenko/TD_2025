import Entity from '../../../engine/core/Entity.js';
import { Viewport } from '../types/engine.js';
import { AnimationState } from '../types/game.js';
import Player from './Player.js';
import StickFigure from '../utils/StickFigure.js';
import { balanceConfig } from '../config/balanceConfig.js';

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
    public health: number;
    public maxHealth: number;
    public facingRight: boolean = true;
    public animationState: AnimationState = 'idle';
    public color: string;

    private attackCooldownTimer: number = 0;

    // Animation progress (0-1) for gradual animations
    public animationProgress: number = 0;
    private walkAnimationTime: number = 0;
    private deathAnimationTimer: number = 0;
    private punchAnimationTimer: number = 0;

    private static readonly WALK_ANIMATION_SPEED: number = 2.5; // cycles per second
    private static readonly DEATH_ANIMATION_DURATION: number = 1000; // ms

    constructor(x: number, y: number, color: string = '#ff6b6b') {
        super(x, y);
        this.width = 35;
        this.height = 55;
        this.color = color;
        this.health = balanceConfig.enemy.health;
        this.maxHealth = balanceConfig.enemy.health;
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
                const punchProgress = 1 - (this.punchAnimationTimer / balanceConfig.enemy.attack.punchDuration);
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

    public moveToward(targetX: number, targetY: number, deltaTime: number, otherEnemies?: Enemy[]): void {
        const dx: number = targetX - this.x;
        const dy: number = targetY - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        if (distance < balanceConfig.enemy.attack.range) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        this.updateFacingDirection(dx);

        // Calculate separation from other enemies to prevent clustering
        const separation = this.calculateSeparation(otherEnemies);

        // Combine player-seeking with enemy separation
        this.setVelocityWithSeparation(dx, dy, distance, separation);
    }

    private updateFacingDirection(dx: number): void {
        this.facingRight = dx > 0;
    }

    private calculateSeparation(otherEnemies?: Enemy[]): { x: number; y: number } {
        const separation = { x: 0, y: 0 };

        if (!otherEnemies || otherEnemies.length === 0) {
            return separation;
        }

        let separationCount = 0;

        for (const other of otherEnemies) {
            // Skip self and dead enemies
            if (other === this || other.animationState === 'death') {
                continue;
            }

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If enemy is too close, push away
            if (distance > 0 && distance < balanceConfig.enemy.separation.distance) {
                // Normalize and weight by how close they are (closer = stronger push)
                const strength = (1 - distance / balanceConfig.enemy.separation.distance) * balanceConfig.enemy.separation.strength;
                separation.x += (dx / distance) * strength;
                separation.y += (dy / distance) * strength;
                separationCount++;
            }
        }

        // Average the separation force
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
        }

        return separation;
    }

    private setVelocityWithSeparation(dx: number, dy: number, distance: number, separation: { x: number; y: number }): void {
        // Normalize direction to player
        const dirX: number = dx / distance;
        const dirY: number = dy / distance;

        // Combine player-seeking direction with separation force
        const finalDirX = dirX + separation.x;
        const finalDirY = dirY + separation.y;

        // Normalize the combined direction
        const finalDistance = Math.sqrt(finalDirX * finalDirX + finalDirY * finalDirY);

        if (finalDistance > 0) {
            this.velocityX = (finalDirX / finalDistance) * balanceConfig.enemy.speed;
            this.velocityY = (finalDirY / finalDistance) * balanceConfig.enemy.speed;
        } else {
            // Fallback to simple player-seeking if no combined direction
            this.velocityX = dirX * balanceConfig.enemy.speed;
            this.velocityY = dirY * balanceConfig.enemy.speed;
        }
    }

    public canAttackPlayer(player: Player): boolean {
        if (this.attackCooldownTimer > 0) {
            return false;
        }

        const dx: number = player.x - this.x;
        const dy: number = player.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        return distance <= balanceConfig.enemy.attack.range;
    }

    public attackPlayer(player: Player): void {
        if (!this.canAttackPlayer(player)) {
            return;
        }

        player.takeDamage(balanceConfig.enemy.attack.damage);
        this.attackCooldownTimer = balanceConfig.enemy.attack.cooldown;
        this.punchAnimationTimer = balanceConfig.enemy.attack.punchDuration;
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

        StickFigure.draw(ctx, screenX, screenY, pose, this.color, this.facingRight);
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
