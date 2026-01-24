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
    private hasDealtDamageThisAttack: boolean = false; // Track if damage was dealt in current attack

    // Animation progress (0-1) for gradual animations
    public animationProgress: number = 0;
    private walkAnimationTime: number = 0;
    private hurtAnimationTimer: number = 0;
    private deathAnimationTimer: number = 0;
    private punchAnimationTimer: number = 0;

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

    public moveToward(targetX: number, targetY: number, deltaTime: number, otherEnemies?: Enemy[], player?: Player): void {
        // Don't move if attacking or getting hit
        if (this.animationState === 'punch' || this.animationState === 'hurt') {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        const dx: number = targetX - this.x;
        const dy: number = targetY - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        const attackConfig = balanceConfig.enemy.attack;
        const collisionConfig = balanceConfig.collision.characterSeparation;
        const horizontalDistance: number = Math.abs(dx);
        const verticalDistance: number = Math.abs(dy);

        // Check if we're too close to the player (prevent merging)
        const tooCloseToPlayer: boolean = distance < collisionConfig.distance;

        // Check if we're facing the target (or will be after updating facing direction)
        const wouldBeFacingTarget: boolean = (dx > 0 && this.facingRight) || (dx < 0 && !this.facingRight) || dx === 0;

        // Check if we're in attack range (must be from the side, not above/below)
        const inAttackRange: boolean = wouldBeFacingTarget &&
            horizontalDistance >= attackConfig.minHorizontalDistance &&
            horizontalDistance < attackConfig.armLength &&
            verticalDistance < attackConfig.verticalThreshold;

        // If too close to player and can't attack, move away or circle around
        if (tooCloseToPlayer && !inAttackRange) {
            // Move to a flanking position - circle around to the side
            this.moveToFlankingPosition(dx, dy, distance, otherEnemies);
            return;
        }

        // If at good distance but wrong angle (e.g., above/below), circle to the sides
        if (!tooCloseToPlayer && !inAttackRange && horizontalDistance < verticalDistance) {
            // We're more vertically aligned than horizontally - move to the side
            this.moveToFlankingPosition(dx, dy, distance, otherEnemies);
            return;
        }

        this.updateFacingDirection(dx);

        // Calculate separation from other enemies to prevent clustering
        const enemySeparation = this.calculateSeparation(otherEnemies);
        const separationMagnitude = Math.sqrt(enemySeparation.x * enemySeparation.x + enemySeparation.y * enemySeparation.y);

        // If in attack range, stop or only apply enemy separation
        if (inAttackRange) {
            if (separationMagnitude < 0.1) {
                // Perfect position, stop
                this.velocityX = 0;
                this.velocityY = 0;
            } else {
                // Need to spread out from other enemies
                this.velocityX = (enemySeparation.x / separationMagnitude) * balanceConfig.enemy.speed;
                this.velocityY = (enemySeparation.y / separationMagnitude) * balanceConfig.enemy.speed;
            }
            return;
        }

        // Not in attack range, move toward player while avoiding other enemies
        this.setVelocityWithSeparation(dx, dy, distance, enemySeparation);
    }

    private moveToFlankingPosition(dx: number, dy: number, distance: number, otherEnemies?: Enemy[]): void {
        // Calculate a flanking position - move to the side of the player
        // Choose left or right based on which is closer
        const moveRight = dx > 0;

        // Calculate perpendicular direction (to circle around)
        // If player is to the right, move in a combination of right and sideways
        let targetDirX = dx;
        let targetDirY = dy;

        // If we're too vertically aligned, prioritize horizontal movement
        if (Math.abs(dy) > Math.abs(dx)) {
            // Move horizontally to get to the side
            targetDirX = moveRight ? 1 : -1;
            targetDirY = dy > 0 ? 0.3 : -0.3; // Small vertical component
        } else {
            // Move in an arc to circle around
            targetDirX = dx;
            targetDirY = dy * 0.5; // Reduce vertical component
        }

        this.updateFacingDirection(targetDirX);

        // Calculate separation from other enemies
        const enemySeparation = this.calculateSeparation(otherEnemies);

        // Combine flanking movement with enemy separation
        const finalDirX = targetDirX + enemySeparation.x;
        const finalDirY = targetDirY + enemySeparation.y;

        const finalDistance = Math.sqrt(finalDirX * finalDirX + finalDirY * finalDirY);

        if (finalDistance > 0) {
            this.velocityX = (finalDirX / finalDistance) * balanceConfig.enemy.speed;
            this.velocityY = (finalDirY / finalDistance) * balanceConfig.enemy.speed;
        } else {
            this.velocityX = targetDirX * balanceConfig.enemy.speed;
            this.velocityY = targetDirY * balanceConfig.enemy.speed;
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

        // Ensure enemy is attacking from the side (not from above/below)
        if (horizontalDistance < attackConfig.minHorizontalDistance) {
            return false;
        }

        // Check vertical threshold (small tolerance for minor alignment)
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

        // Ensure enemy is attacking from the side (not from above/below)
        if (horizontalDistance < attackConfig.minHorizontalDistance) {
            return false;
        }

        // Check vertical threshold (small tolerance for minor alignment)
        const verticalDistance: number = Math.abs(dy);
        if (verticalDistance > attackConfig.verticalThreshold) {
            return false;
        }

        return true;
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.triggerDeathAnimation();
            // Mark as inactive immediately so Game.ts can remove it
            this.active = false;
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
        // Note: active flag is already set to false in takeDamage()
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
