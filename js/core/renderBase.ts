import { clamp01 } from '../../engine/utils/MathUtils.js';

const BASE_FLASH_PALETTES = {
    red: {
        hull: 'rgba(255, 176, 126, 0.9)',
        gradient: [
            { stop: 0, color: 'rgba(255, 246, 232, 0.98)' },
            { stop: 0.45, color: 'rgba(255, 170, 110, 0.65)' },
            { stop: 1, color: 'rgba(140, 40, 10, 0)' },
        ],
    },
    blue: {
        hull: 'rgba(150, 210, 255, 0.9)',
        gradient: [
            { stop: 0, color: 'rgba(232, 248, 255, 0.98)' },
            { stop: 0.45, color: 'rgba(120, 195, 255, 0.6)' },
            { stop: 1, color: 'rgba(20, 70, 140, 0)' },
        ],
    },
    default: {
        hull: 'rgba(255, 214, 170, 0.9)',
        gradient: [
            { stop: 0, color: 'rgba(255, 244, 224, 0.95)' },
            { stop: 0.45, color: 'rgba(255, 200, 150, 0.6)' },
            { stop: 1, color: 'rgba(120, 60, 20, 0)' },
        ],
    },
};

const getBaseFlashPalette = (color) => color ? BASE_FLASH_PALETTES[color] ?? BASE_FLASH_PALETTES.default : BASE_FLASH_PALETTES.default;

const supportsAdvancedBaseDrawing = (ctx) => (
    typeof ctx.beginPath === 'function'
    && typeof ctx.moveTo === 'function'
    && typeof ctx.lineTo === 'function'
    && typeof ctx.closePath === 'function'
    && typeof ctx.createLinearGradient === 'function'
    && typeof ctx.createRadialGradient === 'function'
);

const traceEllipse = (ctx, cx, cy, rx, ry) => {
    if (!ctx) {
        return;
    }
    if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        return;
    }

    const canTransform = typeof ctx.save === 'function'
        && typeof ctx.restore === 'function'
        && typeof ctx.translate === 'function'
        && typeof ctx.scale === 'function';
    if (canTransform) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(rx, ry);
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.restore();
        return;
    }
    ctx.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
};

const drawFallbackBase = (ctx, base) => {
    ctx.fillStyle = '#1f6a78';
    ctx.fillRect(base.x, base.y, base.w, base.h);
    if (typeof ctx.strokeRect === 'function') {
        ctx.strokeStyle = '#0b1f27';
        ctx.strokeRect(base.x, base.y, base.w, base.h);
    }
};

const getHullPoints = (base, centerX, baseTop, baseBottom) => [
    { x: base.x + base.w * 0.12, y: baseTop + base.h * 0.3 },
    { x: centerX, y: baseTop },
    { x: base.x + base.w * 0.88, y: baseTop + base.h * 0.3 },
    { x: base.x + base.w, y: baseTop + base.h * 0.68 },
    { x: centerX, y: baseBottom },
    { x: base.x, y: baseTop + base.h * 0.68 },
];

const tracePolygon = (ctx, points) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
};

const drawBaseShadow = (ctx, base, centerX, baseBottom) => {
    const shadowY = baseBottom - base.h * 0.1;
    ctx.beginPath();
    traceEllipse(ctx, centerX, shadowY, base.w * 0.7, base.h * 0.35);
    const shadowGradient = ctx.createRadialGradient(centerX, shadowY, base.w * 0.1, centerX, shadowY, base.w);
    shadowGradient.addColorStop(0, 'rgba(32, 60, 61, 0.55)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.fill();
};

const drawBaseHull = (ctx, base, hullPoints, centerX, baseTop, baseBottom) => {
    const hullGradient = ctx.createLinearGradient(centerX, baseTop, centerX, baseBottom);
    hullGradient.addColorStop(0, '#2d7e86');
    hullGradient.addColorStop(0.5, '#1d4f57');
    hullGradient.addColorStop(1, '#122a34');
    tracePolygon(ctx, hullPoints);
    ctx.fillStyle = hullGradient;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, base.w * 0.06);
    ctx.strokeStyle = 'rgba(15, 40, 48, 0.9)';
    ctx.stroke();
};

const drawInnerPlating = (ctx, base, hullPoints, centerX, centerY, baseTop, baseBottom) => {
    const innerInset = base.w * 0.16;
    const innerPoints = hullPoints.map((point) => ({
        x: point.x + Math.sign(centerX - point.x) * innerInset,
        y: point.y + (point.y < centerY ? innerInset * 0.7 : -innerInset * 0.4),
    }));
    const innerGradient = ctx.createLinearGradient(centerX, baseTop, centerX, baseBottom);
    innerGradient.addColorStop(0, '#42f2e5');
    innerGradient.addColorStop(1, '#1f6a78');
    tracePolygon(ctx, innerPoints);
    ctx.fillStyle = innerGradient;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, base.w * 0.035);
    ctx.strokeStyle = 'rgba(66, 228, 214, 0.45)';
    ctx.stroke();
};

const drawBaseCore = (ctx, base, centerX, centerY, baseTop, baseBottom) => {
    const coreRadius = base.w * 0.22;
    const coreGradient = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.2, centerX, centerY, coreRadius);
    coreGradient.addColorStop(0, '#9fffe0');
    coreGradient.addColorStop(0.5, '#45f0ff');
    coreGradient.addColorStop(1, 'rgba(27, 198, 240, 0.1)');
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();
    ctx.lineWidth = Math.max(0.8, base.w * 0.02);
    ctx.strokeStyle = 'rgba(159, 255, 224, 0.55)';
    ctx.beginPath();
    ctx.moveTo(centerX, baseTop + base.h * 0.18);
    ctx.lineTo(centerX, baseBottom - base.h * 0.18);
    ctx.moveTo(base.x + base.w * 0.32, centerY);
    ctx.lineTo(base.x + base.w * 0.68, centerY);
    ctx.stroke();
};

const getFlashStrength = (flash) => {
    if (!flash?.active || (flash.duration ?? 0) <= 0) {
        return 0;
    }

    const progress = clamp01((flash.elapsed ?? 0) / flash.duration);
    const baseStrength = Number.isFinite(flash.strength) ? flash.strength : 1;
    return Math.max(0, baseStrength * Math.pow(1 - progress, 1.35));
};

const addFlashGradientStops = (gradient, palette) => {
    const stops = Array.isArray(palette.gradient) ? palette.gradient : [];
    if (stops.length === 0) {
        gradient.addColorStop(0, palette.hull);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        return;
    }
    stops.forEach((stop) => {
        const offset = Number.isFinite(stop?.stop) ? clamp01(stop.stop) : 0;
        const color = typeof stop?.color === 'string' ? stop.color : palette.hull;
        gradient.addColorStop(offset, color);
    });
};

const drawBaseFlash = (ctx, base, hullPoints, centerX, centerY, flash, flashStrength) => {
    if (flashStrength <= 0.001) {
        return;
    }

    const palette = getBaseFlashPalette(flash?.color);
    const impactX = Number.isFinite(flash?.impactX) ? flash.impactX : centerX;
    const impactY = Number.isFinite(flash?.impactY) ? flash.impactY : centerY;
    const glowRadius = Math.max(base.w, base.h) * (0.45 + 0.55 * flashStrength);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawBaseFlashHull(ctx, hullPoints, palette, flashStrength);
    drawBaseFlashGlow(ctx, centerX, centerY, impactX, impactY, glowRadius, palette, flashStrength);
    drawBaseFlashSpark(ctx, impactX, impactY, Math.max(base.w * 0.08, glowRadius * 0.3 * flashStrength), flashStrength);
    ctx.restore();
};

const drawBaseFlashHull = (ctx, hullPoints, palette, flashStrength) => {
    ctx.globalAlpha = 0.35 * flashStrength;
    tracePolygon(ctx, hullPoints);
    ctx.fillStyle = palette.hull;
    ctx.fill();
};

const drawBaseFlashGlow = (ctx, centerX, centerY, impactX, impactY, glowRadius, palette, flashStrength) => {
    const innerRadius = Math.max(6, glowRadius * 0.18);
    const gradient = ctx.createRadialGradient(impactX, impactY, innerRadius, impactX, impactY, glowRadius);
    addFlashGradientStops(gradient, palette);
    ctx.globalAlpha = Math.min(1, 0.8 * flashStrength);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    traceEllipse(ctx, centerX, centerY, glowRadius * 1.15, glowRadius * 0.9);
    ctx.fill();
};

const drawBaseFlashSpark = (ctx, impactX, impactY, sparkRadius, flashStrength) => {
    ctx.globalAlpha = Math.min(1, 0.9 * flashStrength);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(impactX, impactY, sparkRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
};

export function drawBase(game) {
    const ctx = game.ctx;
    const base = game.base;
    if (!ctx || !base) {
        return;
    }
    if (!supportsAdvancedBaseDrawing(ctx)) {
        drawFallbackBase(ctx, base);
        return;
    }

    const centerX = base.x + base.w / 2;
    const centerY = base.y + base.h / 2;
    const baseTop = base.y;
    const baseBottom = base.y + base.h;
    const hullPoints = getHullPoints(base, centerX, baseTop, baseBottom);
    ctx.save();
    drawBaseShadow(ctx, base, centerX, baseBottom);
    drawBaseHull(ctx, base, hullPoints, centerX, baseTop, baseBottom);
    drawInnerPlating(ctx, base, hullPoints, centerX, centerY, baseTop, baseBottom);
    drawBaseCore(ctx, base, centerX, centerY, baseTop, baseBottom);
    drawBaseFlash(ctx, base, hullPoints, centerX, centerY, game.baseHitFlash, getFlashStrength(game.baseHitFlash));
    ctx.restore();
}
