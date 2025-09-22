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

export function drawTowerMuzzleFlash(ctx, tower) {
    if (!tower) return;
    const intensity = tower.flashDuration ? tower.flashTimer / tower.flashDuration : 0;
    if (intensity <= 0) return;
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

export function drawTowerTopGlow(ctx, tower) {
    if (!tower) return;
    const pulse = getTowerGlowPulse(tower);
    const { x, y } = getTowerEmitterPosition(tower);
    const profile = getTowerGlowProfile(tower, pulse);
    if (typeof ctx.createRadialGradient !== 'function') {
        return;
    }
    const gradient = ctx.createRadialGradient(
        x,
        y,
        profile.radius * profile.innerRadiusRatio,
        x,
        y,
        profile.radius,
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
