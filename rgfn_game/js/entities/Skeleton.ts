import Entity from '../../../engine/core/Entity.js';

export default class Skeleton extends Entity {
    // Explicitly declare inherited properties from Entity
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;

    // Explicitly declare inherited methods from Entity
    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    // Skeleton-specific properties
    public hp: number = 30;
    public maxHp: number = 30;
    public damage: number = 8;
    public name: string = 'Skeleton';
    public xpValue: number = 3; // XP awarded when defeated
    public gridCol?: number;
    public gridRow?: number;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 30;
        this.height = 30;
        this.hp = 30;
        this.maxHp = 30;
        this.damage = 8;
        this.name = 'Skeleton';
        this.xpValue = 3;
    }

    public takeDamage(amount: number): void {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
        if (this.hp === 0) {
            this.active = false;
        }
    }

    public isDead(): boolean {
        return this.hp <= 0;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        const screenX = this.x;
        const screenY = this.y;

        // Skeleton body (bone white with red tint)
        ctx.fillStyle = '#e6d5c3';
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Skull features
        ctx.fillStyle = '#000';
        // Eye sockets
        ctx.fillRect(screenX - 8, screenY - 8, 5, 5);
        ctx.fillRect(screenX + 3, screenY - 8, 5, 5);
        // Nose hole
        ctx.fillRect(screenX - 2, screenY - 1, 4, 3);

        // Teeth
        ctx.fillStyle = '#e6d5c3';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(screenX - 8 + i * 4, screenY + 5, 3, 4);
        }

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = screenY - this.height / 2 - 6;

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
