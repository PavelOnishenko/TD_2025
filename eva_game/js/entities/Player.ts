import Entity from '../../../engine/core/Entity.js';
import InputManager from '../../../engine/systems/InputManager.js';
import { Viewport } from '../types/engine.js';
import { AnimationState } from '../types/game.js';
import StickFigure from '../utils/StickFigure.js';
import { balanceConfig } from '../config/balanceConfig.js';

export default class Player extends Entity {
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

    // Player-specific properties
    public health: number;
    public maxHealth: number;
    public attackDamage: number;
    public isAttacking: boolean = false;
    public invulnerable: boolean = false;
    public facingRight: boolean = true;
    public animationState: AnimationState = 'idle';

    private attackTimer: number = 0;
    private attackCooldownTimer: number = 0;
    private invulnerabilityTimer: number = 0;

    // Animation progress (0-1) for gradual animations
    public animationProgress: number = 0;
    private walkAnimationTime: number = 0;
    private hurtAnimationTimer: number = 0;
    private deathAnimationTimer: number = 0;

    private static readonly WALK_ANIMATION_SPEED: number = 3; // cycles per second
    private static readonly HURT_ANIMATION_DURATION: number = 400; // ms
    private static readonly DEATH_ANIMATION_DURATION: number = 1000; // ms

    constructor(x: number, y: number) {
        super(x, y);
        const config = balanceConfig.player;

        this.width = config.width;
        this.height = config.height;
        this.maxHealth = config.maxHealth;
        this.health = this.maxHealth;
        this.attackDamage = config.attackDamage;
    }

    public handleInput(horizontalInput: number, verticalInput: number, input: InputManager): void {
        this.updateMovement(horizontalInput, verticalInput);
        this.updateAttack(input);
    }

    private updateMovement(horizontalInput: number, verticalInput: number): void {
        if (this.isAttacking) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        this.velocityX = horizontalInput * balanceConfig.player.speed;
        this.velocityY = verticalInput * balanceConfig.player.speed;

        if (horizontalInput > 0) {
            this.facingRight = true;
        } else if (horizontalInput < 0) {
            this.facingRight = false;
        }

        this.animationState = (this.velocityX !== 0 || this.velocityY !== 0) ? 'walk' : 'idle';
    }

    private updateAttack(input: InputManager): void {
        if (this.attackCooldownTimer > 0) {
            return;
        }

        if (input.wasActionPressed('attack') && !this.isAttacking) {
            this.startAttack();
        }
    }

    private startAttack(): void {
        console.log('Player attack initiated');
        this.isAttacking = true;
        this.attackTimer = balanceConfig.player.attackDuration;
        this.attackCooldownTimer = balanceConfig.player.attackCooldown;
        this.animationState = 'punch';
    }

    public update(deltaTime: number): void {
        this.move(deltaTime);
        this.updateAttackTimer(deltaTime);
        this.updateInvulnerability(deltaTime);
        this.updateAnimationProgress(deltaTime);
    }

    private updateAttackTimer(deltaTime: number): void {
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime * 1000;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.animationState = 'idle';
            }
        }

        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime * 1000;
        }
    }

    private updateInvulnerability(deltaTime: number): void {
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime * 1000;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    private updateAnimationProgress(deltaTime: number): void {
        // Update animation progress based on current state
        switch (this.animationState) {
            case 'walk':
                // Continuous cycling animation for walking
                this.walkAnimationTime += deltaTime * Player.WALK_ANIMATION_SPEED;
                this.animationProgress = (this.walkAnimationTime % 1);
                break;

            case 'punch':
                // Progress through punch animation during attack
                const attackProgress = 1 - (this.attackTimer / balanceConfig.player.attackDuration);
                this.animationProgress = Math.max(0, Math.min(1, attackProgress));
                break;

            case 'hurt':
                // Progress through hurt animation
                if (this.hurtAnimationTimer > 0) {
                    this.hurtAnimationTimer -= deltaTime * 1000;
                    const hurtProgress = 1 - (this.hurtAnimationTimer / Player.HURT_ANIMATION_DURATION);
                    this.animationProgress = Math.max(0, Math.min(1, hurtProgress));

                    if (this.hurtAnimationTimer <= 0) {
                        this.animationState = 'idle';
                        this.animationProgress = 0;
                    }
                }
                break;

            case 'death':
                // Progress through death animation
                if (this.deathAnimationTimer > 0) {
                    this.deathAnimationTimer -= deltaTime * 1000;
                    const deathProgress = 1 - (this.deathAnimationTimer / Player.DEATH_ANIMATION_DURATION);
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

    public takeDamage(amount: number): void {
        if (this.invulnerable) {
            return;
        }

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.triggerDeathAnimation();
        } else {
            this.triggerHurtAnimation();
        }

        this.invulnerable = true;
        this.invulnerabilityTimer = balanceConfig.player.invulnerabilityDuration;
    }

    private triggerHurtAnimation(): void {
        // Only trigger hurt if not already in hurt or death state
        if (this.animationState !== 'hurt' && this.animationState !== 'death') {
            this.animationState = 'hurt';
            this.hurtAnimationTimer = Player.HURT_ANIMATION_DURATION;
            this.animationProgress = 0;
        }
    }

    private triggerDeathAnimation(): void {
        this.animationState = 'death';
        this.deathAnimationTimer = Player.DEATH_ANIMATION_DURATION;
        this.animationProgress = 0;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    public checkAttackHit(enemy: Entity): boolean {
        if (!this.isAttacking) {
            return false;
        }

        return this.isEnemyInAttackRange(enemy);
    }

    private isEnemyInAttackRange(enemy: Entity): boolean {
        const dx: number = enemy.x - this.x;
        const dy: number = enemy.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const isFacingEnemy: boolean = this.isFacingTowards(dx);

        return distance <= balanceConfig.player.attackRange && isFacingEnemy;
    }

    private isFacingTowards(dx: number): boolean {
        return (this.facingRight && dx > 0) || (!this.facingRight && dx < 0);
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
        const screenX: number = this.x;
        const screenY: number = this.y;

        this.drawStickFigure(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);

        if (this.isAttacking) {
            this.drawAttackIndicator(ctx, screenX, screenY);
        }
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
            case 'hurt':
                pose = StickFigure.getHurtPose(this.animationProgress);
                break;
            case 'death':
                pose = StickFigure.getDeathPose(this.animationProgress);
                break;
            case 'idle':
            default:
                pose = StickFigure.getIdlePose();
                break;
        }

        // Apply flashing effect when invulnerable
        const isFlashing: boolean = this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0;
        const color: string = isFlashing ? 'rgba(100, 200, 255, 0.5)' : '#64c8ff';

        StickFigure.draw(ctx, screenX, screenY, pose, color, this.facingRight);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth: number = this.width;
        const barHeight: number = 4;
        const barY: number = screenY - this.height / 2 - 10;

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent: number = this.health / this.maxHealth;
        const healthBarWidth: number = barWidth * healthPercent;
        const color: string = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';

        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }

    private drawAttackIndicator(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const attackX: number = this.facingRight ? screenX + balanceConfig.player.attackRange : screenX - balanceConfig.player.attackRange;
        ctx.arc(attackX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();
    }
}
