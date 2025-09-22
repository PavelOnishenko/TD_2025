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
        return {x,y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, radius: 2 + Math.random() * 2, color};
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
    if (!particles.length) 
        return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawParticlesArray(particles, ctx);
    ctx.restore();
}

function drawParticlesArray(particles, ctx) {
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

function getTowerEmitterPosition(tower) {
    const baseFactor = tower.level === 3 ? 0.17 : tower.level === 2 ? 0.2 : 0.24;
    return {
        x: tower.x + tower.w / 2,
        y: tower.y + tower.h * baseFactor,
    };
}

function getTowerFlashRadius(tower) {
    const base = tower.w * 0.28;
    return base + (tower.level - 1) * 4;
}

function getTowerFlashColor(tower, intensity) {
    const alpha = 0.6 * intensity;
    return tower.color === 'red'
        ? `rgba(255,140,100,${alpha})`
        : `rgba(140,190,255,${alpha})`;
}

function getTowerGlowPulse(tower) {
    return 0.5 + 0.5 * Math.sin(tower.glowTime);
}

function getTowerGlowProfile(tower, pulse) {
    const levelProfiles = {
        1: {
            radiusBase: 0.68,
            radiusPulse: 0.14,
            coreBase: 0.24,
            corePulse: 0.16,
            innerAlphaBase: 0.32,
            innerAlphaPulse: 0.2,
            innerRadiusRatio: 0.14,
            midStop: 0.42,
        },
        2: {
            radiusBase: 0.76,
            radiusPulse: 0.16,
            coreBase: 0.28,
            corePulse: 0.18,
            innerAlphaBase: 0.38,
            innerAlphaPulse: 0.22,
            innerRadiusRatio: 0.16,
            midStop: 0.46,
        },
        3: {
            radiusBase: 0.84,
            radiusPulse: 0.18,
            coreBase: 0.34,
            corePulse: 0.22,
            innerAlphaBase: 0.44,
            innerAlphaPulse: 0.24,
            innerRadiusRatio: 0.18,
            midStop: 0.5,
        },
    };
    const profile = levelProfiles[tower.level] ?? levelProfiles[3];
    const baseRadius = getTowerFlashRadius(tower);
    const radius = baseRadius * profile.radiusBase * (1 + profile.radiusPulse * pulse);
    const innerAlpha = profile.innerAlphaBase + profile.innerAlphaPulse * pulse;
    const palette = getTowerGlowPalette(tower, innerAlpha);
    return {
        radius,
        coreAlpha: profile.coreBase + profile.corePulse * pulse,
        innerColor: palette.inner,
        outerColor: palette.outer,
        innerRadiusRatio: profile.innerRadiusRatio,
        midStop: profile.midStop,
    };
}

function getTowerGlowPalette(tower, innerAlpha) {
    const redPalette = {
        1: {
            inner: [255, 178, 140],
            outer: [255, 120, 90],
        },
        2: {
            inner: [255, 160, 120],
            outer: [255, 115, 85],
        },
        3: {
            inner: [255, 150, 120],
            outer: [255, 120, 90],
        },
    };
    const bluePalette = {
        1: {
            inner: [170, 210, 255],
            outer: [110, 160, 255],
        },
        2: {
            inner: [160, 200, 255],
            outer: [108, 170, 255],
        },
        3: {
            inner: [150, 190, 255],
            outer: [110, 160, 255],
        },
    };
    const paletteByColor = tower.color === 'red' ? redPalette : bluePalette;
    const palette = paletteByColor[tower.level] ?? paletteByColor[3];
    if (!palette) {
        return {
            inner: `rgba(255,255,255,${innerAlpha})`,
            outer: 'rgba(255,255,255,0)',
        };
    }
    return {
        inner: `rgba(${palette.inner[0]},${palette.inner[1]},${palette.inner[2]},${innerAlpha})`,
        outer: `rgba(${palette.outer[0]},${palette.outer[1]},${palette.outer[2]},0)`,
    };
}

export function drawTowerMuzzleFlash(ctx, tower) {
    if (!tower || !ctx) return;
    const intensity = tower.flashTimer / tower.flashDuration;
    const { x, y } = getTowerEmitterPosition(tower);
    const radius = getTowerFlashRadius(tower);
    const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    gradient.addColorStop(0, `rgba(255,255,255,${0.9 * intensity})`);
    gradient.addColorStop(0.7, getTowerFlashColor(tower, intensity));
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export function drawTowerTopGlow(ctx, tower) {
    if (!tower || !ctx || typeof ctx.createRadialGradient !== 'function') return;
    const pulse = getTowerGlowPulse(tower);
    const { x, y } = getTowerEmitterPosition(tower);
    const profile = getTowerGlowProfile(tower, pulse);
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
