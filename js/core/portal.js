const TAU = Math.PI * 2;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp01(value) {
    return clamp(value, 0, 1);
}

function normalizeVector(vector) {
    const x = Number.isFinite(vector?.x) ? vector.x : 0;
    const y = Number.isFinite(vector?.y) ? vector.y : 0;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
}

function rotateVector(base, tangent, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: base.x * cos + tangent.x * sin,
        y: base.y * cos + tangent.y * sin,
    };
}

function randomBetween(min, max) {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    const low = Math.min(safeMin, safeMax);
    const high = Math.max(safeMin, safeMax);
    return lerp(low, high, Math.random());
}

function createIdleWisps(count, radiusX, radiusY) {
    const safeCount = Math.max(0, Math.floor(count));
    const wisps = [];
    for (let i = 0; i < safeCount; i += 1) {
        wisps.push({
            seed: Math.random() * TAU,
            speed: randomBetween(0.18, 0.42),
            radius: lerp(radiusX * 0.4, radiusX * 0.85, Math.random()),
            verticalScale: lerp(0.65, 0.95, Math.random()),
            thickness: lerp(0.8, 1.6, Math.random()),
            arc: lerp(Math.PI * 0.35, Math.PI * 0.72, Math.random()),
            polarity: Math.random() > 0.5 ? 1 : -1,
        });
    }
    return wisps;
}

function createPalette(customPalette = {}) {
    return {
        rim: customPalette.rim ?? 'rgba(140, 220, 255, 0.85)',
        rimSecondary: customPalette.rimSecondary ?? 'rgba(90, 170, 255, 0.35)',
        inner: customPalette.inner ?? 'rgba(15, 32, 64, 0.65)',
        core: customPalette.core ?? 'rgba(18, 110, 180, 0.9)',
        flare: customPalette.flare ?? 'rgba(200, 245, 255, 0.95)',
        tail: customPalette.tail ?? 'rgba(120, 210, 255, 0.55)',
        particles: customPalette.particles ?? 'rgba(200, 244, 255, 1)',
        sparks: customPalette.sparks ?? 'rgba(255, 255, 255, 1)',
        swirl: customPalette.swirl ?? 'rgba(140, 236, 255, 0.45)',
    };
}

const PULSE_COLORS = {
    red: {
        rim: 'rgba(255, 142, 120, 0.95)',
        flare: 'rgba(255, 210, 190, 0.85)',
    },
    blue: {
        rim: 'rgba(130, 190, 255, 0.95)',
        flare: 'rgba(205, 240, 255, 0.85)',
    },
    default: {
        rim: 'rgba(180, 220, 255, 0.95)',
        flare: 'rgba(220, 250, 255, 0.85)',
    },
};

function resolvePulsePalette(color) {
    if (!color) {
        return PULSE_COLORS.default;
    }
    const key = color.toLowerCase();
    return PULSE_COLORS[key] ?? PULSE_COLORS.default;
}

function createParticle({
    portal,
    offsetY,
    strength,
    color,
}) {
    const baseSpeed = randomBetween(portal.config.particleSpeed.min, portal.config.particleSpeed.max)
        * (0.7 + strength * 0.6);
    const spread = randomBetween(-0.4, 0.4);
    const direction = rotateVector(portal.normal, portal.tangent, spread);
    const palette = resolvePulsePalette(color);
    return {
        x: portal.position.x + randomBetween(-portal.radiusX * 0.12, portal.radiusX * 0.18),
        y: portal.position.y + offsetY + randomBetween(-portal.radiusY * 0.05, portal.radiusY * 0.05),
        vx: direction.x * baseSpeed,
        vy: direction.y * baseSpeed,
        life: randomBetween(portal.config.particleLife * 0.65, portal.config.particleLife * 1.15),
        age: 0,
        size: lerp(3, 6, Math.random()) * (0.7 + strength * 0.4),
        palette,
    };
}

export function createPortalState(options = {}) {
    const spawn = options.spawn ?? { x: 0, y: 0 };
    const anchor = options.anchor ?? spawn;
    const offset = {
        x: Number.isFinite(options.offset?.x) ? options.offset.x : Number.isFinite(options.offsetX) ? options.offsetX : 140,
        y: Number.isFinite(options.offset?.y) ? options.offset.y : Number.isFinite(options.offsetY) ? options.offsetY : 0,
    };
    const radiusX = Number.isFinite(options.radius?.x) ? options.radius.x : Number.isFinite(options.radiusX) ? options.radiusX : 120;
    const radiusY = Number.isFinite(options.radius?.y) ? options.radius.y : Number.isFinite(options.radiusY) ? options.radiusY : 240;
    const rotation = Number.isFinite(options.rotation) ? options.rotation : -0.12;
    const normal = normalizeVector(options.normal ?? { x: Math.cos(rotation), y: Math.sin(rotation) });
    const tangent = { x: -normal.y, y: normal.x };
    const palette = createPalette(options.palette);
    const portal = {
        spawn,
        anchor,
        offset,
        position: { x: anchor.x + offset.x, y: anchor.y + offset.y },
        radiusX,
        radiusY,
        rotation,
        normal,
        tangent,
        palette,
        pulses: [],
        particles: [],
        idleWisps: createIdleWisps(options.idleWispCount ?? 6, radiusX, radiusY),
        time: 0,
        shimmerSeed: Math.random() * TAU,
        config: {
            pulseDuration: Number.isFinite(options.pulseDuration) ? options.pulseDuration : 0.9,
            maxPulseScale: Number.isFinite(options.maxPulseScale) ? options.maxPulseScale : 1.35,
            rippleThickness: Number.isFinite(options.rippleThickness) ? options.rippleThickness : 0.18,
            particleLife: Number.isFinite(options.particleLife) ? options.particleLife : 0.85,
            particleSpeed: options.particleSpeedRange ?? { min: 320, max: 520 },
            spawnParticleCount: Number.isFinite(options.spawnParticleCount) ? options.spawnParticleCount : 18,
            tailLength: Number.isFinite(options.tailLength) ? options.tailLength : 340,
            tailWidth: Number.isFinite(options.tailWidth) ? options.tailWidth : radiusY * 0.9,
            maxParticles: Number.isFinite(options.maxParticles) ? options.maxParticles : 120,
        },
    };

    portal.config.particleSpeed = {
        min: Number.isFinite(portal.config.particleSpeed?.min)
            ? portal.config.particleSpeed.min
            : 320,
        max: Number.isFinite(portal.config.particleSpeed?.max)
            ? portal.config.particleSpeed.max
            : 520,
    };

    return portal;
}

export function updatePortalState(portal, dt, { spawn } = {}) {
    if (!portal || !Number.isFinite(dt)) {
        return;
    }

    portal.time += dt;

    if (spawn && (spawn.x !== portal.spawn.x || spawn.y !== portal.spawn.y)) {
        portal.spawn = { x: spawn.x, y: spawn.y };
        portal.anchor = { x: spawn.x, y: spawn.y };
        portal.position.x = portal.anchor.x + portal.offset.x;
        portal.position.y = portal.anchor.y + portal.offset.y;
    }

    portal.pulses = portal.pulses.filter(pulse => {
        pulse.age += dt;
        return pulse.age < pulse.duration;
    });

    portal.particles = portal.particles.filter(particle => {
        particle.age += dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        return particle.age < particle.life;
    });

    const maxParticles = portal.config.maxParticles;
    if (portal.particles.length > maxParticles) {
        portal.particles.splice(0, portal.particles.length - maxParticles);
    }
}

export function registerPortalBurst(portal, {
    y = null,
    strength = 1,
    color = 'default',
} = {}) {
    if (!portal) {
        return;
    }

    const normalizedStrength = clamp(strength, 0.3, 2);
    const duration = portal.config.pulseDuration * (0.85 + normalizedStrength * 0.18);
    const palette = resolvePulsePalette(color);
    const offsetY = Number.isFinite(y)
        ? clamp(y - portal.position.y, -portal.radiusY * 0.9, portal.radiusY * 0.9)
        : randomBetween(-portal.radiusY * 0.4, portal.radiusY * 0.4);
    const pulse = {
        age: 0,
        duration,
        strength: normalizedStrength,
        color,
        palette,
        offsetY,
        seed: Math.random() * TAU,
    };

    portal.pulses.push(pulse);
    if (portal.pulses.length > 8) {
        portal.pulses.shift();
    }

    const particleCount = Math.max(4, Math.round(portal.config.spawnParticleCount * (0.6 + normalizedStrength * 0.45)));
    for (let i = 0; i < particleCount; i += 1) {
        portal.particles.push(createParticle({
            portal,
            offsetY,
            strength: normalizedStrength,
            color,
        }));
    }
}

function easeOutCubic(t) {
    const clamped = clamp01(t);
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}

function easeOutExpo(t) {
    const clamped = clamp01(t);
    if (clamped === 1) {
        return 1;
    }
    return 1 - (2 ** (-10 * clamped));
}

function drawEllipse(ctx, radiusX, radiusY) {
    if (typeof ctx.ellipse === 'function') {
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
        ctx.fill();
        return;
    }
    ctx.save();
    ctx.scale(radiusX, radiusY);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.restore();
    ctx.fill();
}

function drawEllipseStroke(ctx, radiusX, radiusY, lineWidth) {
    if (typeof ctx.ellipse === 'function') {
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        return;
    }
    ctx.save();
    ctx.scale(radiusX, radiusY);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.lineWidth = lineWidth / Math.max(radiusX, radiusY, 1);
    ctx.stroke();
    ctx.restore();
}

function drawPortalBase(ctx, portal) {
    const { radiusX, radiusY, palette, config } = portal;
    const ratio = radiusY / radiusX;

    ctx.save();
    ctx.scale(1, ratio);

    if (typeof ctx.createRadialGradient === 'function') {
        const outerGradient = ctx.createRadialGradient(0, 0, radiusX * 0.25, 0, 0, radiusX * 1.45);
        outerGradient.addColorStop(0, palette.flare);
        outerGradient.addColorStop(0.45, palette.rim);
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGradient;
    } else {
        ctx.fillStyle = palette.rim;
    }
    ctx.globalAlpha = 0.75;
    drawEllipse(ctx, radiusX * 1.45, radiusX * 1.45);

    if (typeof ctx.createRadialGradient === 'function') {
        const innerGradient = ctx.createRadialGradient(0, 0, radiusX * 0.15, 0, 0, radiusX * 0.92);
        innerGradient.addColorStop(0, palette.flare);
        innerGradient.addColorStop(0.35, palette.core);
        innerGradient.addColorStop(1, palette.inner);
        ctx.fillStyle = innerGradient;
    } else {
        ctx.fillStyle = palette.core;
    }
    ctx.globalAlpha = 0.92;
    drawEllipse(ctx, radiusX * 0.92, radiusX * 0.92);

    ctx.restore();

    // Forward-facing flare / tail
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    const tailLength = config.tailLength;
    const tailWidth = config.tailWidth;
    if (typeof ctx.createLinearGradient === 'function') {
        const gradient = ctx.createLinearGradient(radiusX * 0.4, 0, radiusX * 0.4 + tailLength, 0);
        gradient.addColorStop(0, palette.tail);
        gradient.addColorStop(0.45, 'rgba(120, 210, 255, 0.45)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = palette.tail;
    }
    ctx.beginPath();
    ctx.moveTo(radiusX * 0.45, -tailWidth * 0.55);
    ctx.quadraticCurveTo(radiusX + tailLength * 0.25, -tailWidth * 0.4, radiusX + tailLength, -tailWidth * 0.08);
    ctx.lineTo(radiusX + tailLength, tailWidth * 0.08);
    ctx.quadraticCurveTo(radiusX + tailLength * 0.25, tailWidth * 0.4, radiusX * 0.45, tailWidth * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPortalWisps(ctx, portal) {
    const { radiusX, radiusY, idleWisps, palette } = portal;
    if (!Array.isArray(idleWisps) || idleWisps.length === 0) {
        return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    idleWisps.forEach(wisp => {
        const time = portal.time ?? 0;
        const progress = (time * wisp.speed + wisp.seed) % TAU;
        const wobble = Math.sin((time + wisp.seed) * 1.7) * 0.2;
        const rotation = wobble * wisp.polarity;
        const rx = wisp.radius;
        const ry = wisp.radius * (radiusY / radiusX) * wisp.verticalScale;
        const arcLength = wisp.arc * (0.6 + 0.4 * Math.sin(time * 1.1 + wisp.seed));
        const start = progress;
        const end = start + arcLength;
        ctx.save();
        ctx.rotate(rotation);
        ctx.lineWidth = Math.max(1.2, wisp.thickness * 2.4);
        const alpha = 0.18 + 0.18 * Math.sin(time * 2 + wisp.seed * 1.4);
        ctx.strokeStyle = `rgba(180, 240, 255, ${alpha})`;
        if (typeof ctx.ellipse === 'function') {
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, start, end);
            ctx.stroke();
        }
        ctx.restore();
    });
    ctx.restore();
}

function drawPortalPulses(ctx, portal) {
    const { pulses, radiusX, radiusY, config } = portal;
    if (!Array.isArray(pulses) || pulses.length === 0) {
        return;
    }

    pulses.forEach(pulse => {
        const progress = clamp01(pulse.age / pulse.duration);
        const eased = 1 - easeOutExpo(progress);
        const scale = 1 + (config.maxPulseScale - 1) * (1 - eased);
        const alpha = (0.55 + pulse.strength * 0.1) * (1 - progress);
        const thickness = Math.max(1.5, radiusX * config.rippleThickness * (1 - progress * 0.6));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = pulse.palette.rim;
        drawEllipseStroke(ctx, radiusX * scale, radiusY * scale, thickness);

        const bandY = clamp(pulse.offsetY, -radiusY * 0.85, radiusY * 0.85);
        ctx.globalAlpha = Math.max(0, 0.6 * (1 - progress));
        ctx.fillStyle = pulse.palette.flare;
        ctx.beginPath();
        ctx.moveTo(-radiusX * 0.3, bandY - radiusY * 0.12);
        ctx.quadraticCurveTo(radiusX * 0.75, bandY - radiusY * 0.06, radiusX * 1.3, bandY);
        ctx.quadraticCurveTo(radiusX * 0.75, bandY + radiusY * 0.06, -radiusX * 0.3, bandY + radiusY * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}

function drawPortalParticles(ctx, portal) {
    if (!Array.isArray(portal.particles) || portal.particles.length === 0) {
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    portal.particles.forEach(particle => {
        const progress = clamp01(particle.age / particle.life);
        const size = particle.size * (1 - progress * 0.5);
        const alpha = 0.8 * (1 - progress);
        if (alpha <= 0 || size <= 0) {
            return;
        }
        const outer = particle.palette.rim ?? 'rgba(200, 240, 255, 0.8)';
        const inner = particle.palette.flare ?? 'rgba(255, 255, 255, 1)';
        if (typeof ctx.createRadialGradient === 'function') {
            const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size);
            gradient.addColorStop(0, inner);
            gradient.addColorStop(1, outer);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = inner;
        }
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, TAU);
        ctx.fill();
    });
    ctx.restore();
}

export function drawPortal(ctx, portal) {
    if (!ctx || !portal) {
        return;
    }

    const hasCoreTransforms = typeof ctx.save === 'function'
        && typeof ctx.restore === 'function'
        && typeof ctx.translate === 'function'
        && typeof ctx.rotate === 'function'
        && typeof ctx.scale === 'function'
        && typeof ctx.beginPath === 'function';
    const hasArc = typeof ctx.arc === 'function';

    if (!hasCoreTransforms || !hasArc) {
        return;
    }

    ctx.save();
    ctx.translate(portal.position.x, portal.position.y);
    ctx.rotate(portal.rotation);
    drawPortalBase(ctx, portal);
    drawPortalWisps(ctx, portal);
    drawPortalPulses(ctx, portal);
    ctx.restore();

    drawPortalParticles(ctx, portal);
}
