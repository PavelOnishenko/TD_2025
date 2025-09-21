export default class Tower {
    constructor(x, y, color = 'red', level = 1) {
        this.x = x;
        this.y = y;
        this.w = 60;
        this.h = 90;
        this.baseRange = 120;
        this.baseDamage = 1;
        this.lastShot = 0;
        this.color = color;
        this.level = level;
        this.flashDuration = 0.12;
        this.flashTimer = 0;
        this.glowTime = Math.random() * Math.PI * 2;
        this.glowSpeed = 2.4;
        this.updateStats();
    }

    updateStats() {
        const rangeMultiplier = 1 + 0.2 * (this.level - 1);
        const damageMultiplier = 1 + 0.8 * (this.level - 1);
        this.range = this.baseRange * rangeMultiplier;
        this.damage = this.baseDamage * damageMultiplier;
    }

    update(dt) {
        if (this.flashTimer > 0) {
            this.flashTimer = Math.max(0, this.flashTimer - dt);
        }
        this.glowTime = (this.glowTime + dt * this.glowSpeed) % (Math.PI * 2);
    }

    triggerFlash() {
        this.flashTimer = this.flashDuration;
    }

    center() {
        return {
            x: this.x + this.w / 2,
            y: this.y + this.h / 2
        };
    }

    draw(ctx, assets) {
        const c = this.center();
        this.drawRange(ctx, c);
        ctx.fillStyle = this.color;
        this.drawBody(ctx, c, assets);

        if (this.level === 3) {
            this.drawCrystalGlow(ctx);
        }

        if (this.flashTimer > 0) {
            this.drawMuzzleFlash(ctx);
        }

        if (this.level > 1) {
            this.highlight(ctx);
        }

        this.drawLevelIndicator(ctx);
    }

    drawRange(ctx, c) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = this.color === 'red'
            ? 'rgba(255,0,0,0.3)'
            : 'rgba(0,0,255,0.3)';
        ctx.stroke();
    }

    drawBody(ctx, c, assets) {
        const propertyName = `tower_${this.level}${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (!sprite) {
            console.warn(`No sprite found for property name: ${propertyName}`);
            return;
        }

        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
    }

    highlight(ctx) {
        ctx.strokeStyle = 'yellow';
        ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    }

    drawLevelIndicator(ctx) {
        ctx.fillStyle = 'black';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(this.level), this.x + this.w + 2, this.y + 10);
    }

    drawMuzzleFlash(ctx) {
        const intensity = this.flashTimer / this.flashDuration;
        const { x, y } = this.getEmitterPosition();
        const radius = this.getFlashRadius();
        const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${0.9 * intensity})`);
        gradient.addColorStop(0.7, this.getFlashColor(intensity));
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getEmitterPosition() {
        const baseFactor = this.level === 3 ? 0.17 : this.level === 2 ? 0.2 : 0.24;
        return {
            x: this.x + this.w / 2,
            y: this.y + this.h * baseFactor
        };
    }

    getFlashRadius() {
        const base = this.w * 0.28;
        return base + (this.level - 1) * 4;
    }

    getFlashColor(intensity) {
        const alpha = 0.6 * intensity;
        return this.color === 'red'
            ? `rgba(255,140,100,${alpha})`
            : `rgba(140,190,255,${alpha})`;
    }

    drawCrystalGlow(ctx) {
        const pulse = this.getCrystalPulse();
        const { x, y } = this.getEmitterPosition();
        const radius = this.getCrystalRadius(pulse);
        const gradient = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
        const colors = this.getCrystalGlowColor(pulse);
        gradient.addColorStop(0, `rgba(255,255,255,${0.35 + 0.25 * pulse})`);
        gradient.addColorStop(0.5, colors.inner);
        gradient.addColorStop(1, colors.outer);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getCrystalPulse() {
        return 0.5 + 0.5 * Math.sin(this.glowTime);
    }

    getCrystalRadius(pulse) {
        const base = this.getFlashRadius() * 0.85;
        return base * (0.9 + 0.25 * pulse);
    }

    getCrystalGlowColor(pulse) {
        const alpha = 0.45 + 0.25 * pulse;
        if (this.color === 'red') {
            return {
                inner: `rgba(255,150,120,${alpha})`,
                outer: 'rgba(255,120,90,0)'
            };
        }
        return {
            inner: `rgba(150,190,255,${alpha})`,
            outer: 'rgba(110,160,255,0)'
        };
    }
}
