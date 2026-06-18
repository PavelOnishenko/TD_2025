import {
    BASE_DEBRIS_ROT_SPEED,
    getVariantConfig,
    normalizeExplosionOptions,
    getColorPreset,
    toColor,
    toDebrisPalette,
} from './explosionConfig.js';

const GRAVITY = 220;
const DAMPING = 3;
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
function createExplosionParticles(x, y, config, color) {
    const particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomBetween(config.minSpeed, config.maxSpeed);
        const life = randomBetween(config.minLife, config.maxLife);
        const radius = randomBetween(config.minRadius, config.maxRadius);
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            radius,
            color,
            alphaScale: config.alphaScale,
        });
    }
    return particles;
}

function createShockwave(x, y, radius) {
    if (!Number.isFinite(radius) || radius <= 0) {
        return null;
    }

    const maxLife = 0.5;
    const thickness = Math.max(6, Math.min(radius * 0.18, 26));
    return {
        x,
        y,
        radius,
        lineWidth: thickness,
        life: maxLife,
        maxLife,
    };
}
function createDebris(x, y, config) {
    if (!config) {
        return [];
    }
    const count = Math.max(0, config.count ?? 0);
    if (!count) {
        return [];
    }
    const palette = toDebrisPalette();
    const rotation = config.rotation ?? BASE_DEBRIS_ROT_SPEED;
    const fragments = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomBetween(config.minSpeed, config.maxSpeed);
        const life = randomBetween(config.minLife, config.maxLife);
        const length = randomBetween(config.minLength, config.maxLength);
        const width = randomBetween(config.minWidth, config.maxWidth);
        const rotationSpeed = randomBetween(rotation.min, rotation.max);
        fragments.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed,
            length,
            width,
            palette,
        });
    }
    return fragments;
}
function advanceParticle(particle, dt, damping) {
    particle.life -= dt;
    if (particle.life <= 0) {
        return false;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= damping;
    particle.vy = particle.vy * damping + GRAVITY * dt;
    return true;
}
function advanceFragment(fragment, dt, damping) {
    fragment.life -= dt;
    if (fragment.life <= 0) {
        return false;
    }
    fragment.x += fragment.vx * dt;
    fragment.y += fragment.vy * dt;
    fragment.vx *= damping;
    fragment.vy = fragment.vy * damping + GRAVITY * dt;
    fragment.rotation += fragment.rotationSpeed * dt;
    return true;
}
export function createExplosion(x, y, options) {
    const { color, variant } = normalizeExplosionOptions(options);
    const { ringRadius } = options ?? {};
    const config = getVariantConfig(variant);
    const resolvedColor = config.resolveColor(color);
    const particles = createExplosionParticles(x, y, config, resolvedColor);
    const debris = createDebris(x, y, config.debris);
    const shockwave = createShockwave(x, y, ringRadius);
    return { particles, debris, shockwave };
}
export function updateExplosions(explosions, dt) {
    if (!explosions?.length) {
        return;
    }
    const damping = Math.max(0, 1 - DAMPING * dt);
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const particles = [];
        for (const particle of explosion.particles ?? []) {
            if (advanceParticle(particle, dt, damping)) {
                particles.push(particle);
            }
        }
        const fragments = [];
        for (const fragment of explosion.debris ?? []) {
            if (advanceFragment(fragment, dt, damping)) {
                fragments.push(fragment);
            }
        }
        const shockwave = explosion.shockwave;
        if (shockwave) {
            shockwave.life -= dt;
        }

        explosion.particles = particles;
        explosion.debris = fragments;
        explosion.shockwave = shockwave?.life > 0 ? shockwave : null;

        const hasShockwave = Boolean(explosion.shockwave);
        if (!particles.length && !fragments.length && !hasShockwave) {
            explosions.splice(i, 1);
        }
    }
}
export function drawExplosions(ctx, explosions = []) {
    const particles = [];
    const debris = [];
    const shockwaves = [];
    for (const explosion of explosions) {
        for (const particle of explosion?.particles ?? []) {
            if (particle.life > 0) {
                particles.push(particle);
            }
        }
        for (const fragment of explosion?.debris ?? []) {
            if (fragment.life > 0) {
                debris.push(fragment);
            }
        }
        if (explosion?.shockwave?.life > 0) {
            shockwaves.push(explosion.shockwave);
        }
    }
    if (!particles.length && !debris.length && !shockwaves.length) {
        return;
    }
    if (shockwaves.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawShockwavesArray(shockwaves, ctx);
        ctx.restore();
    }
    if (particles.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawParticlesArray(particles, ctx);
        ctx.restore();
    }
    if (debris.length) {
        drawDebrisArray(debris, ctx);
    }
}
function drawParticlesArray(particles, ctx) {
    for (const particle of particles) {
        const preset = getColorPreset(particle.color);
        const progress = Math.max(0, Math.min(1, particle.life / particle.maxLife));
        const alpha = 0.75 * progress * (particle.alphaScale ?? 1);
        const radius = particle.radius * (0.35 + 0.65 * progress);
        ctx.beginPath();
        ctx.fillStyle = toColor(preset, alpha);
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawShockwavesArray(shockwaves, ctx) {
    for (const shockwave of shockwaves) {
        const progress = Math.max(0, Math.min(1, shockwave.life / shockwave.maxLife));
        const alpha = 0.6 * progress;
        const width = shockwave.lineWidth * (0.6 + 0.4 * progress);
        const glow = Math.max(12, shockwave.radius * 0.18 * progress);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 240, 200, ${alpha})`;
        ctx.lineWidth = width;
        ctx.shadowColor = `rgba(255, 200, 150, ${alpha})`;
        ctx.shadowBlur = glow;
        ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
function drawDebrisArray(debris, ctx) {
    const palette = toDebrisPalette();
    const canMakeGradient = typeof ctx.createLinearGradient === 'function';
    for (const fragment of debris) {
        const progress = Math.max(0, Math.min(1, fragment.life / fragment.maxLife));
        const length = fragment.length * (0.6 + 0.4 * progress);
        const width = fragment.width * (0.5 + 0.5 * progress);
        const stroke = canMakeGradient
            ? ctx.createLinearGradient(0, 0, -length, 0)
            : palette.core;
        if (canMakeGradient) {
            stroke.addColorStop(0, palette.core);
            stroke.addColorStop(0.45, palette.ember);
            stroke.addColorStop(1, palette.smoke);
        }

        ctx.save();
        ctx.translate(fragment.x, fragment.y);
        ctx.rotate(fragment.rotation);
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.moveTo(0, 0);
        ctx.lineTo(-length, 0);
        ctx.stroke();
        ctx.restore();
    }
}
