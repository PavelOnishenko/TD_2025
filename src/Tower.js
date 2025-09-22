const DEFAULT_PLACEMENT_ANCHOR = Object.freeze({
    // The anchor describes the fraction of the sprite width/height between the
    // top-left corner and the point that should sit on the cell origin.
    x: 0.25,
    y: 0.8,
});

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
        const glowSpeeds = [1.8, 2.1, 2.4];
        const clampedLevel = Math.max(1, Math.min(this.level, glowSpeeds.length));
        const speedIndex = clampedLevel - 1;
        this.glowSpeed = glowSpeeds[speedIndex] ?? glowSpeeds[glowSpeeds.length - 1];
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
        return { x: this.x + this.w / 2, y: this.y + this.h / 2};
    }

    /**
     * Aligns the tower so its sprite anchor sits on the provided cell.
     * @param {{ x: number, y: number }} cell
     */
    alignToCell(cell) {
        const offset = this.getPlacementOffset();
        this.x = cell.x - offset.x;
        this.y = cell.y - offset.y;
    }

    /**
     * Computes the offset between the sprite origin and the visual anchor.
     * @returns {{ x: number, y: number }}
     */
    getPlacementOffset() {
        const anchor = Tower.getPlacementAnchor();
        return { x: this.w * anchor.x, y: this.h * anchor.y };
    }

    static getPlacementAnchor() {
        return DEFAULT_PLACEMENT_ANCHOR;
    }

    draw(ctx, assets) {
        const c = this.center();
        this.drawRange(ctx, c);
        ctx.fillStyle = this.color;
        this.drawBody(ctx, c, assets);
        this.drawTopGlow(ctx);

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
        ctx.strokeStyle = this.color === 'red' ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,255,0.3)';
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

    drawTopGlow(ctx) {
        const pulse = this.getGlowPulse();
        const { x, y } = this.getEmitterPosition();
        const profile = this.getGlowProfile(pulse);
        if (typeof ctx.createRadialGradient !== 'function') {
            return;
        }
        const gradient = ctx.createRadialGradient(
            x,
            y,
            profile.radius * profile.innerRadiusRatio,
            x,
            y,
            profile.radius
        );
        gradient.addColorStop(0, `rgba(255,255,255,${profile.coreAlpha})`);
        gradient.addColorStop(profile.midStop, profile.innerColor);
        gradient.addColorStop(1, profile.outerColor);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(x, y, profile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getGlowPulse() {
        return 0.5 + 0.5 * Math.sin(this.glowTime);
    }

    getGlowProfile(pulse) {
        const levelProfiles = {
            1: {
                radiusBase: 0.68,
                radiusPulse: 0.14,
                coreBase: 0.24,
                corePulse: 0.16,
                innerAlphaBase: 0.32,
                innerAlphaPulse: 0.2,
                innerRadiusRatio: 0.14,
                midStop: 0.42
            },
            2: {
                radiusBase: 0.76,
                radiusPulse: 0.16,
                coreBase: 0.28,
                corePulse: 0.18,
                innerAlphaBase: 0.38,
                innerAlphaPulse: 0.22,
                innerRadiusRatio: 0.16,
                midStop: 0.46
            },
            3: {
                radiusBase: 0.84,
                radiusPulse: 0.18,
                coreBase: 0.34,
                corePulse: 0.22,
                innerAlphaBase: 0.44,
                innerAlphaPulse: 0.24,
                innerRadiusRatio: 0.18,
                midStop: 0.5
            }
        };
        const profile = levelProfiles[this.level] ?? levelProfiles[3];
        const baseRadius = this.getFlashRadius();
        const radius = baseRadius * profile.radiusBase * (1 + profile.radiusPulse * pulse);
        const innerAlpha = profile.innerAlphaBase + profile.innerAlphaPulse * pulse;
        const palette = this.getGlowPalette(innerAlpha);
        return {
            radius,
            coreAlpha: profile.coreBase + profile.corePulse * pulse,
            innerColor: palette.inner,
            outerColor: palette.outer,
            innerRadiusRatio: profile.innerRadiusRatio,
            midStop: profile.midStop
        };
    }

    getGlowPalette(innerAlpha) {
        const redPalette = {
            1: {
                inner: [255, 178, 140],
                outer: [255, 120, 90]
            },
            2: {
                inner: [255, 160, 120],
                outer: [255, 115, 85]
            },
            3: {
                inner: [255, 150, 120],
                outer: [255, 120, 90]
            }
        };
        const bluePalette = {
            1: {
                inner: [170, 210, 255],
                outer: [110, 160, 255]
            },
            2: {
                inner: [160, 200, 255],
                outer: [108, 170, 255]
            },
            3: {
                inner: [150, 190, 255],
                outer: [110, 160, 255]
            }
        };
        const paletteByColor = this.color === 'red' ? redPalette : bluePalette;
        const palette = paletteByColor[this.level] ?? paletteByColor[3];
        if (!palette) {
            return {
                inner: `rgba(255,255,255,${innerAlpha})`,
                outer: 'rgba(255,255,255,0)'
            };
        }
        return {
            inner: `rgba(${palette.inner[0]},${palette.inner[1]},${palette.inner[2]},${innerAlpha})`,
            outer: `rgba(${palette.outer[0]},${palette.outer[1]},${palette.outer[2]},0)`
        };
    }
}
