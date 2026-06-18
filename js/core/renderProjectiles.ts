import { clamp01 } from '../../engine/utils/MathUtils.js';

const ENERGY_PALETTES = {
    red: { core: '#fff4f6', mid: '#ff6d6d', outer: '#ff2f45', sparkle: '#ffd1dc' },
    blue: { core: '#ecfbff', mid: '#4cb9ff', outer: '#2e63ff', sparkle: '#bde4ff' },
    green: { core: '#f2fff0', mid: '#63ff9a', outer: '#00c95a', sparkle: '#cbffd8' },
    purple: { core: '#f9f1ff', mid: '#c76bff', outer: '#7f3dff', sparkle: '#efd4ff' },
    default: { core: '#fff9f0', mid: '#ffb347', outer: '#ff7a18', sparkle: '#ffe0b2' },
};

const MINIGUN_COLORS = {
    red: { trail: 'rgba(255, 108, 52, 0.5)', glow: 'rgba(255, 158, 96, 0.45)', core: 'rgba(255, 244, 232, 0.95)', spark: 'rgba(255, 240, 200, 0.55)' },
    blue: { trail: 'rgba(76, 184, 255, 0.5)', glow: 'rgba(132, 216, 255, 0.45)', core: 'rgba(232, 248, 255, 0.95)', spark: 'rgba(210, 236, 255, 0.6)' },
    default: { trail: 'rgba(255, 186, 110, 0.5)', glow: 'rgba(255, 214, 158, 0.45)', core: 'rgba(255, 244, 224, 0.95)', spark: 'rgba(255, 245, 210, 0.55)' },
};

const RAILGUN_COLORS = {
    red: { outer: [255, 120, 118], mid: [255, 216, 176], core: [255, 255, 255], flare: [255, 226, 200] },
    blue: { outer: [112, 184, 255], mid: [176, 226, 255], core: [255, 255, 255], flare: [210, 236, 255] },
    default: { outer: [255, 196, 132], mid: [255, 228, 180], core: [255, 255, 255], flare: [255, 236, 210] },
};

const ROCKET_COLORS = {
    red: { shell: '#fdfdfd', stripe: '#ff6d6d', trail: 'rgba(255, 124, 64, 0.32)', flameCore: 'rgba(255, 228, 140, 0.95)', flameEdge: 'rgba(255, 118, 64, 0)' },
    blue: { shell: '#f6fbff', stripe: '#4cb9ff', trail: 'rgba(108, 204, 255, 0.32)', flameCore: 'rgba(200, 240, 255, 0.95)', flameEdge: 'rgba(64, 160, 255, 0)' },
    default: { shell: '#ffffff', stripe: '#ffb347', trail: 'rgba(255, 200, 120, 0.32)', flameCore: 'rgba(255, 220, 150, 0.95)', flameEdge: 'rgba(255, 140, 70, 0)' },
};

const getPalette = (palettes, color) => color ? palettes[color] ?? palettes.default : palettes.default;
const toColorFromArray = (rgb, alpha) => {
    const [r, g, b] = rgb ?? [255, 255, 255];
    return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
};

const getProjectileAnimationState = (projectile) => {
    const anim = projectile?.anim && typeof projectile.anim === 'object' ? projectile.anim : {};
    return {
        time: anim.time ?? 0,
        pulseOffset: anim.pulseOffset ?? 0,
        sparkleOffset: anim.sparkleOffset ?? 0,
        jitterAngle: anim.jitterAngle ?? 0,
        pulseSpeed: anim.pulseSpeed ?? 9,
        shimmerSpeed: anim.shimmerSpeed ?? 7,
        vibrationStrength: anim.vibrationStrength ?? 0,
    };
};

const drawMinigunProjectile = (ctx, projectile, anim) => {
    const palette = getPalette(MINIGUN_COLORS, projectile.color);
    const radius = projectile.radius ?? 12;
    const length = projectile.trailLength ?? radius * 3.2;
    const angle = Math.atan2(projectile.vy ?? 0, projectile.vx ?? 1);
    const pulse = Math.sin(anim.time * anim.pulseSpeed + anim.pulseOffset);
    const width = radius * (0.55 + 0.15 * Math.sin(anim.time * (anim.shimmerSpeed * 1.4) + anim.sparkleOffset));
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'lighter';
    const streakGradient = typeof ctx.createLinearGradient === 'function' ? ctx.createLinearGradient(-length, 0, radius * 0.65, 0) : null;
    if (streakGradient) {
        streakGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        streakGradient.addColorStop(0.18, palette.trail);
        streakGradient.addColorStop(0.45, palette.glow);
        streakGradient.addColorStop(1, palette.core);
        ctx.fillStyle = streakGradient;
    } else {
        ctx.fillStyle = palette.core;
    }
    ctx.globalAlpha = 0.9 + 0.1 * pulse;
    ctx.fillRect(-length, -width, length + radius * 0.65, width * 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.spark;
    ctx.beginPath();
    ctx.arc(-length * 0.35, 0, width * (0.7 + 0.2 * pulse), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawRailgunImpact = (ctx, x, y, palette, fade) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const radius = 26 * fade;
    if (typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, toColorFromArray(palette.core, 0.95 * fade));
        gradient.addColorStop(0.45, toColorFromArray(palette.flare, 0.6 * fade));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = toColorFromArray(palette.core, 0.75 * fade);
    }
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(x, y, radius, radius * 0.65, 0, 0, Math.PI * 2);
    } else {
        ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
};

const drawRailgunLayer = (ctx, length, width, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, -width / 2, length, width);
};

const drawRailgunBeam = (ctx, beam, anim) => {
    const palette = getPalette(RAILGUN_COLORS, beam.color);
    const fade = clamp01(1 - (beam.elapsed ?? 0) / (beam.duration ?? 0.25));
    if (fade <= 0) {
        return;
    }
    const length = Math.max(beam.length ?? 260, 0);
    const width = (beam.width ?? 16) * (0.9 + 0.08 * Math.sin((anim.time ?? 0) * 12));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(beam.x, beam.y);
    ctx.rotate(beam.angle ?? 0);
    drawRailgunLayer(ctx, length, width * 1.8, toColorFromArray(palette.outer, 0.28 * fade));
    drawRailgunLayer(ctx, length, width * 1.05, toColorFromArray(palette.mid, 0.55 * fade));
    drawRailgunLayer(ctx, length, width * 0.42, toColorFromArray(palette.core, 0.92 * fade));
    ctx.restore();
    if (Array.isArray(beam.hitPositions)) {
        beam.hitPositions.forEach((hit) => drawRailgunImpact(ctx, hit.x, hit.y, palette, fade));
    }
};

const drawRocketTrail = (ctx, projectile, palette) => {
    if (!Array.isArray(projectile.trail) || projectile.trail.length === 0) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < projectile.trail.length; i += 1) {
        const segment = projectile.trail[i];
        const alpha = clamp01(0.3 - (segment.life ?? 0) * 0.35);
        if (alpha <= 0) {
            continue;
        }
        const radius = (projectile.radius ?? 16) * (0.45 + i / (projectile.trail.length * 1.7));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = palette.trail;
        ctx.beginPath();
        ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
};

const drawRocketProjectile = (ctx, projectile) => {
    const palette = getPalette(ROCKET_COLORS, projectile.color);
    drawRocketTrail(ctx, projectile, palette);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.rotation ?? Math.atan2(projectile.vy ?? 0, projectile.vx ?? 1));
    const baseRadius = projectile.radius ?? 18;
    const bodyLength = baseRadius * 1.9;
    const bodyWidth = baseRadius * 0.85;
    ctx.fillStyle = palette.shell;
    ctx.beginPath();
    ctx.moveTo(bodyLength * 0.55, 0);
    ctx.quadraticCurveTo(bodyLength * 0.08, -bodyWidth, -bodyLength * 0.55, -bodyWidth * 0.78);
    ctx.quadraticCurveTo(-bodyLength * 0.75, 0, -bodyLength * 0.55, bodyWidth * 0.78);
    ctx.quadraticCurveTo(bodyLength * 0.08, bodyWidth, bodyLength * 0.55, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.stripe;
    ctx.fillRect(-bodyLength * 0.12, -bodyWidth * 0.6, bodyLength * 0.3, bodyWidth * 1.2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bodyLength * 0.55, 0, bodyWidth * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.flameCore;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.55, -bodyWidth * 0.6);
    ctx.quadraticCurveTo(-bodyLength * 1.3, 0, -bodyLength * 0.55, bodyWidth * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

const drawEnergySparkles = (ctx, palette, anim, centerX, centerY, radius) => {
    const shimmer = Math.sin(anim.time * anim.shimmerSpeed + anim.sparkleOffset);
    const sparkleRadius = radius * (0.28 + 0.05 * Math.sin(anim.time * (anim.shimmerSpeed * 1.8) + anim.sparkleOffset * 0.5));
    const sparkleOrbit = radius * (0.8 + 0.1 * shimmer);

    for (let i = 0; i < 2; i += 1) {
        const sparklePhase = anim.sparkleOffset + anim.time * anim.shimmerSpeed + i * Math.PI;
        const sparkleX = centerX + Math.cos(sparklePhase) * sparkleOrbit;
        const sparkleY = centerY + Math.sin(sparklePhase) * sparkleOrbit;
        ctx.globalAlpha = 0.8 + 0.15 * Math.sin(sparklePhase * 2);
        ctx.fillStyle = palette.sparkle;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleRadius, 0, Math.PI * 2);
        ctx.fill();
    }
};

const drawEnergyProjectile = (ctx, projectile, anim, defaultRadius) => {
    const palette = getPalette(ENERGY_PALETTES, projectile.color);
    const radius = projectile.radius ?? defaultRadius;
    const pulse = Math.sin(anim.time * anim.pulseSpeed + anim.pulseOffset);
    const vibration = radius * anim.vibrationStrength * Math.sin(anim.time * (anim.pulseSpeed * 1.4) + anim.pulseOffset);
    const centerX = projectile.x + Math.cos(anim.jitterAngle) * vibration;
    const centerY = projectile.y + Math.sin(anim.jitterAngle) * vibration;
    const midRadius = radius * (1.1 + 0.18 * Math.sin(anim.time * (anim.pulseSpeed * 0.6) + anim.pulseOffset + Math.PI / 4));
    const coreRadius = radius * (0.55 + 0.1 * Math.sin(anim.time * (anim.shimmerSpeed * 1.3) + anim.sparkleOffset));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 + 0.25 * pulse;
    ctx.fillStyle = palette.outer;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * (1.8 + 0.35 * pulse), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette.mid;
    ctx.beginPath();
    ctx.arc(centerX, centerY, midRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.core;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    drawEnergySparkles(ctx, palette, anim, centerX, centerY, radius);
    ctx.restore();
};

export const drawProjectile = (ctx, projectile, defaultRadius) => {
    const anim = getProjectileAnimationState(projectile);
    if (projectile.type === 'railgun-beam') {
        drawRailgunBeam(ctx, projectile, anim);
    } else if (projectile.type === 'rocket') {
        drawRocketProjectile(ctx, projectile);
    } else if (projectile.type === 'minigun') {
        drawMinigunProjectile(ctx, projectile, anim);
    } else {
        drawEnergyProjectile(ctx, projectile, anim, defaultRadius);
    }
};
