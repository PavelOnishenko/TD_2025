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
