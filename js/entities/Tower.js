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
        this.removalChargeDuration = config.removalHoldDuration ?? 2;
        this.removalChargeTimer = 0;
        this.removalChargeActive = false;
        this.removalChargePending = false;
        this.removalChargeDecayRate = config.removalIndicatorDecay ?? 3.2;
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
        this.updateRemovalCharge(dt);
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

    beginRemovalCharge() {
        if (this.removalChargePending) {
            return false;
        }
        this.removalChargeTimer = 0;
        this.removalChargeActive = true;
        this.removalChargePending = false;
        return true;
    }

    cancelRemovalCharge() {
        this.removalChargeActive = false;
        if (!this.removalChargePending) {
            if (!Number.isFinite(this.removalChargeDuration) || this.removalChargeDuration <= 0) {
                this.removalChargeTimer = 0;
            }
        }
    }

    isRemovalCharging() {
        return Boolean(this.removalChargeActive);
    }

    shouldTriggerRemoval() {
        return Boolean(this.removalChargePending);
    }

    acknowledgeRemoval() {
        this.removalChargePending = false;
        this.removalChargeActive = false;
        this.removalChargeTimer = 0;
    }

    getRemovalChargeProgress() {
        if (!Number.isFinite(this.removalChargeDuration) || this.removalChargeDuration <= 0) {
            return 0;
        }
        const normalized = this.removalChargeTimer / this.removalChargeDuration;
        return Math.max(0, Math.min(1, normalized));
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

        this.drawRemovalChargeIndicator(ctx, c);
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

    updateRemovalCharge(dt) {
        if (!Number.isFinite(this.removalChargeDuration) || this.removalChargeDuration <= 0) {
            this.removalChargeActive = false;
            this.removalChargePending = false;
            this.removalChargeTimer = 0;
            return;
        }

        if (this.removalChargeActive) {
            this.removalChargeTimer = Math.min(
                this.removalChargeDuration,
                this.removalChargeTimer + dt
            );
            if (this.removalChargeTimer >= this.removalChargeDuration) {
                this.removalChargeTimer = this.removalChargeDuration;
                this.removalChargeActive = false;
                this.removalChargePending = true;
            }
            return;
        }

        if (this.removalChargePending) {
            return;
        }

        if (this.removalChargeTimer <= 0) {
            return;
        }

        const decayRate = Number.isFinite(this.removalChargeDecayRate)
            ? Math.max(0, this.removalChargeDecayRate)
            : 0;
        if (decayRate <= 0) {
            this.removalChargeTimer = 0;
            return;
        }
        this.removalChargeTimer = Math.max(0, this.removalChargeTimer - decayRate * dt);
    }

    drawRemovalChargeIndicator(ctx, center) {
        const progress = this.getRemovalChargeProgress();
        if (progress <= 0) {
            return;
        }

        const pulse = 0.6 + 0.4 * Math.sin(this.glowTime * 2.1);
        const intensity = this.removalChargeActive ? 1 : progress;
        const radius = Math.max(this.w, this.h) * (0.45 + 0.08 * pulse * intensity);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * progress;

        const arcOuterAlpha = 0.28 + 0.45 * intensity;
        const arcInnerAlpha = 0.18 + 0.35 * intensity;
        const arcColor = this.color === 'red'
            ? `rgba(255, 140, 90, ${arcOuterAlpha})`
            : `rgba(120, 190, 255, ${arcOuterAlpha})`;
        const innerArcColor = this.color === 'red'
            ? `rgba(255, 220, 200, ${arcInnerAlpha})`
            : `rgba(190, 225, 255, ${arcInnerAlpha})`;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, this.w * 0.08);
        ctx.strokeStyle = arcColor;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, startAngle, endAngle, false);
        ctx.stroke();

        ctx.lineWidth = Math.max(2, this.w * 0.045);
        ctx.strokeStyle = innerArcColor;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * 0.8, startAngle, endAngle, false);
        ctx.stroke();

        const columnWidth = this.w * 0.62;
        const columnHeight = this.h * progress;
        const columnX = this.x + (this.w - columnWidth) / 2;
        const columnBottom = this.y + this.h;
        const columnTop = columnBottom - columnHeight;
        const gradient = ctx.createLinearGradient(0, columnTop, 0, columnBottom);
        if (this.color === 'red') {
            gradient.addColorStop(0, `rgba(255, 150, 80, ${0.82 * intensity})`);
            gradient.addColorStop(0.45, `rgba(255, 90, 60, ${0.55 * intensity})`);
            gradient.addColorStop(1, `rgba(255, 200, 150, ${0.32 * intensity})`);
        } else {
            gradient.addColorStop(0, `rgba(140, 200, 255, ${0.85 * intensity})`);
            gradient.addColorStop(0.45, `rgba(90, 150, 255, ${0.55 * intensity})`);
            gradient.addColorStop(1, `rgba(210, 235, 255, ${0.34 * intensity})`);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.fillRect(columnX, columnTop, columnWidth, columnHeight);

        const frameAlpha = 0.2 + 0.3 * intensity;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(255, 255, 255, ${frameAlpha})`;
        ctx.lineWidth = Math.max(1.5, this.w * 0.035);
        ctx.strokeRect(columnX, this.y + this.h * 0.05, columnWidth, this.h * 0.95);
        ctx.restore();
    }
}

function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}
