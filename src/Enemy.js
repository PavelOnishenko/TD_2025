export default class Enemy {
    constructor(maxHp, color, x, y, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.speedX = speedX;
        this.speedY = speedY;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.color = color;
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
    }

    draw(ctx, assets) {
        const propertyName = `swarm_${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        this.drawEngineGlow(ctx);
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);

        const barWidth = this.w;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - barHeight - 2;

        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    drawEngineGlow(ctx) {
        if (typeof ctx.save !== 'function' || typeof ctx.restore !== 'function') {
            return;
        }
        if (typeof ctx.beginPath !== 'function' || typeof ctx.ellipse !== 'function') {
            return;
        }
        if (typeof ctx.fill !== 'function') {
            return;
        }
        const palette = this.getGlowPalette();
        const glowCenterX = this.x + this.w / 2;
        const glowCenterY = this.y + this.h + 4;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = palette.shadow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = palette.core;
        ctx.beginPath();
        ctx.ellipse(glowCenterX, glowCenterY, this.w * 0.25, this.h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getGlowPalette() {
        const palettes = {
            red: { shadow: 'rgba(255, 96, 48, 0.7)', core: 'rgba(255, 220, 180, 0.9)' },
            blue: { shadow: 'rgba(88, 152, 255, 0.7)', core: 'rgba(200, 232, 255, 0.9)' },
        };
        return palettes[this.color] ?? { shadow: 'rgba(255, 220, 120, 0.7)', core: 'rgba(255, 255, 200, 0.9)' };
    }

    isOutOfBounds(canvasHeight) {
        return this.y >= canvasHeight;
    }
}

export class TankEnemy extends Enemy {
    constructor(maxHp = 15, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y, 50, 34);
    }
}

export class SwarmEnemy extends Enemy {
    constructor(maxHp = 1, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y, 100, 76);
    }
}