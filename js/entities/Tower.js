import { drawTowerMuzzleFlash, drawTowerPlacementFlash, drawTowerTopGlow } from '../systems/effects.js';

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
        this.baseRange = 140;
        this.baseDamage = 1;
        this.lastShot = 0;
        this.color = color;
        this.level = level;
        this.flashDuration = 0.12;
        this.flashTimer = 0;
        this.placementFlashDuration = 0.35;
        this.placementFlashTimer = 0;
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
        if (this.placementFlashTimer > 0) {
            this.placementFlashTimer = Math.max(0, this.placementFlashTimer - dt);
        }
        this.glowTime = (this.glowTime + dt * this.glowSpeed) % (Math.PI * 2);
    }

    triggerFlash() {
        this.flashTimer = this.flashDuration;
    }

    triggerPlacementFlash() {
        this.placementFlashTimer = this.placementFlashDuration;
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
        drawTowerPlacementFlash(ctx, this);
        drawTowerTopGlow(ctx, this);

        if (this.flashTimer > 0) {
            drawTowerMuzzleFlash(ctx, this);
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

}
