import Entity from '../../../engine/core/Entity.js';
import { balanceConfig } from '../config/balanceConfig.js';
import { themeManager } from '../config/ThemeConfig.js';

export default class Zombie extends Entity {
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

    // Zombie-specific properties
    public hp: number;
    public maxHp: number;
    public damage: number;
    public name: string;
    public xpValue: number;
    public gridCol?: number;
    public gridRow?: number;

    constructor(x: number, y: number) {
        super(x, y);
        const config = balanceConfig.enemies.zombie;

        this.width = config.width;
        this.height = config.height;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.damage = config.damage;
        this.name = config.name;
        this.xpValue = config.xpValue;
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
        const theme = themeManager.getTheme();

        // Zombie body
        ctx.fillStyle = theme.entities.zombie.body;
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Zombie face features
        ctx.fillStyle = theme.entities.zombie.features;
        // Eyes (hollow/dead looking)
        ctx.fillRect(screenX - 9, screenY - 7, 6, 4);
        ctx.fillRect(screenX + 3, screenY - 7, 6, 4);

        // Mouth (gaping)
        ctx.fillRect(screenX - 8, screenY + 4, 16, 6);

        // Scars/wounds
        ctx.fillRect(screenX - 12, screenY - 2, 8, 2);
        ctx.fillRect(screenX + 4, screenY + 1, 6, 2);

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = screenY - this.height / 2 - 6;
        const theme = themeManager.getTheme();

        // Background
        ctx.fillStyle = theme.entities.zombie.healthBg;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        ctx.fillStyle = theme.entities.zombie.healthBar;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
