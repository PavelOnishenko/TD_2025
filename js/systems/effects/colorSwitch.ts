const COLOR_PRESETS = {
    red: {
        inner: 'rgba(255, 204, 204, 1)',
        mid: 'rgba(255, 96, 96, 0.6)',
        outer: 'rgba(255, 32, 32, 0)',
        ring: 'rgba(255, 240, 240, 0.85)',
        spark: 'rgba(255, 230, 230, 0.95)'
    },
    blue: {
        inner: 'rgba(204, 232, 255, 1)',
        mid: 'rgba(96, 160, 255, 0.55)',
        outer: 'rgba(48, 104, 255, 0)',
        ring: 'rgba(224, 244, 255, 0.85)',
        spark: 'rgba(196, 228, 255, 0.95)'
    },
    default: {
        inner: 'rgba(255, 238, 204, 1)',
        mid: 'rgba(255, 178, 96, 0.55)',
        outer: 'rgba(255, 128, 48, 0)',
        ring: 'rgba(255, 248, 236, 0.85)',
        spark: 'rgba(255, 240, 220, 0.9)'
    }
};

const SWITCH_DURATION = 0.5;
const SPARK_COUNT = 16;

function getPreset(color) {
    if (!color) {
        return COLOR_PRESETS.default;
    }
    return COLOR_PRESETS[color] ?? COLOR_PRESETS.default;
}

function createSpark(baseRadius) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseRadius * (1.8 + Math.random() * 1.6);
    return {
        angle,
        speed,
        spin: (Math.random() - 0.5) * 6,
        life: 0,
        lifeTime: 0.32 + Math.random() * 0.18,
        size: 1.6 + Math.random() * 1.8
    };
}

export function createColorSwitchBurstFromTower(tower, color) {
    const center = tower?.center?.();
    if (!center) {
        return null;
    }
    const baseRadius = Math.max(tower.w ?? 60, tower.h ?? 90) * 0.55;
    return {
        x: center.x,
        y: center.y,
        color,
        elapsed: 0,
        duration: SWITCH_DURATION,
        baseRadius,
        sparks: Array.from({ length: SPARK_COUNT }, () => createSpark(baseRadius)),
        pulseOffset: Math.random() * Math.PI * 2
    };
}

export function updateColorSwitchBursts(bursts, dt) {
    if (!Array.isArray(bursts)) {
        return;
    }
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const burst = bursts[i];
        if (!burst) {
            bursts.splice(i, 1);
            continue;
        }
        burst.elapsed += dt;
        burst.sparks.forEach(spark => {
            spark.life += dt;
            spark.angle += spark.spin * dt;
        });
        if (burst.elapsed >= burst.duration) {
            bursts.splice(i, 1);
        }
    }
}

function drawBurstCore(ctx, burst, preset) {
    const progress = Math.min(burst.elapsed / burst.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const baseRadius = burst.baseRadius;
    const radius = baseRadius * (0.7 + eased * 1.3);
    const innerRadius = baseRadius * 0.25;

    ctx.save();
    ctx.globalAlpha = 0.75 * (1 - progress);
    ctx.globalCompositeOperation = 'lighter';
    if (typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(
            burst.x,
            burst.y,
            innerRadius,
            burst.x,
            burst.y,
            radius
        );
        gradient.addColorStop(0, preset.inner);
        gradient.addColorStop(0.5, preset.mid);
        gradient.addColorStop(1, preset.outer);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = preset.mid;
    }
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const pulse = Math.sin(progress * Math.PI + burst.pulseOffset);
    const ringRadius = baseRadius * (1 + eased * 1.1 + pulse * 0.07);
    ctx.globalAlpha = 0.8 * (1 - progress);
    ctx.lineWidth = 2 + (1 - progress) * 3;
    ctx.strokeStyle = preset.ring;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawBurstSparks(ctx, burst, preset) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    burst.sparks.forEach(spark => {
        const lifeProgress = Math.min(spark.life / spark.lifeTime, 1);
        if (lifeProgress >= 1) {
            return;
        }
        const distance = burst.baseRadius * 0.4 + lifeProgress * burst.baseRadius * 1.8;
        const size = spark.size * (1 - lifeProgress * 0.9);
        const x = burst.x + Math.cos(spark.angle) * distance;
        const y = burst.y + Math.sin(spark.angle) * distance;
        ctx.globalAlpha = 0.9 * (1 - lifeProgress) * (0.6 + Math.random() * 0.2);
        ctx.fillStyle = preset.spark;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

export function drawColorSwitchBursts(ctx, bursts) {
    if (!ctx || !Array.isArray(bursts) || bursts.length === 0) {
        return;
    }
    bursts.forEach(burst => {
        if (!burst) {
            return;
        }
        const preset = getPreset(burst.color);
        drawBurstCore(ctx, burst, preset);
        drawBurstSparks(ctx, burst, preset);
    });
}
