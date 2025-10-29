import { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded } from '../systems/effects.js';
import gameConfig from '../config/gameConfig.js';

const DEFAULT_PLACEMENT_ANCHOR = Object.freeze({
    // The anchor describes the fraction of the sprite width/height between the
    // top-left corner and the point that should sit on the cell origin.
    x: -0.5,
    y: 0,
});

export default class Tower {
    constructor(x, y, color = 'red', level = 1) {
        this.x = x;
        this.y = y;
        const config = gameConfig.towers;
        this.w = config.width;
        this.h = config.height;
        this.baseRange = config.baseRange;
        this.baseDamage = config.baseDamage;
        this.lastShot = 0;
        this.color = color;
        this.level = level;
        this.flashDuration = config.flashDuration;
        this.flashTimer = 0;
        this.placementFlashDuration = config.placementFlashDuration;
        this.placementFlashTimer = 0;
        this.glowTime = Math.random() * Math.PI * 2;
        this.glowSpeed = config.glowSpeeds.at(-1) ?? 2.4;
        this.mergeHint = 0;
        this.mergePulseDuration = config.mergePulseDuration;
        this.mergePulseTimer = 0;
        this.mergePulseWaveDuration = config.mergePulseWaveDuration;
        this.mergePulseWaveTimer = 0;
        this.errorPulseDuration = config.errorPulseDuration;
        this.errorPulseTimer = 0;
        this.updateStats();
    }

    updateStats() {
        const config = gameConfig.towers;
        const rangeMultiplier = 1 + config.rangePerLevel * (this.level - 1);
        const damageMultiplier = 1 + config.damagePerLevel * (this.level - 1);
        const rangeIncreaseFactor = config.rangeBonusMultiplier;
        this.range = this.baseRange * rangeMultiplier * rangeIncreaseFactor;
        this.damage = this.baseDamage * damageMultiplier;
        const glowSpeeds = config.glowSpeeds;
        const clampedLevel = Math.max(1, Math.min(this.level, glowSpeeds.length));
        const speedIndex = clampedLevel - 1;
        this.glowSpeed = glowSpeeds[speedIndex] ?? glowSpeeds[glowSpeeds.length - 1];
    }

    update(dt) {
        if (this.flashTimer > 0) {
            this.flashTimer = Math.max(0, this.flashTimer - dt);
        }
        if (this.placementFlashTimer > 0) {
            this.placementFlashTimer = Math.max(0, this.placementFlashTimer - dt);
        }
        this.glowTime = (this.glowTime + dt * this.glowSpeed) % (Math.PI * 2);
        if (this.mergeHint > 0) {
            this.mergeHint = Math.max(0, this.mergeHint - dt * 2.5);
        }
        if (this.mergePulseTimer > 0) {
            this.mergePulseTimer = Math.max(0, this.mergePulseTimer - dt);
        }
        if (this.mergePulseWaveTimer > 0) {
            this.mergePulseWaveTimer = Math.max(0, this.mergePulseWaveTimer - dt);
        }
        if (this.errorPulseTimer > 0) {
            this.errorPulseTimer = Math.max(0, this.errorPulseTimer - dt);
        }
    }

    triggerFlash() {
        this.flashTimer = this.flashDuration;
    }

    triggerPlacementFlash() {
        this.placementFlashTimer = this.placementFlashDuration;
    }

    triggerMergePulse() {
        this.mergePulseTimer = this.mergePulseDuration;
        this.mergePulseWaveTimer = this.mergePulseWaveDuration;
    }

    triggerErrorPulse() {
        this.errorPulseTimer = this.errorPulseDuration;
    }

    getMergePulseStrength() {
        if (this.mergePulseDuration <= 0) {
            return 0;
        }
        const normalized = this.mergePulseTimer / this.mergePulseDuration;
        return Math.max(0, Math.min(1, normalized));
    }

    getErrorPulseStrength() {
        if (this.errorPulseDuration <= 0) {
            return 0;
        }
        const normalized = this.errorPulseTimer / this.errorPulseDuration;
        return Math.max(0, Math.min(1, normalized));
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
        this.drawErrorPulse(ctx, c);
        this.drawMergePulseWave(ctx, c);
        this.drawMergeHint(ctx, c);
        drawTowerPlacementFlash(ctx, this);
        drawTowerTopGlowIfNeeded(ctx, this);

        if (this.flashTimer > 0) {
            drawTowerMuzzleFlashIfNeeded(ctx, this);
        }

        this.drawLevelIndicator(ctx);
    }

    drawRange(ctx, center) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, this.range, 0, Math.PI * 2);
        const color = this.color === 'red'
            ? 'rgba(255,0,0,0.3)'
            : 'rgba(0,0,255,0.3)';
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    drawBody(ctx, c, assets) {
        const propertyName = `tower_${this.level}${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (!sprite) {
            console.warn(`No sprite found for property name: ${propertyName}`);
            return;
        }
        const hasMergePulse = this.mergePulseTimer > 0;
        if (!hasMergePulse) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
            return;
        }

        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;
        const strength = this.getMergePulseStrength();
        const eased = easeOutCubic(1 - strength);
        const scale = 1 + 0.18 * (1 - eased);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.drawImage(sprite, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }

    drawMergeHint(ctx, center) {
        if (this.mergeHint <= 0) {
            return;
        }

        const pulse = (Math.sin(this.glowTime * 2) + 1) / 2;
        const intensity = Math.min(1, this.mergeHint);
        const baseRadius = Math.max(this.w, this.h) * 0.6;
        const radius = baseRadius * (0.9 + 0.15 * pulse);
        const alpha = 0.35 + 0.4 * pulse;
        const color = this.color === 'red'
            ? `rgba(255, 180, 120, ${alpha})`
            : `rgba(130, 180, 255, ${alpha})`;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        ctx.arc(center.x, center.y + this.h * 0.05, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    drawMergePulseWave(ctx, center) {
        if (this.mergePulseWaveTimer <= 0) {
            return;
        }

        const progress = 1 - (this.mergePulseWaveTimer / this.mergePulseWaveDuration);
        const eased = easeOutCubic(progress);
        const intensity = 1 - progress;
        const baseRadius = Math.max(this.w, this.h) * 0.65;
        const radius = baseRadius * (1 + eased * 1.1);
        const alpha = 0.4 * intensity;
        const lineWidth = 4 * (0.7 + 0.3 * intensity);
        const yOffset = this.h * 0.05;
        const color = this.color === 'red'
            ? `rgba(255, 205, 160, ${alpha})`
            : `rgba(160, 210, 255, ${alpha})`;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(center.x, center.y + yOffset, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = Math.min(0.55, alpha + 0.15);
        ctx.fillStyle = `rgba(255,255,255,${0.35 * intensity})`;
        ctx.beginPath();
        ctx.arc(center.x, center.y + yOffset, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawErrorPulse(ctx, center) {
        if (this.errorPulseTimer <= 0) {
            return;
        }

        const strength = this.getErrorPulseStrength();
        if (strength <= 0) {
            return;
        }

        const eased = easeOutCubic(strength);
        const scale = 1 + 0.08 * eased;
        const baseAlpha = 0.42 * eased;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = 'rgba(255, 64, 64, 0.95)';
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.min(1, baseAlpha * 1.6);
        ctx.strokeStyle = 'rgba(255, 160, 160, 0.95)';
        ctx.lineWidth = 5;
        ctx.strokeRect(-this.w / 2 + 3, -this.h / 2 + 3, this.w - 6, this.h - 6);
        ctx.restore();
    }

    drawLevelIndicator(ctx) {
        ctx.fillStyle = 'black';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(this.level), this.x + this.w + 2, this.y + 10);
    }

}

function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}
