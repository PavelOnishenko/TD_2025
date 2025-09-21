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
        if (typeof Enemy._glowPhaseCursor !== 'number') {
            Enemy._glowPhaseCursor = 0;
        }
        this.glowPhase = Enemy._glowPhaseCursor;
        Enemy._glowPhaseCursor = (Enemy._glowPhaseCursor + Math.PI * 0.85) % (Math.PI * 2);
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
        if (!this.canRenderGlow(ctx)) {
            return;
        }

        const palette = this.getGlowPalette();
        const tailCenterX = this.x + this.w / 2;
        const tailCenterY = this.y + this.h * 0.18;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
        const flicker = 0.75 + Math.sin(now / 180 + this.glowPhase) * 0.25;
        const stretch = 1.15 + Math.sin(now / 260 + this.glowPhase * 0.6) * 0.2;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Soft halo hugging the ship's hull
        ctx.save();
        ctx.translate(tailCenterX, tailCenterY);
        ctx.scale(1, 1.25 * stretch);
        ctx.globalAlpha = 0.55;
        const haloRadius = this.w * (0.38 + 0.07 * flicker);
        const haloGradient = ctx.createRadialGradient(0, 0, haloRadius * 0.1, 0, 0, haloRadius);
        haloGradient.addColorStop(0, palette.core);
        haloGradient.addColorStop(0.4, palette.mid);
        haloGradient.addColorStop(1, palette.halo);
        ctx.fillStyle = haloGradient;
        ctx.beginPath();
        ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Main flame body trailing behind the ship
        ctx.save();
        ctx.translate(tailCenterX, tailCenterY - this.h * 0.05);
        ctx.scale(1, stretch * 1.5);
        ctx.globalAlpha = 0.7;
        const flameHeight = this.h * (0.9 + 0.1 * flicker);
        const flameGradient = ctx.createLinearGradient(0, 0, 0, -flameHeight);
        flameGradient.addColorStop(0, palette.core);
        flameGradient.addColorStop(0.25, palette.flare);
        flameGradient.addColorStop(1, palette.trail);
        ctx.fillStyle = flameGradient;
        const flameWidth = this.w * (0.22 + 0.08 * flicker);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(flameWidth, -flameHeight * 0.35, 0, -flameHeight);
        ctx.quadraticCurveTo(-flameWidth, -flameHeight * 0.35, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Bright sparkle at the exhaust center for a hot core
        ctx.save();
        ctx.translate(tailCenterX, tailCenterY - this.h * 0.1);
        ctx.scale(1, 1 + 0.3 * flicker);
        ctx.globalAlpha = 0.9;
        const sparkRadius = this.w * (0.16 + 0.05 * flicker);
        const sparkGradient = ctx.createRadialGradient(0, 0, sparkRadius * 0.25, 0, 0, sparkRadius);
        sparkGradient.addColorStop(0, palette.spark);
        sparkGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sparkGradient;
        ctx.beginPath();
        ctx.arc(0, 0, sparkRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    canRenderGlow(ctx) {
        return (
            typeof ctx.save === 'function' &&
            typeof ctx.restore === 'function' &&
            typeof ctx.beginPath === 'function' &&
            typeof ctx.arc === 'function' &&
            typeof ctx.moveTo === 'function' &&
            typeof ctx.quadraticCurveTo === 'function' &&
            typeof ctx.fill === 'function' &&
            typeof ctx.translate === 'function' &&
            typeof ctx.scale === 'function' &&
            typeof ctx.createRadialGradient === 'function' &&
            typeof ctx.createLinearGradient === 'function'
        );
    }

    getGlowPalette() {
        const palettes = {
            red: {
                core: 'rgba(255, 243, 232, 1)',
                mid: 'rgba(255, 186, 140, 0.85)',
                halo: 'rgba(255, 90, 40, 0.24)',
                flare: 'rgba(255, 154, 84, 0.7)',
                trail: 'rgba(255, 94, 48, 0)',
                spark: 'rgba(255, 246, 235, 0.95)',
            },
            blue: {
                core: 'rgba(232, 246, 255, 1)',
                mid: 'rgba(132, 206, 255, 0.85)',
                halo: 'rgba(64, 148, 255, 0.24)',
                flare: 'rgba(152, 214, 255, 0.75)',
                trail: 'rgba(66, 156, 255, 0)',
                spark: 'rgba(255, 255, 255, 0.92)',
            },
        };
        return (
            palettes[this.color] ?? {
                core: 'rgba(255, 248, 220, 1)',
                mid: 'rgba(255, 224, 150, 0.8)',
                halo: 'rgba(255, 200, 80, 0.22)',
                flare: 'rgba(255, 210, 120, 0.65)',
                trail: 'rgba(255, 190, 90, 0)',
                spark: 'rgba(255, 255, 245, 0.9)',
            }
        );
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