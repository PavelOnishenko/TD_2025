const TAU = Math.PI * 2;

const PORTAL_PALETTES = {
    default: {
        inner: 'rgba(140, 255, 255, 1)',
        middle: 'rgba(64, 175, 255, 0.85)',
        outer: 'rgba(20, 55, 110, 0.55)',
        rim: 'rgba(196, 255, 255, 0.95)',
        spark: 'rgba(160, 255, 255, 1)',
        trail: 'rgba(86, 204, 255, 0.6)',
        swirl: 'rgba(130, 236, 255, 0.78)',
    },
    endless: {
        inner: 'rgba(236, 210, 255, 1)',
        middle: 'rgba(156, 110, 255, 0.9)',
        outer: 'rgba(62, 30, 120, 0.6)',
        rim: 'rgba(244, 219, 255, 0.95)',
        spark: 'rgba(255, 220, 255, 1)',
        trail: 'rgba(198, 150, 255, 0.58)',
        swirl: 'rgba(212, 178, 255, 0.8)',
    },
};

function computeSeed(...values) {
    let seed = 0x811c9dc5;
    for (const value of values) {
        const normalized = Number.isFinite(value) ? value : 0;
        const data = Math.floor(Math.abs(normalized) * 1000);
        seed ^= data + 0x9e3779b9 + (seed << 6) + (seed >>> 2);
        seed >>>= 0;
    }
    return seed >>> 0;
}

function createRng(seedInput) {
    let state = (seedInput >>> 0) || 1;
    return function next() {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return ((state >>> 0) & 0xffffffff) / 0x100000000;
    };
}

function portalRandom(portal) {
    if (!portal) {
        return Math.random();
    }
    if (typeof portal.random !== 'function') {
        const fallbackSeed = computeSeed(portal.x ?? 0, portal.y ?? 0, portal.lifeElapsed ?? 0);
        portal.random = createRng(fallbackSeed);
        portal.seed = fallbackSeed;
    }
    const value = portal.random();
    return value >= 0 ? value : value + 1;
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t) {
    const clamped = clamp(t, 0, 1);
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}

function easeOutQuad(t) {
    const clamped = clamp(t, 0, 1);
    return 1 - (1 - clamped) * (1 - clamped);
}

function selectPalette(theme) {
    if (!theme) {
        return PORTAL_PALETTES.default;
    }
    return PORTAL_PALETTES[theme] ?? PORTAL_PALETTES.default;
}

function createPortalImpulse(portal, strength = 1) {
    const normalized = clamp(strength, 0.2, 3);
    const baseRadius = portal.baseRadius ?? 100;
    const ripple = {
        elapsed: 0,
        duration: 0.55 + portalRandom(portal) * 0.35,
        radius: baseRadius * (0.55 + portalRandom(portal) * 0.2),
        width: Math.max(2.5, baseRadius * 0.045) * (0.6 + normalized * 0.35),
        strength: normalized,
    };
    if (!Array.isArray(portal.ripples)) {
        portal.ripples = [];
    }
    portal.ripples.push(ripple);
    if (portal.ripples.length > 12) {
        portal.ripples.splice(0, portal.ripples.length - 12);
    }
}

function createSpark(portal, energy = 1) {
    const baseRadius = portal.baseRadius ?? 100;
    const spark = {
        angle: portalRandom(portal) * TAU,
        startRadius: baseRadius * (0.28 + portalRandom(portal) * 0.32),
        speed: baseRadius * (0.9 + portalRandom(portal) * 0.8) * (0.7 + clamp(energy, 0.2, 4) * 0.45),
        elapsed: 0,
        duration: 0.42 + portalRandom(portal) * 0.32,
        size: 3.5 + portalRandom(portal) * 3.5,
        lineWidth: 1.4 + portalRandom(portal) * 1.2,
    };
    if (!Array.isArray(portal.sparks)) {
        portal.sparks = [];
    }
    portal.sparks.push(spark);
    if (portal.sparks.length > 24) {
        portal.sparks.splice(0, portal.sparks.length - 24);
    }
}

function createSparkBurst(portal, count = 3, intensity = 1) {
    const sparks = Math.max(1, Math.floor(count));
    for (let i = 0; i < sparks; i += 1) {
        createSpark(portal, intensity);
    }
}

function getPortalEnvelope(portal) {
    if (portal.isPersistent) {
        return 1;
    }
    const elapsed = portal.lifeElapsed ?? portal.elapsed ?? 0;
    const openDuration = Math.max(0.001, portal.openDuration ?? 0.3);
    const holdDuration = Math.max(0, portal.holdDuration ?? 0.5);
    const fadeDuration = Math.max(0.001, portal.fadeDuration ?? 0.6);

    if (elapsed <= openDuration) {
        return easeOutCubic(elapsed / openDuration);
    }
    if (elapsed <= openDuration + holdDuration) {
        return 1;
    }
    const fadeElapsed = elapsed - openDuration - holdDuration;
    if (fadeElapsed >= fadeDuration) {
        return 0;
    }
    return 1 - easeOutQuad(fadeElapsed / fadeDuration);
}

function updateRipples(portal, dt) {
    if (!Array.isArray(portal.ripples) || portal.ripples.length === 0) {
        return;
    }
    for (let i = portal.ripples.length - 1; i >= 0; i -= 1) {
        const ripple = portal.ripples[i];
        ripple.elapsed += dt;
        if (ripple.elapsed >= ripple.duration) {
            portal.ripples.splice(i, 1);
        }
    }
}

function updateSparks(portal, dt) {
    if (!Array.isArray(portal.sparks) || portal.sparks.length === 0) {
        return;
    }
    for (let i = portal.sparks.length - 1; i >= 0; i -= 1) {
        const spark = portal.sparks[i];
        spark.elapsed += dt;
        if (spark.elapsed >= spark.duration) {
            portal.sparks.splice(i, 1);
        }
    }
}

function drawPortalRipples(ctx, portal, envelope, palette, baseRadius) {
    if (!Array.isArray(portal.ripples) || portal.ripples.length === 0) {
        return;
    }
    const rimColor = palette.rim;
    portal.ripples.forEach(ripple => {
        const progress = clamp(ripple.elapsed / ripple.duration, 0, 1);
        const eased = easeOutCubic(progress);
        const radius = ripple.radius + baseRadius * 0.4 * eased;
        const alpha = envelope * ripple.strength * (1 - progress) * 0.9;
        if (alpha <= 0.01) {
            return;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = ripple.width * (0.85 + (1 - progress) * 0.35);
        ctx.strokeStyle = rimColor;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
        ctx.restore();
    });
}

function drawPortalSparks(ctx, portal, envelope, palette) {
    if (!Array.isArray(portal.sparks) || portal.sparks.length === 0) {
        return;
    }
    const trail = palette.trail;
    const sparkColor = palette.spark;
    const rotationInfluence = portal.rotation * 0.12;
    portal.sparks.forEach(spark => {
        const progress = clamp(spark.elapsed / spark.duration, 0, 1);
        const eased = easeOutCubic(progress);
        const distance = spark.startRadius + spark.speed * eased;
        const angle = spark.angle + rotationInfluence;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const tailLength = spark.size * 4.2 * (0.7 + (1 - progress) * 0.4);
        const tailX = x - Math.cos(angle) * tailLength;
        const tailY = y - Math.sin(angle) * tailLength;
        const visibility = envelope * (1 - progress) * (0.65 + (portal.energy ?? 0.4) * 0.25);
        if (visibility <= 0.01) {
            return;
        }
        ctx.save();
        ctx.globalAlpha = visibility;
        ctx.lineWidth = spark.lineWidth * (0.7 + (1 - progress) * 0.4);
        ctx.strokeStyle = trail;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, visibility * 1.35);
        ctx.fillStyle = sparkColor;
        ctx.beginPath();
        ctx.arc(x, y, spark.size * (0.5 + (1 - progress) * 0.35), 0, TAU);
        ctx.fill();
        ctx.restore();
    });
}

function drawPortalSwirls(ctx, portal, envelope, palette, baseRadius) {
    const swirlCount = Math.max(2, Math.floor(portal.swirlCount ?? 4));
    const strokeColor = palette.swirl;
    const energy = clamp(portal.energy ?? 0.6, 0, portal.maxEnergy ?? 3);
    const weight = (portal.swirlWidth ?? baseRadius * 0.14) * (0.5 + energy * 0.22);
    const opacity = envelope * (0.2 + energy * 0.2);
    if (opacity <= 0.01) {
        return;
    }
    for (let i = 0; i < swirlCount; i += 1) {
        const phase = portal.rotation + (TAU / swirlCount) * i;
        const length = baseRadius * (0.78 + energy * 0.18);
        const control = length * 0.42;
        const sway = Math.sin(portal.elapsed * 1.8 + phase * 0.5) * baseRadius * 0.12;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.lineWidth = weight * (0.65 + Math.sin(phase + portal.elapsed * 2.6) * 0.08);
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
            Math.cos(phase) * control,
            Math.sin(phase) * control + sway,
            Math.cos(phase) * length,
            Math.sin(phase) * length + sway * 0.35,
        );
        ctx.stroke();
        ctx.restore();
    }
}

function drawPortalCore(ctx, portal, palette, envelope) {
    const baseRadius = portal.baseRadius ?? 100;
    const energy = clamp(portal.energy ?? 0.5, 0, portal.maxEnergy ?? 3);
    const breathing = Math.sin((portal.elapsed ?? 0) * 2.4 + portal.seed) * 0.08;
    const ringRadius = baseRadius * (0.78 + energy * 0.12 + breathing * 0.35);
    const coreRadius = baseRadius * (0.62 + energy * 0.08 + breathing * 0.25);
    const haloRadius = baseRadius * (1.35 + energy * 0.12);
    const rimThickness = Math.max(2.8, baseRadius * 0.06) * (0.9 + energy * 0.35);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(0, 0, coreRadius * 0.35, 0, 0, haloRadius);
        gradient.addColorStop(0, palette.inner);
        gradient.addColorStop(0.55, palette.middle);
        gradient.addColorStop(1, palette.outer);
        ctx.globalAlpha = envelope * (0.42 + energy * 0.18);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, haloRadius, 0, TAU);
        ctx.fill();
    } else {
        ctx.globalAlpha = envelope * (0.3 + energy * 0.22);
        ctx.fillStyle = palette.middle;
        ctx.beginPath();
        ctx.arc(0, 0, haloRadius, 0, TAU);
        ctx.fill();
    }

    ctx.globalAlpha = envelope * (0.6 + energy * 0.25);
    ctx.fillStyle = palette.inner;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = envelope * (0.72 + Math.sin((portal.elapsed ?? 0) * 3.6 + portal.seed * 1.4) * 0.12);
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = rimThickness;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, TAU);
    ctx.stroke();

    ctx.restore();
}

function drawPortal(ctx, portal) {
    if (!ctx || !portal) {
        return;
    }
    if (
        typeof ctx.save !== 'function'
        || typeof ctx.restore !== 'function'
        || typeof ctx.translate !== 'function'
        || typeof ctx.scale !== 'function'
        || typeof ctx.beginPath !== 'function'
        || typeof ctx.arc !== 'function'
    ) {
        return;
    }
    const envelope = getPortalEnvelope(portal);
    if (envelope <= 0.001) {
        return;
    }
    const palette = selectPalette(portal.theme);
    const baseRadius = portal.baseRadius ?? 100;
    ctx.save();
    ctx.translate(portal.x ?? 0, portal.y ?? 0);
    const scale = clamp(portal.ellipseScale ?? 0.58, 0.2, 1.4);
    ctx.scale(1, scale);
    if (Number.isFinite(portal.skew) && portal.skew !== 0) {
        ctx.transform(1, 0, clamp(portal.skew, -0.8, 0.8), 1, 0, 0);
    }
    ctx.rotate((portal.rotation ?? 0) * 0.08);

    drawPortalCore(ctx, portal, palette, envelope);
    drawPortalRipples(ctx, portal, envelope, palette, baseRadius);
    drawPortalSwirls(ctx, portal, envelope, palette, baseRadius);
    drawPortalSparks(ctx, portal, envelope, palette);

    ctx.restore();
}

export function createSpawnPortalEffect(x, y, options = {}) {
    const posX = Number(x);
    const posY = Number(y);
    if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
        return null;
    }
    const persistent = options.persistent === true;
    const baseRadius = clamp(Number(options.radius) || 120, 20, 400);
    const randomSeed = computeSeed(posX, posY, options.seed ?? 0, persistent ? 11 : 3, options.theme === 'endless' ? 17 : 5);
    const rng = createRng(randomSeed || 1);
    const initialRotation = rng() * TAU;
    const rotationSpeed = (Number(options.rotationSpeed) || 0.45) * (0.75 + rng() * 0.5);
    const phaseSeed = rng() * TAU;
    const portal = {
        x: posX,
        y: posY,
        baseRadius,
        ellipseScale: options.ellipseScale ?? 0.58,
        skew: options.skew ?? -0.22,
        rotation: initialRotation,
        rotationSpeed,
        theme: typeof options.theme === 'string' ? options.theme : 'default',
        ripples: [],
        sparks: [],
        rippleTimer: 0.18,
        sparkTimer: 0.12,
        energy: Number.isFinite(options.energy) ? options.energy : (persistent ? 0.45 : 1.05),
        baseEnergy: Number.isFinite(options.baseEnergy) ? options.baseEnergy : (persistent ? 0.38 : 0.6),
        maxEnergy: Number.isFinite(options.maxEnergy) ? options.maxEnergy : 2.6,
        energyDamp: Number.isFinite(options.energyDamp) ? options.energyDamp : 3.2,
        swirlCount: options.swirlCount ?? 5,
        swirlWidth: options.swirlWidth,
        seed: phaseSeed,
        openDuration: Math.max(0.08, Number(options.openDuration) || 0.32),
        holdDuration: Math.max(0, Number(options.holdDuration) || (persistent ? 1.6 : 0.6)),
        fadeDuration: Math.max(0.2, Number(options.fadeDuration) || 0.65),
        lifeElapsed: 0,
        totalLifetime: persistent ? Infinity : null,
        isPersistent: persistent,
        loopDuration: persistent ? Math.max(2.5, Number(options.loopDuration) || 4.8) : null,
        maxHold: Math.max(0.4, Number(options.maxHold) || (persistent ? 1.6 : 1.25)),
    };
    portal.seed = randomSeed;
    portal.random = rng;
    portal.totalLifetime = portal.totalLifetime ?? (portal.openDuration + portal.holdDuration + portal.fadeDuration);
    createPortalImpulse(portal, persistent ? 0.6 : 1.1);
    createSparkBurst(portal, persistent ? 2 : 4, portal.energy);
    return portal;
}

export function energizeSpawnPortal(portal, options = {}) {
    if (!portal) {
        return null;
    }
    if (Number.isFinite(options.seed)) {
        const newSeed = computeSeed(portal.seed ?? 0, options.seed, portal.lifeElapsed ?? 0, portal.energy ?? 0);
        portal.seed = newSeed;
        portal.random = createRng(newSeed || 1);
    }
    const intensity = clamp(Number(options.intensity) || 1, 0.1, 4);
    portal.energy = Math.min(portal.maxEnergy ?? 2.6, (portal.energy ?? 0) + intensity * 0.7);
    if (!portal.isPersistent) {
        const additionalHold = clamp(Number(options.extraHold) || 0.3, 0, 2.5);
        const currentHold = portal.holdDuration ?? 0;
        const maxHold = portal.maxHold ?? (currentHold + 1);
        portal.holdDuration = Math.min(maxHold, currentHold + additionalHold);
        portal.totalLifetime = portal.openDuration + portal.holdDuration + portal.fadeDuration;
        portal.lifeElapsed = Math.min(portal.lifeElapsed ?? 0, portal.openDuration);
    }
    const sparks = Number.isFinite(options.sparkCount) ? options.sparkCount : (2 + intensity * 3);
    createPortalImpulse(portal, 0.8 + intensity * 0.6);
    createSparkBurst(portal, sparks, intensity);
    portal.rippleTimer = Math.min(portal.rippleTimer ?? 0.12, 0.08);
    portal.sparkTimer = Math.min(portal.sparkTimer ?? 0.12, 0.05);
    return portal;
}

export function updateSpawnPortals(portals, dt) {
    if (!Array.isArray(portals) || portals.length === 0) {
        return;
    }
    const delta = Math.max(0, Number(dt) || 0);
    for (let i = portals.length - 1; i >= 0; i -= 1) {
        const portal = portals[i];
        portal.elapsed = (portal.elapsed ?? 0) + delta;
        portal.lifeElapsed = (portal.lifeElapsed ?? 0) + delta;
        portal.rotation += (portal.rotationSpeed ?? 0.4) * delta;
        const baseEnergy = portal.baseEnergy ?? 0.5;
        const damp = Math.max(0.5, portal.energyDamp ?? 3);
        portal.energy += (baseEnergy - portal.energy) * Math.min(1, delta * damp);
        portal.energy = clamp(portal.energy, 0, portal.maxEnergy ?? 3);

        if (portal.isPersistent && Number.isFinite(portal.loopDuration) && portal.loopDuration > 0) {
            while (portal.elapsed >= portal.loopDuration) {
                portal.elapsed -= portal.loopDuration;
                createPortalImpulse(portal, 0.45 + portalRandom(portal) * 0.25);
            }
        }

        portal.rippleTimer -= delta;
        const activeEnergy = portal.energy > baseEnergy * 1.05;
        if (portal.rippleTimer <= 0) {
            if (portal.isPersistent || activeEnergy) {
                const strength = portal.isPersistent
                    ? 0.42 + portal.energy * 0.25
                    : 0.65 + (portal.energy - baseEnergy) * 0.5;
                createPortalImpulse(portal, strength);
            }
            const cadenceBase = portal.isPersistent ? 0.55 : 0.24;
            const cadenceVariance = portal.isPersistent ? 0.35 : 0.18;
            portal.rippleTimer = cadenceBase + portalRandom(portal) * cadenceVariance;
        }

        portal.sparkTimer -= delta;
        if (portal.sparkTimer <= 0 && (portal.isPersistent || activeEnergy)) {
            const cadence = portal.isPersistent ? 0.22 : 0.12;
            createSpark(portal, portal.energy);
            portal.sparkTimer = cadence + portalRandom(portal) * cadence * 0.6;
        }

        updateRipples(portal, delta);
        updateSparks(portal, delta);

        if (!portal.isPersistent && portal.lifeElapsed >= portal.totalLifetime && portal.ripples.length === 0 && portal.sparks.length === 0) {
            portals.splice(i, 1);
        }
    }
}

export function drawSpawnPortals(ctx, portals) {
    if (!ctx || !Array.isArray(portals) || portals.length === 0) {
        return;
    }
    portals.forEach(portal => drawPortal(ctx, portal));
}

