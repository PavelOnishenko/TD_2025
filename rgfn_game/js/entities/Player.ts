import Entity from '../../../engine/core/Entity.js';
import { themeManager } from '../config/ThemeConfig.js';

export default class Player extends Entity {
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

    // Player-specific properties
    public hp: number = 100;
    public maxHp: number = 100;
    public damage: number = 10;
    public gridCol?: number;
    public gridRow?: number;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 32;
        this.height = 32;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 10;
    }

    public takeDamage(amount: number): void {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
    }

    public heal(amount: number): void {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    public isDead(): boolean {
        return this.hp <= 0;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        const screenX = this.x;
        const screenY = this.y;
        const theme = themeManager.getTheme();

        // Player body
        ctx.fillStyle = theme.entities.player.body;
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Player face
        ctx.fillStyle = theme.entities.player.face;
        const faceX = screenX - 6;
        const faceY = screenY - 8;
        ctx.fillRect(faceX, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 8, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 2, faceY + 8, 8, 2); // mouth

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = screenY - this.height / 2 - 8;
        const theme = themeManager.getTheme();

        // Background
        ctx.fillStyle = theme.entities.player.healthBg;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        const color = healthPercent > 0.6 ? theme.entities.player.healthHigh :
                      healthPercent > 0.3 ? theme.entities.player.healthMid :
                      theme.entities.player.healthLow;
        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
