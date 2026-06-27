import { clamp01, lerp } from '../../engine/utils/MathUtils.js';

const MERGE_PALETTES = {
    red: { trail: [255, 168, 136], glow: [255, 230, 214] },
    blue: { trail: [150, 205, 255], glow: [205, 235, 255] },
    default: { trail: [255, 210, 190], glow: [255, 240, 226] },
};

const getMergePalette = (color) => color ? MERGE_PALETTES[color] ?? MERGE_PALETTES.default : MERGE_PALETTES.default;

const easeInOutCubic = (t) => {
    const clamped = clamp01(t);
    if (clamped < 0.5) {
        return 4 * clamped * clamped * clamped;
    }
    const normalized = -2 * clamped + 2;
    return 1 - (normalized * normalized * normalized) / 2;
};

const easeOutCubic = (t) => {
    const inverted = 1 - clamp01(t);
    return 1 - inverted * inverted * inverted;
};

const toMergeColor = (rgb, alpha) => {
    const [r, g, b] = rgb ?? [255, 255, 255];
    return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
};

const drawEnergyPopup = (ctx, popup) => {
    const duration = popup.duration && popup.duration > 0 ? popup.duration : 0.8;
    const progress = clamp01((popup.elapsed ?? 0) / duration);
    if (progress >= 1) {
        return;
    }

    const eased = easeOutCubic(progress);
    const x = (popup.startX ?? 0) + (popup.driftX ?? 0) * eased;
    const y = (popup.startY ?? 0) + (popup.driftY ?? -60) * eased;
    const font = typeof popup.font === 'string' ? popup.font : '600 26px "Baloo 2", sans-serif';
    const strokeStyle = typeof popup.stroke === 'string' ? popup.stroke : null;
    const text = typeof popup.text === 'string' ? popup.text : `${popup.text ?? ''}`;

    ctx.save();
    ctx.globalAlpha = clamp01(1 - progress);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    drawEnergyPopupText(ctx, text, x, y, popup.color ?? '#facc15', strokeStyle);
    ctx.restore();
};

const drawEnergyPopupText = (ctx, text, x, y, fillStyle, strokeStyle) => {
    if (strokeStyle && typeof ctx.strokeText === 'function') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = strokeStyle;
        ctx.strokeText(text, x, y);
    }
    if (typeof ctx.fillText === 'function') {
        ctx.fillStyle = fillStyle;
        ctx.fillText(text, x, y);
    }
};

export function drawEnergyPopups(ctx, popups) {
    if (!Array.isArray(popups) || popups.length === 0) {
        return;
    }

    popups.forEach((popup) => drawEnergyPopup(ctx, popup));
}

const drawMergeTrailLines = (ctx, start, end, palette, outerAlpha, innerAlpha, width) => {
    ctx.strokeStyle = toMergeColor(palette.trail, outerAlpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${innerAlpha})`;
    ctx.lineWidth = width * 0.45;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
};

const drawMergeTrailOrb = (ctx, animation, progress, start, end, palette, width) => {
    const orbProgress = easeInOutCubic(progress);
    const orbX = lerp(start.x, end.x, orbProgress);
    const orbY = lerp(start.y, end.y, orbProgress);
    const orbRadius = (animation.orbRadius ?? width * 0.6) * (1 - progress * 0.4);
    const orbAlpha = 0.8 * (1 - progress * 0.6);

    ctx.fillStyle = toMergeColor(palette.glow, orbAlpha);
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, orbAlpha + 0.2)})`;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius * 0.55, 0, Math.PI * 2);
    ctx.fill();
};

const drawMergeTrail = (ctx, animation, progress) => {
    const start = animation.startCenter;
    const end = animation.endCenter;
    if (!start || !end) {
        return;
    }

    const palette = getMergePalette(animation.color);
    const width = (animation.trailWidth ?? 30) * (1 - progress * 0.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    drawMergeTrailLines(ctx, start, end, palette, 0.55 * (1 - progress * 0.9), 0.85 * (1 - progress * 0.95), width);
    drawMergeTrailOrb(ctx, animation, progress, start, end, palette, width);
    ctx.restore();
};

const drawMergeTraveler = (ctx, animation, progress, assets) => {
    const sprite = assets?.[animation.spriteKey];
    const start = animation.start;
    const end = animation.end;
    if (!sprite || !start || !end) {
        return;
    }

    const baseWidth = animation.width ?? sprite.width;
    const baseHeight = animation.height ?? sprite.height;
    if (!baseWidth || !baseHeight) {
        return;
    }

    const eased = easeInOutCubic(progress);
    const scale = 1 + 0.12 * (1 - progress);
    const width = baseWidth * scale;
    const height = baseHeight * scale;
    const drawX = lerp(start.x, end.x, eased) + (baseWidth - width) / 2;
    const drawY = lerp(start.y, end.y, eased) + (baseHeight - height) / 2;

    ctx.save();
    ctx.globalAlpha = clamp01(easeOutCubic(1 - progress));
    ctx.drawImage(sprite, drawX, drawY, width, height);
    ctx.restore();
};

const drawMergeTargetCore = (ctx, center, yOffset, radius, palette, glowStrength) => {
    const alpha = 0.55 * glowStrength;
    ctx.lineWidth = 5 * (0.65 + 0.35 * glowStrength);
    ctx.strokeStyle = toMergeColor(palette.glow, alpha);
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, radius, 0, Math.PI * 2);
    ctx.stroke();

    const coreStrength = clamp01(glowStrength * 1.1);
    ctx.globalAlpha = 0.7 * coreStrength;
    ctx.fillStyle = `rgba(255,255,255,${0.45 * coreStrength})`;
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
};

const drawMergeTargetRing = (ctx, center, yOffset, radiusBase, palette, progress) => {
    const ringProgress = clamp01((progress - 0.35) / 0.65);
    if (ringProgress <= 0) {
        return;
    }

    const ringRadius = radiusBase * (1.15 + ringProgress * 1.35);
    const ringFade = 1 - ringProgress;
    ctx.globalAlpha = 0.45 * ringFade;
    ctx.lineWidth = 3 * (0.8 + 0.2 * ringFade);
    ctx.strokeStyle = toMergeColor(palette.glow, 0.4 * ringFade);
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25 * ringFade;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, ringRadius * 0.92, 0, Math.PI * 2);
    ctx.stroke();
};

const drawMergeTargetGlow = (ctx, animation, progress) => {
    const targetTower = animation.targetTower;
    if (!targetTower || typeof targetTower.center !== 'function') {
        return;
    }

    const center = targetTower.center();
    const radiusBase = Math.max(targetTower.w ?? 0, targetTower.h ?? 0) * 0.42;
    const towerPulse = typeof targetTower.getMergePulseStrength === 'function' ? targetTower.getMergePulseStrength() : 0;
    const glowStrength = Math.max(easeOutCubic(1 - progress), towerPulse);
    const radius = radiusBase * (1 + 0.32 * glowStrength);
    const yOffset = (targetTower.h ?? 0) * 0.25;
    const palette = getMergePalette(animation.color);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawMergeTargetCore(ctx, center, yOffset, radius, palette, glowStrength);
    drawMergeTargetRing(ctx, center, yOffset, radiusBase, palette, progress);
    ctx.restore();
};

export function drawMergeAnimations(ctx, animations, assets) {
    if (!Array.isArray(animations) || animations.length === 0) {
        return;
    }

    animations.forEach((animation) => {
        const progress = animation.duration ? clamp01(animation.elapsed / animation.duration) : 1;
        drawMergeTrail(ctx, animation, progress);
        drawMergeTraveler(ctx, animation, progress, assets);
        drawMergeTargetGlow(ctx, animation, progress);
    });
}
