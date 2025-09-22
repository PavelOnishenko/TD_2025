const COLOR_PRESETS = {
    red: { r: 255, g: 180, b: 120 },
    blue: { r: 160, g: 210, b: 255 },
    default: { r: 255, g: 220, b: 170 },
};

const PARTICLE_COUNT = 16;
const MIN_LIFE = 0.25;
const MAX_LIFE = 0.45;
const MIN_SPEED = 140;
const MAX_SPEED = 260;
const GRAVITY = 220;
const DAMPING = 3;

function getColorPreset(color) {
    return COLOR_PRESETS[color] ?? COLOR_PRESETS.default;
}

function toColor({ r, g, b }, alpha) {
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function createExplosion(x, y, color) {
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
        const life = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE);
        return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            radius: 2 + Math.random() * 2,
            color,
        };
    });

    return { particles };
}

export function updateExplosions(explosions, dt) {
    if (!explosions?.length) return;
    const damping = Math.max(0, 1 - DAMPING * dt);
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const alive = [];
        for (const particle of explosion.particles) {
            particle.life -= dt;
            if (particle.life <= 0) continue;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vx *= damping;
            particle.vy = particle.vy * damping + GRAVITY * dt;
            alive.push(particle);
        }
        explosion.particles = alive;
        if (!alive.length) {
            explosions.splice(i, 1);
        }
    }
}

export function drawExplosions(ctx, explosions = []) {
    const particles = [];
    for (const explosion of explosions) {
        if (!explosion?.particles) continue;
        for (const particle of explosion.particles) {
            if (particle.life > 0) particles.push(particle);
        }
    }

    if (!particles.length) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const particle of particles) {
        const preset = getColorPreset(particle.color);
        const progress = Math.max(0, Math.min(1, particle.life / particle.maxLife));
        const alpha = 0.75 * progress;
        const radius = particle.radius * (0.35 + 0.65 * progress);

        ctx.beginPath();
        ctx.fillStyle = toColor(preset, alpha);
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function shouldRenderGlow(enemy, ctx) {
    return (
        enemy &&
        typeof enemy.canRenderGlow === 'function' &&
        enemy.canRenderGlow(ctx)
    );
}

function resolveGlowPalette(enemy) {
    if (typeof enemy.getGlowPalette === 'function') {
        return enemy.getGlowPalette();
    }
    return null;
}

function computeGlowState(enemy) {
    const anchorX = enemy.x + enemy.engineFlame.anchor.x + enemy.engineFlame.offset.x;
    const anchorY = enemy.y + enemy.engineFlame.anchor.y + enemy.engineFlame.offset.y;
    const timeSource = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const flicker = 0.75 + Math.sin(timeSource / 180 + enemy.glowPhase) * 0.25;
    const stretch = 1.15 + Math.sin(timeSource / 260 + enemy.glowPhase * 0.6) * 0.2;
    return { anchorX, anchorY, flicker, stretch };
}

function drawGlowHalo(ctx, enemy, palette, flicker, stretch) {
    ctx.save();
    ctx.scale(1, 1.25 * stretch);
    ctx.globalAlpha = 0.55;
    const haloRadius = enemy.w * (0.38 + 0.07 * flicker);
    const haloGradient = ctx.createRadialGradient(0, 0, haloRadius * 0.1, 0, 0, haloRadius);
    haloGradient.addColorStop(0, palette.core);
    haloGradient.addColorStop(0.4, palette.mid);
    haloGradient.addColorStop(1, palette.halo);
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGlowFlame(ctx, enemy, palette, flicker, stretch) {
    ctx.save();
    ctx.translate(0, -enemy.h * 0.05);
    ctx.scale(1, stretch * 1.5);
    ctx.globalAlpha = 0.7;
    const flameHeight = enemy.h * (0.9 + 0.1 * flicker);
    const flameGradient = ctx.createLinearGradient(0, 0, 0, -flameHeight);
    flameGradient.addColorStop(0, palette.core);
    flameGradient.addColorStop(0.25, palette.flare);
    flameGradient.addColorStop(1, palette.trail);
    ctx.fillStyle = flameGradient;
    const flameWidth = enemy.w * (0.22 + 0.08 * flicker);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(flameWidth, -flameHeight * 0.35, 0, -flameHeight);
    ctx.quadraticCurveTo(-flameWidth, -flameHeight * 0.35, 0, 0);
    ctx.fill();
    ctx.restore();
}

function drawGlowSpark(ctx, enemy, palette, flicker) {
    ctx.save();
    ctx.translate(0, -enemy.h * 0.1);
    ctx.scale(1, 1 + 0.3 * flicker);
    ctx.globalAlpha = 0.9;
    const sparkRadius = enemy.w * (0.16 + 0.05 * flicker);
    const sparkGradient = ctx.createRadialGradient(0, 0, sparkRadius * 0.25, 0, 0, sparkRadius);
    sparkGradient.addColorStop(0, palette.spark);
    sparkGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sparkGradient;
    ctx.beginPath();
    ctx.arc(0, 0, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export function drawEnemyEngineGlow(ctx, enemy) {
    if (!shouldRenderGlow(enemy, ctx)) return;
    const palette = resolveGlowPalette(enemy);
    if (!palette) return;
    const { anchorX, anchorY, flicker, stretch } = computeGlowState(enemy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(enemy.engineFlame.angle);
    drawGlowHalo(ctx, enemy, palette, flicker, stretch);
    drawGlowFlame(ctx, enemy, palette, flicker, stretch);
    drawGlowSpark(ctx, enemy, palette, flicker);
    ctx.restore();
    ctx.restore();
}
