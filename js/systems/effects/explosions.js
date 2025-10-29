const COLOR_PRESETS = {
    red: { r: 255, g: 180, b: 120 },
    blue: { r: 160, g: 210, b: 255 },
    mismatch: { r: 210, g: 215, b: 225 },
    default: { r: 255, g: 220, b: 170 },
};

const BASE_PARTICLE_COUNT = 16;
const BASE_MIN_LIFE = 0.25;
const BASE_MAX_LIFE = 0.45;
const BASE_MIN_SPEED = 140;
const BASE_MAX_SPEED = 260;
const BASE_MIN_RADIUS = 2;
const BASE_MAX_RADIUS = 4;
const GRAVITY = 220;
const DAMPING = 3;

const VARIANT_CONFIGS = {
    match: {
        particleCount: BASE_PARTICLE_COUNT,
        minLife: BASE_MIN_LIFE,
        maxLife: BASE_MAX_LIFE,
        minSpeed: BASE_MIN_SPEED,
        maxSpeed: BASE_MAX_SPEED,
        minRadius: BASE_MIN_RADIUS,
        maxRadius: BASE_MAX_RADIUS,
        alphaScale: 1,
        resolveColor: color => color ?? 'default',
    },
    mismatch: {
        particleCount: Math.max(8, Math.round(BASE_PARTICLE_COUNT * 0.65)),
        minLife: BASE_MIN_LIFE * 0.65,
        maxLife: BASE_MAX_LIFE * 0.8,
        minSpeed: BASE_MIN_SPEED * 0.6,
        maxSpeed: BASE_MAX_SPEED * 0.75,
        minRadius: BASE_MIN_RADIUS * 0.5,
        maxRadius: BASE_MAX_RADIUS * 0.65,
        alphaScale: 0.6,
        resolveColor: () => 'mismatch',
    },
    merge: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.1),
        minLife: BASE_MIN_LIFE * 0.9,
        maxLife: BASE_MAX_LIFE * 1.25,
        minSpeed: BASE_MIN_SPEED * 0.5,
        maxSpeed: BASE_MAX_SPEED * 0.85,
        minRadius: BASE_MIN_RADIUS * 0.8,
        maxRadius: BASE_MAX_RADIUS * 1.45,
        alphaScale: 1.2,
        resolveColor: color => color ?? 'default',
    },
    kill: {
        particleCount: Math.round(BASE_PARTICLE_COUNT * 1.6),
        minLife: BASE_MIN_LIFE * 0.85,
        maxLife: BASE_MAX_LIFE * 1.5,
        minSpeed: BASE_MIN_SPEED * 0.85,
        maxSpeed: BASE_MAX_SPEED * 1.3,
        minRadius: BASE_MIN_RADIUS * 1.05,
        maxRadius: BASE_MAX_RADIUS * 1.8,
        alphaScale: 1.45,
        resolveColor: color => color ?? 'default',
    },
};

function getVariantConfig(variant = 'match') {
    return VARIANT_CONFIGS[variant] ?? VARIANT_CONFIGS.match;
}

function normalizeExplosionOptions(input) {
    if (typeof input === 'string' || !input) {
        return { color: input ?? 'default', variant: 'match' };
    }
    const { color = 'default', variant = 'match' } = input;
    return { color, variant };
}

function getColorPreset(color) {
    return COLOR_PRESETS[color] ?? COLOR_PRESETS.default;
}

function toColor({ r, g, b }, alpha) {
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function createExplosion(x, y, options) {
    const { color, variant } = normalizeExplosionOptions(options);
    const config = getVariantConfig(variant);
    const resolvedColor = config.resolveColor(color);
    const particles = Array.from({ length: config.particleCount }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
        const life = config.minLife + Math.random() * (config.maxLife - config.minLife);
        const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
        return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            radius,
            color: resolvedColor,
            alphaScale: config.alphaScale,
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
    drawParticlesArray(particles, ctx);
    ctx.restore();
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