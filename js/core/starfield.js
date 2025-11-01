const DEFAULTS = {
    density: 0.00045,
    minSize: 0.6,
    maxSize: 1.8,
    minAlpha: 0.35,
    maxAlpha: 0.9,
};

function clamp01(value) {
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

function randomBetween(min, max) {
    return min + (max - min) * Math.random();
}

function createStar(width, height) {
    const depth = Math.random();
    const highlight = Math.random() < 0.22;
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        baseSize: randomBetween(DEFAULTS.minSize, DEFAULTS.maxSize) * (0.6 + depth * 0.8),
        sizeJitter: randomBetween(0.1, 0.45),
        baseAlpha: randomBetween(DEFAULTS.minAlpha, DEFAULTS.maxAlpha) * (0.7 + depth * 0.3),
        twinkleSpeed: randomBetween(0.5, 1.8),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleAmplitude: randomBetween(0.18, 0.42),
        glitterSpeed: randomBetween(0.35, 1.1),
        glitterPhase: Math.random() * Math.PI * 2,
        highlight,
        color: highlight ? '#f4f8ff' : '#e8f0ff',
        sparkleColor: highlight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(220, 232, 255, 0.65)',
        alpha: 1,
        size: 1,
    };
}

export function createStarfield(width, height, options = {}) {
    const config = { ...DEFAULTS, ...options };
    const area = Math.max(1, width * height);
    const starsCount = Math.round(area * config.density);
    const safeCount = Math.max(40, Math.min(320, starsCount));
    const stars = Array.from({ length: safeCount }, () => createStar(width, height));
    return { width, height, stars, time: 0 };
}

export function updateStarfield(starfield, dt = 0) {
    if (!starfield || !Array.isArray(starfield.stars)) {
        return;
    }
    const time = (starfield.time ?? 0) + dt;
    starfield.time = time;
    for (const star of starfield.stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const glitter = (Math.sin(time * star.glitterSpeed + star.glitterPhase) + 1) * 0.5;
        const amplitude = star.twinkleAmplitude * (0.6 + glitter * 0.8);
        star.alpha = clamp01(star.baseAlpha + amplitude * twinkle);
        star.size = Math.max(0.2, star.baseSize + star.sizeJitter * (glitter - 0.5));
    }
}

function fillBackground(ctx, width, height) {
    if (typeof ctx.createLinearGradient === 'function') {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#040713');
        gradient.addColorStop(0.4, '#050b1a');
        gradient.addColorStop(1, '#020308');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = '#040713';
    }
    ctx.fillRect(0, 0, width, height);
}

function renderStar(ctx, star) {
    const alpha = clamp01(star.alpha ?? star.baseAlpha ?? 0);
    if (alpha <= 0.01) {
        return;
    }
    const radius = Math.max(0.2, star.size ?? star.baseSize ?? 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color ?? '#e8f0ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.55;
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    if (!star.highlight) {
        ctx.globalAlpha = 1;
        return;
    }

    if (typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function' || typeof ctx.stroke !== 'function') {
        ctx.globalAlpha = 1;
        return;
    }

    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = star.sparkleColor ?? 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(0.35, radius * 0.55);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const cross = radius * 2.4;
    ctx.moveTo(star.x - cross, star.y);
    ctx.lineTo(star.x + cross, star.y);
    ctx.moveTo(star.x, star.y - cross);
    ctx.lineTo(star.x, star.y + cross);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

export function drawStarfield(game) {
    const ctx = game?.ctx;
    if (!ctx) {
        return;
    }
    const width = game?.logicalW ?? ctx.canvas.width;
    const height = game?.logicalH ?? ctx.canvas.height;
    ctx.save();
    fillBackground(ctx, width, height);
    const stars = game?.starfield?.stars;
    if (Array.isArray(stars) && stars.length > 0) {
        for (const star of stars) {
            renderStar(ctx, star);
        }
    }
    ctx.restore();
}
