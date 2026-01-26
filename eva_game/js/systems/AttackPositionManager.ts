import Enemy from '../entities/Enemy.js';
import Player from '../entities/Player.js';
import { balanceConfig } from '../config/balanceConfig.js';

/**
 * Manages attack positions around the player.
 * Only one enemy can attack at a time from one side.
 * Other enemies wait until the position becomes available.
 */
export default class AttackPositionManager {
    // The enemy currently assigned to attack (or moving to attack position)
    private assignedEnemy: Enemy | null = null;

    // Which side the current attack is from ('left' or 'right')
    private attackSide: 'left' | 'right' | null = null;

    /**
     * Get the attack position coordinates based on player position and side
     */
    public getAttackPosition(player: Player, side: 'left' | 'right'): { x: number; y: number } {
        const distance = balanceConfig.attackPosition.distanceFromPlayer;
        const offsetX = side === 'left' ? -distance : distance;
        return {
            x: player.x + offsetX,
            y: player.y,
        };
    }

    /**
     * Determine which side an enemy should attack from based on their position
     */
    public determineSide(enemy: Enemy, player: Player): 'left' | 'right' {
        return enemy.x < player.x ? 'left' : 'right';
    }

    /**
     * Check if there's an enemy assigned to attack
     */
    public hasAssignedEnemy(): boolean {
        return this.assignedEnemy !== null;
    }

    /**
     * Get the currently assigned enemy
     */
    public getAssignedEnemy(): Enemy | null {
        return this.assignedEnemy;
    }

    /**
     * Get the current attack side
     */
    public getAttackSide(): 'left' | 'right' | null {
        return this.attackSide;
    }

    /**
     * Assign an enemy to attack position
     * Returns true if successfully assigned, false if position is occupied
     */
    public assignEnemy(enemy: Enemy, player: Player): boolean {
        // If position is already occupied, cannot assign
        if (this.assignedEnemy !== null) {
            return false;
        }

        const side = this.determineSide(enemy, player);
        const position = this.getAttackPosition(player, side);

        this.assignedEnemy = enemy;
        this.attackSide = side;
        enemy.enemyState = 'movingToAttack';
        enemy.assignedAttackPosition = position;

        return true;
    }

    /**
     * Release the attack position (when enemy dies or needs to be removed)
     */
    public releasePosition(): void {
        if (this.assignedEnemy) {
            this.assignedEnemy.assignedAttackPosition = null;
            // Don't change state - enemy might be dead
        }
        this.assignedEnemy = null;
        this.attackSide = null;
    }

    /**
     * Update attack positions based on current player position
     * Should be called each frame
     */
    public update(player: Player, enemies: Enemy[]): void {
        // Check if assigned enemy is dead or no longer valid
        if (this.assignedEnemy) {
            if (this.assignedEnemy.animationState === 'death' || this.assignedEnemy.isDead) {
                this.releasePosition();
            }
        }

        // Update the assigned enemy's target position (it moves with player)
        // Also recalculate the attack side based on current enemy position
        if (this.assignedEnemy) {
            // Dynamically recalculate which side the enemy should attack from
            this.attackSide = this.determineSide(this.assignedEnemy, player);
            const position = this.getAttackPosition(player, this.attackSide);
            this.assignedEnemy.assignedAttackPosition = position;

            // Calculate distance to attack position
            const threshold = balanceConfig.attackPosition.positionReachedThreshold;
            const dx = this.assignedEnemy.x - position.x;
            const dy = this.assignedEnemy.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if enemy has reached the attack position
            if (this.assignedEnemy.enemyState === 'movingToAttack') {
                if (distance < threshold) {
                    this.assignedEnemy.enemyState = 'attacking';
                }
            }
            // Check if enemy in attacking state has moved too far from attack position
            // (happens when player moves away) - switch back to movingToAttack
            else if (this.assignedEnemy.enemyState === 'attacking') {
                if (distance >= threshold) {
                    this.assignedEnemy.enemyState = 'movingToAttack';
                }
            }
        }

        // If no enemy assigned, find the closest strafing enemy to the attack position and assign them
        if (!this.assignedEnemy) {
            const strafingEnemies = enemies.filter(e =>
                e.enemyState === 'strafing' &&
                e.animationState !== 'death' &&
                !e.isDead
            );

            if (strafingEnemies.length > 0) {
                // Find closest strafing enemy to the attack position
                let closestEnemy: Enemy | null = null;
                let closestDistance = Infinity;

                for (const enemy of strafingEnemies) {
                    // Calculate distance to the attack position (not to player)
                    const side = this.determineSide(enemy, player);
                    const attackPos = this.getAttackPosition(player, side);
                    const dx = enemy.x - attackPos.x;
                    const dy = enemy.y - attackPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                }

                if (closestEnemy) {
                    // Clear strafing target when transitioning to attack
                    closestEnemy.strafingTarget = null;
                    this.assignEnemy(closestEnemy, player);
                }
            }
        }

        // Make sure all non-assigned alive enemies that have reached waiting point are in strafing state
        // Don't interfere with enemies still moving to their waiting point
        for (const enemy of enemies) {
            if (enemy !== this.assignedEnemy &&
                enemy.animationState !== 'death' &&
                !enemy.isDead &&
                enemy.enemyState !== 'strafing' &&
                enemy.enemyState !== 'movingToWaitingPoint') {
                enemy.enemyState = 'strafing';
                enemy.assignedAttackPosition = null;
            }
        }
    }

    /**
     * Get current attack position for drawing indicators
     * Returns null if no enemy is assigned
     */
    public getCurrentAttackPosition(player: Player): { x: number; y: number; enemy: Enemy } | null {
        if (!this.assignedEnemy || !this.attackSide) {
            return null;
        }

        const position = this.getAttackPosition(player, this.attackSide);
        return {
            x: position.x,
            y: position.y,
            enemy: this.assignedEnemy,
        };
    }

    /**
     * Draw attack position indicators and strafing target indicators
     * This should be called BEFORE drawing entities so indicators appear beneath them
     */
    public drawIndicators(ctx: CanvasRenderingContext2D, player: Player, enemies?: Enemy[]): void {
        // Draw strafing indicators first (so attack indicators appear on top)
        if (enemies) {
            this.drawStrafingIndicators(ctx, enemies);
        }

        // Draw attack position indicator
        const attackInfo = this.getCurrentAttackPosition(player);
        if (!attackInfo) {
            return;
        }

        const config = balanceConfig.attackPosition;
        const { x, y, enemy } = attackInfo;

        // Draw line from enemy feet to attack position
        ctx.save();
        ctx.strokeStyle = config.lineColor;
        ctx.lineWidth = config.lineWidth;
        ctx.setLineDash([5, 5]); // Dashed line

        ctx.beginPath();
        // Entity coordinates are now at feet position
        ctx.moveTo(enemy.x, enemy.y);
        // Attack position is also at feet level
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.setLineDash([]); // Reset dash

        // Draw circle at attack position
        ctx.fillStyle = config.indicatorColor;
        ctx.beginPath();
        ctx.arc(x, y, config.indicatorRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw circle outline
        ctx.strokeStyle = config.indicatorColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw strafing target indicators for all strafing enemies
     */
    private drawStrafingIndicators(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
        const config = balanceConfig.strafing;

        // Get all strafing enemies with valid targets
        const strafingEnemies = enemies.filter(e =>
            e.enemyState === 'strafing' &&
            e.strafingTarget &&
            e.animationState !== 'death' &&
            !e.isDead
        );

        ctx.save();

        for (const enemy of strafingEnemies) {
            const target = enemy.strafingTarget!;

            // Draw line from enemy feet to strafing target
            ctx.strokeStyle = config.lineColor;
            ctx.lineWidth = config.lineWidth;
            ctx.setLineDash([5, 5]); // Dashed line

            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();

            ctx.setLineDash([]); // Reset dash

            // Draw circle at strafing target position
            ctx.fillStyle = config.indicatorColor;
            ctx.beginPath();
            ctx.arc(target.x, target.y, config.indicatorRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw circle outline
            ctx.strokeStyle = config.indicatorColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Reset manager state (for game restart)
     */
    public reset(): void {
        this.releasePosition();
    }
}
