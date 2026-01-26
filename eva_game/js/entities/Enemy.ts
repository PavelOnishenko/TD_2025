import Entity from '../../../engine/core/Entity.js';
import { Viewport } from '../types/engine.js';
import { AnimationState, EnemyState } from '../types/game.js';
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
    public isDead: boolean = false; // Track if enemy is dead (after death animation completes)
    public justDied: boolean = false; // True for one frame when enemy dies (for score tracking)

    // Attack position system state
    public enemyState: EnemyState = 'movingToWaitingPoint'; // Current behavior state
    public assignedAttackPosition: { x: number; y: number } | null = null; // Currently assigned attack position
    public waitingPoint: { x: number; y: number } | null = null; // Point to move to after spawning
    public strafingTarget: { x: number; y: number } | null = null; // Current target point during strafing

    private attackCooldownTimer: number = 0;
    private hasDealtDamageThisAttack: boolean = false; // Track if damage was dealt in current attack

    // Animation progress (0-1) for gradual animations
    public animationProgress: number = 0;
    private walkAnimationTime: number = 0;
    private hurtAnimationTimer: number = 0;
    private deathAnimationTimer: number = 0;
    private punchAnimationTimer: number = 0;
    private tauntAnimationTimer: number = 0;

    private static readonly WALK_ANIMATION_SPEED: number = 2.5; // cycles per second

    constructor(x: number, y: number, color: string = '#ff6b6b') {
        super(x, y);
        const config = balanceConfig.enemy;

        this.width = config.width;
        this.height = config.height;
        // Use either health or maxHealth (they're kept in sync in config)
        this.maxHealth = config.maxHealth;
        this.health = this.maxHealth;
        this.color = color;
    }

    public update(deltaTime: number): void {
        // Clear the justDied flag (it's only true for one frame)
        this.justDied = false;

        // Dead enemies only update their animation progress
        if (this.isDead) {
            return;
        }

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
                this.hasDealtDamageThisAttack = false; // Reset for next attack
            }
        }
    }

    private updateAnimationState(): void {
        // Don't change animation state if dead or hurt
        if (this.animationState === 'death' || this.animationState === 'hurt') {
            return;
        }

        // Punch animation takes priority when active
        if (this.punchAnimationTimer > 0) {
            this.animationState = 'punch';
            return;
        }

        // Taunt animation takes priority when active
        if (this.tauntAnimationTimer > 0) {
            this.animationState = 'taunt';
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

            case 'hurt':
                // Progress through hurt animation
                if (this.hurtAnimationTimer > 0) {
                    this.hurtAnimationTimer -= deltaTime * 1000;
                    const hurtProgress = 1 - (this.hurtAnimationTimer / balanceConfig.enemy.attack.hurtAnimationDuration);
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
                    const deathProgress = 1 - (this.deathAnimationTimer / balanceConfig.enemy.attack.deathAnimationDuration);
                    this.animationProgress = Math.max(0, Math.min(1, deathProgress));

                    // When animation completes, mark as dead (but keep rendering)
                    if (this.deathAnimationTimer <= 0) {
                        this.isDead = true;
                        this.animationProgress = 1; // Keep at final pose
                    }
                }
                break;

            case 'taunt':
                // Progress through taunt animation
                if (this.tauntAnimationTimer > 0) {
                    this.tauntAnimationTimer -= deltaTime * 1000;
                    const tauntProgress = 1 - (this.tauntAnimationTimer / balanceConfig.strafing.tauntDuration);
                    this.animationProgress = Math.max(0, Math.min(1, tauntProgress));

                    if (this.tauntAnimationTimer <= 0) {
                        this.animationState = 'idle';
                        this.animationProgress = 0;
                    }
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
        // Don't move if attacking, getting hit, or taunting
        if (this.animationState === 'punch' || this.animationState === 'hurt' || this.animationState === 'taunt') {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        const dx: number = targetX - this.x;
        const dy: number = targetY - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        // Check if we've reached the target position
        const positionThreshold = balanceConfig.attackPosition.positionReachedThreshold;

        // Check if we're close enough to the target position to stop
        const reachedTarget: boolean = distance + balanceConfig.attackPosition.attackPointThreshold <= positionThreshold;

        this.updateFacingDirection(dx);

        // Always calculate separation from other enemies to prevent clustering
        const separation = this.calculateSeparation(otherEnemies);

        // Calculate separation magnitude to determine if we need to move
        const separationMagnitude = Math.sqrt(separation.x * separation.x + separation.y * separation.y);

        // Stop only if reached target AND no significant separation force is pushing us
        // This allows enemies to spread out even when at their target position
        if (reachedTarget && separationMagnitude < 0.1) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        // If reached target but separation is pushing us, prioritize separation
        if (reachedTarget) {
            // Apply only separation force to spread out
            const separationDistance = Math.sqrt(separation.x * separation.x + separation.y * separation.y);
            if (separationDistance > 0) {
                this.velocityX = (separation.x / separationDistance) * balanceConfig.enemy.speed;
                this.velocityY = (separation.y / separationDistance) * balanceConfig.enemy.speed;
            } else {
                this.velocityX = 0;
                this.velocityY = 0;
            }
        } else {
            // Not at target yet, combine target-seeking with enemy separation
            this.setVelocityWithSeparation(dx, dy, distance, separation);
        }
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
        const config = balanceConfig.enemy;

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
        // Can't attack while getting hit
        if (this.animationState === 'hurt') {
            return false;
        }

        if (this.attackCooldownTimer > 0) {
            return false;
        }

        const attackConfig = balanceConfig.enemy.attack;

        // Calculate horizontal distance from enemy to player
        const dx: number = player.x - this.x;
        const dy: number = player.y - this.y;

        // Check if player is in facing direction
        const isFacingPlayer: boolean = (this.facingRight && dx > 0) || (!this.facingRight && dx < 0);
        if (!isFacingPlayer) {
            return false;
        }

        // Check horizontal range (arm length) in facing direction
        const horizontalDistance: number = Math.abs(dx);
        if (horizontalDistance > attackConfig.armLength) {
            return false;
        }

        // Check vertical threshold
        const verticalDistance: number = Math.abs(dy);
        if (verticalDistance > attackConfig.verticalThreshold) {
            return false;
        }

        return true;
    }

    public startAttack(): void {
        this.attackCooldownTimer = balanceConfig.enemy.attack.cooldown;
        this.punchAnimationTimer = balanceConfig.enemy.attack.punchDuration;
        this.hasDealtDamageThisAttack = false; // Reset damage tracking for new attack
    }

    public startTaunt(): void {
        this.tauntAnimationTimer = balanceConfig.strafing.tauntDuration;
        this.animationProgress = 0;
    }

    public isTaunting(): boolean {
        return this.tauntAnimationTimer > 0;
    }

    public checkAttackHit(player: Player): boolean {
        // Check if punch animation is active
        if (this.punchAnimationTimer <= 0) {
            return false;
        }

        // Only detect hits when arm is actually extended (mid-animation)
        // Hit window is during the extension phase of the punch
        const hitWindowStart = 0.3;
        const hitWindowEnd = 0.7;
        if (this.animationProgress < hitWindowStart || this.animationProgress > hitWindowEnd) {
            return false;
        }

        // Check if we've already dealt damage during this attack
        if (this.hasDealtDamageThisAttack) {
            return false;
        }

        // Check if player is in range
        if (this.isPlayerInAttackRange(player)) {
            // Mark that we've dealt damage for this attack
            this.hasDealtDamageThisAttack = true;
            return true;
        }

        return false;
    }

    private isPlayerInAttackRange(player: Player): boolean {
        const attackConfig = balanceConfig.enemy.attack;

        // Calculate horizontal distance from enemy to player
        const dx: number = player.x - this.x;
        const dy: number = player.y - this.y;

        // Check if player is in facing direction
        const isFacingPlayer: boolean = (this.facingRight && dx > 0) || (!this.facingRight && dx < 0);
        if (!isFacingPlayer) {
            return false;
        }

        // Check horizontal range (arm length) in facing direction
        const horizontalDistance: number = Math.abs(dx);
        if (horizontalDistance > attackConfig.armLength) {
            return false;
        }

        // Check vertical threshold
        const verticalDistance: number = Math.abs(dy);
        if (verticalDistance > attackConfig.verticalThreshold) {
            return false;
        }

        return true;
    }

    public takeDamage(amount: number): void {
        // Can't take damage if already dead
        if (this.animationState === 'death') {
            return;
        }

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.triggerDeathAnimation();
            // Don't set active = false - let the death animation play
        } else {
            this.triggerHurtAnimation();
        }
    }

    private triggerHurtAnimation(): void {
        // Only trigger hurt if not already in hurt or death state
        if (this.animationState !== 'hurt' && this.animationState !== 'death') {
            this.animationState = 'hurt';
            this.hurtAnimationTimer = balanceConfig.enemy.attack.hurtAnimationDuration;
            this.animationProgress = 0;
        }
    }

    private triggerDeathAnimation(): void {
        this.animationState = 'death';
        this.deathAnimationTimer = balanceConfig.enemy.attack.deathAnimationDuration;
        this.animationProgress = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.justDied = true; // Set flag for score tracking
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
        // Don't draw enemies outside the visible game arena (in the "darkness" beyond the edges)
        // They still exist as physical objects but are invisible until they enter the playable area
        const halfWidth = this.width / 2;
        if (this.x + halfWidth < 0 || this.x - halfWidth > balanceConfig.world.width) {
            return; // Enemy is outside the visible arena, don't render
        }

        const screenX: number = this.x;
        const screenY: number = this.y;

        this.drawStickFigure(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);
        this.drawCoordinatePoint(ctx, screenX, screenY);
    }

    private drawCoordinatePoint(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        // Don't draw coordinate point for dead enemies
        if (this.animationState === 'death' || this.isDead) {
            return;
        }

        // Draw a small circle at the exact coordinate point
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000'; // Red for enemies
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw coordinate text
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        const coordText = `(${Math.round(screenX)}, ${Math.round(screenY)})`;
        ctx.strokeText(coordText, screenX + 8, screenY - 8);
        ctx.fillText(coordText, screenX + 8, screenY - 8);
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
            case 'taunt':
                pose = StickFigure.getTauntPose(this.animationProgress);
                break;
            case 'idle':
            default:
                pose = StickFigure.getIdlePose();
                break;
        }

        StickFigure.draw(ctx, screenX, screenY, pose, this.color, this.facingRight, balanceConfig.enemy.scale);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        // Don't draw health bar for dead enemies
        if (this.animationState === 'death') {
            return;
        }

        const barWidth: number = this.width;
        const barHeight: number = 3;
        // screenY is now at feet position, figure extends upward
        // Visual height: (25 + 20 + 8) * scale = 53 * scale (feet offset + head offset + head radius)
        const visualHeight: number = 53 * balanceConfig.enemy.scale;
        const barY: number = screenY - visualHeight - 8;

        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent: number = this.health / this.maxHealth;
        const healthBarWidth: number = barWidth * healthPercent;
        const color: string = healthPercent > 0.5 ? '#ff4444' : '#ff8888';

        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
