import { drawTowerMuzzleFlashIfNeeded, drawTowerPlacementFlash, drawTowerTopGlowIfNeeded } from '../systems/effects.js';
import { getHowler } from '../systems/audio.js';
import gameConfig from '../config/gameConfig.js';

let towerIdCounter = 1;

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
        this.id = towerIdCounter++;
        const config = gameConfig.towers;
        const scale = Number.isFinite(config.scale) ? config.scale : 1;
        this.w = config.width * scale;
        this.h = config.height * scale;
        this.baseRange = config.baseRange;
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
        this.mergePulseWaveDuration = config.mergePulseWaveDuration;
        this.mergePulseWaveTimer = 0;
        this.errorPulseDuration = config.errorPulseDuration;
        this.errorPulseTimer = 0;
        this.removalChargeDuration = config.removalHoldDuration ?? 2;
        this.removalChargeTimer = 0;
        this.removalChargeActive = false;
        this.removalChargePending = false;
        this.removalChargeDecayRate = config.removalIndicatorDecay ?? 3.2;
        this.mergeSelected = false;
        this.hovered = false;
        this.hoverAmount = 0;
        this.updateStats();
    }

    getLevelConfig(level = this.level) {
        const levelConfigs = gameConfig.towers?.levels;
        if (!Array.isArray(levelConfigs)) {
            throw new Error('Missing or invalid tower level configuration in gameConfig');
        }
        const index = Math.max(0, Math.min(level - 1, levelConfigs.length - 1));
        const config = levelConfigs[index];
        if (!config || typeof config !== 'object') {
            throw new Error(`Invalid tower level configuration for tower level ${level}: ${config}`);
        }
        return config;
    }

    updateStats() {
        const config = gameConfig.towers;
        const rangeMultiplier = 1 + config.rangePerLevel * (this.level - 1);
        const rangeIncreaseFactor = config.rangeBonusMultiplier;
        this.range = this.baseRange * rangeMultiplier * rangeIncreaseFactor;
        const { damage } = this.getLevelConfig();
        if (Number.isFinite(damage) === false) {
            throw new Error(`Invalid damage override for tower level ${this.level}: ${damage}`);
        }
        this.damage = damage;

        const glowSpeeds = config.glowSpeeds;
        const clampedLevel = Math.max(1, Math.min(this.level, glowSpeeds.length));
        const speedIndex = clampedLevel - 1;
        this.glowSpeed = glowSpeeds[speedIndex] ?? glowSpeeds[glowSpeeds.length - 1];
        this.fireInterval = this.getConfiguredFireInterval();
    }

    getConfiguredFireInterval() {
        const { fireInterval } = this.getLevelConfig();
        if (Number.isFinite(fireInterval) && fireInterval > 0) {
            return fireInterval;
        }
        throw new Error(`Invalid fire interval for tower level ${this.level}: ${fireInterval}`);
    }

    getFireInterval() {
        if (!Number.isFinite(this.fireInterval) || this.fireInterval <= 0) {
            this.fireInterval = this.getConfiguredFireInterval();
        }
        return this.fireInterval;
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
        if (this.mergePulseWaveTimer > 0) {
            this.mergePulseWaveTimer = Math.max(0, this.mergePulseWaveTimer - dt);
        }
        if (this.errorPulseTimer > 0) {
            this.errorPulseTimer = Math.max(0, this.errorPulseTimer - dt);
        }
        if (this.hovered) {
            this.hoverAmount = 1;
        } else if (this.hoverAmount > 0) {
            this.hoverAmount = Math.max(0, this.hoverAmount - dt * 3.5);
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
        this.mergePulseWaveTimer = this.mergePulseWaveDuration;
    }

    triggerErrorPulse() {
        this.errorPulseTimer = this.errorPulseDuration;
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
        // Abruptly stop the removal charge sound if it is playing
        const howler = getHowler();
        const howls = howler && Array.isArray(howler._howls) ? howler._howls : null;
        if (howls) {
            for (const h of howls) {
                try {
                    const src = h && h._src;
                    const sources = Array.isArray(src) ? src : (src ? [src] : []);
                    if (sources.some(s => typeof s === 'string' && s.includes('tower_remove_charge'))) {
                        if (typeof h.stop === 'function') {
                            h.stop();
                        }
                    }
                } catch {
                    // ignore any Howler internals differences
                }
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

    draw(ctx, assets, game = null) {
        const c = this.center();
        this.drawHover(ctx, c);
        ctx.fillStyle = this.color;
        this.drawBody(ctx, assets);
        this.drawMergeSelection(ctx, c);
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
        
        if (game && game.upgradeModeActive) {
            this.drawUpgradeCost(ctx, game);
        }
    }

    setHover(strength = 1) {
        if (!Number.isFinite(strength)) {
            return;
        }
        this.setHovered(true);
        this.hoverAmount = Math.max(this.hoverAmount, Math.max(0, Math.min(1, strength)));
    }

    setHovered(isHovered) {
        this.hovered = Boolean(isHovered);
        if (this.hovered) {
            this.hoverAmount = 1;
        } else {
            this.hoverAmount = 0;
        }
    }

    drawHover(ctx, center) {
        if (this.hoverAmount <= 0) {
            return;
        }

        const intensity = Math.min(1, this.hoverAmount * 1.1);
        const pulse = (Math.sin(this.glowTime * 2.2) + 1) / 2;
        const radius = Math.max(this.w, this.h) * (0.55 + 0.07 * pulse);
        const alpha = 0.18 + 0.3 * intensity;
        const color = this.color === 'blue'
            ? `rgba(150, 210, 255, ${alpha})`
            : `rgba(255, 200, 150, ${alpha})`;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(center.x, center.y + this.h * 0.05, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBody(ctx, assets) {
        const propertyName = `tower_${this.level}${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (!sprite) {
            console.warn(`No sprite found for property name: ${propertyName}`);
            return;
        }
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
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

    drawMergeSelection(ctx, center) {
        if (!this.mergeSelected) {
            return;
        }

        const pulse = (Math.sin(this.glowTime * 2.4) + 1) / 2;
        const radius = Math.max(this.w, this.h) * (0.7 + 0.14 * pulse);
        const alpha = 0.55 + 0.35 * pulse;
        const lineWidth = 4.5 + 2 * pulse;
        const color = this.color === 'blue'
            ? `rgba(160, 220, 255, ${alpha})`
            : `rgba(255, 200, 150, ${alpha})`;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(center.x, center.y + this.h * 0.04, radius, 0, Math.PI * 2);
        ctx.stroke();
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
        const config = gameConfig.towers?.levelIndicator ?? {};
        const fontSize = config.fontSize ?? 16;
        const offsetX = config.offsetX ?? 0;
        const offsetY = config.offsetY ?? 4;
        const padding = config.padding ?? 4;
        const backgroundAlpha = config.backgroundAlpha ?? 0.85;

        const text = String(this.level);

        ctx.save();
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Position at bottom-center of the tower with configurable offset
        const textX = this.x + this.w / 2 + offsetX;
        const textY = this.y + this.h + fontSize + offsetY;

        // Get color and intensity based on level
        const levelStyle = this.getLevelIndicatorStyle(this.level);

        // Draw semi-transparent background for better visibility
        const metrics = ctx.measureText(text);
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = fontSize + padding * 2;
        const bgX = textX - bgWidth / 2;
        const bgY = textY - bgHeight + padding;

        // Background with subtle glow
        ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

        // Add outer glow effect based on level
        if (levelStyle.glowIntensity > 0) {
            const pulse = (Math.sin(this.glowTime * 1.5) + 1) / 2;
            const glowAlpha = levelStyle.glowIntensity * (0.3 + 0.15 * pulse);

            ctx.shadowColor = levelStyle.glowColor;
            ctx.shadowBlur = 8 + 4 * pulse;
            ctx.globalAlpha = glowAlpha;
            ctx.fillStyle = levelStyle.glowColor;
            ctx.fillRect(bgX - 1, bgY - 1, bgWidth + 2, bgHeight + 2);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // Draw border
        ctx.strokeStyle = levelStyle.borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

        // Draw text with glow
        ctx.shadowColor = levelStyle.textGlow;
        ctx.shadowBlur = levelStyle.textGlowSize;

        ctx.fillStyle = levelStyle.textColor;
        ctx.fillText(text, textX, textY);

        // Extra bright overlay for higher levels
        if (this.level >= 4) {
            ctx.shadowBlur = levelStyle.textGlowSize * 1.5;
            ctx.globalAlpha = 0.4;
            ctx.fillText(text, textX, textY);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    getLevelIndicatorStyle(level) {
        const config = gameConfig.towers?.levelIndicator ?? {};
        const styles = config.styles ?? {};

        // Fallback default style if config is missing
        const defaultStyle = {
            textColor: 'rgba(255, 255, 255, 1)',
            textGlow: 'rgba(255, 255, 255, 0.5)',
            textGlowSize: 4,
            borderColor: 'rgba(255, 255, 255, 0.7)',
            glowColor: 'rgba(255, 255, 255, 0.3)',
            glowIntensity: 0.5
        };

        // Return style for the level, defaulting to level 6 style, then default style
        return styles[level] || styles[6] || defaultStyle;
    }

    drawUpgradeCost(ctx, game) {
        const MAX_UPGRADE_LEVEL = 6;
        if (this.level >= MAX_UPGRADE_LEVEL) {
            return;
        }

        const cost = typeof game.getUpgradeCost === 'function'
            ? game.getUpgradeCost(this.level)
            : null;
        
        if (!Number.isFinite(cost) || cost <= 0) {
            return;
        }

        const config = gameConfig.towers?.upgradeCostText ?? {};
        const fontSize = Number.isFinite(config.fontSize) ? config.fontSize : 12;
        const fontFamily = typeof config.fontFamily === 'string' ? config.fontFamily : 'sans-serif';
        const fontWeight = typeof config.fontWeight === 'string' ? config.fontWeight : 'bold';
        const colorAffordable = typeof config.colorAffordable === 'string' ? config.colorAffordable : '#ffffff';
        const colorUnaffordable = typeof config.colorUnaffordable === 'string' ? config.colorUnaffordable : '#ff6666';
        const backgroundAlpha = Number.isFinite(config.backgroundAlpha) ? config.backgroundAlpha : 0.6;
        const padding = Number.isFinite(config.padding) ? config.padding : 4;
        const offsetY = Number.isFinite(config.offsetY) ? config.offsetY : -8;

        const c = this.center();
        const textY = this.y + offsetY;
        const text = String(cost);
        
        // Draw background for better visibility
        ctx.save();
        const fontString = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.font = fontString;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const bgX = c.x - textWidth / 2 - padding;
        const bgY = textY - fontSize / 2 - padding;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = fontSize + padding * 2;

        // Semi-transparent background
        ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`;
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

        // Draw text
        const canAfford = game.energy >= cost;
        ctx.fillStyle = canAfford ? colorAffordable : colorUnaffordable;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, c.x, textY);
        ctx.restore();
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
