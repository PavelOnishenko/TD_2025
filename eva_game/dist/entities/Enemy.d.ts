import Entity from '../../../engine/core/Entity.js';
import { Viewport } from '../types/engine';
import { AnimationState } from '../types/game';
import Player from './Player';
export default class Enemy extends Entity {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    active: boolean;
    id: number;
    width: number;
    height: number;
    move: (deltaTime: number) => void;
    getBounds: () => {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    checkCollision: (other: any) => boolean;
    health: number;
    maxHealth: number;
    facingRight: boolean;
    animationState: AnimationState;
    private attackCooldownTimer;
    constructor(x: number, y: number);
    update(deltaTime: number): void;
    private updateAttackCooldown;
    private updateAnimationState;
    moveToward(targetX: number, targetY: number, deltaTime: number): void;
    private updateFacingDirection;
    private setVelocityTowardTarget;
    canAttackPlayer(player: Player): boolean;
    attackPlayer(player: Player): void;
    takeDamage(amount: number): void;
    draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void;
    private drawEnemyBody;
    private drawEnemyFace;
    private drawHealthBar;
}
//# sourceMappingURL=Enemy.d.ts.map