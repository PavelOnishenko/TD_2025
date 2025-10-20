import { drawExplosions } from '../systems/effects.js';

const ENERGY_PALETTES = {
    red: {
        core: '#fff4f6',
        mid: '#ff6d6d',
        outer: '#ff2f45',
        sparkle: '#ffd1dc',
    },
    blue: {
        core: '#ecfbff',
        mid: '#4cb9ff',
        outer: '#2e63ff',
        sparkle: '#bde4ff',
    },
    green: {
        core: '#f2fff0',
        mid: '#63ff9a',
        outer: '#00c95a',
        sparkle: '#cbffd8',
    },
    purple: {
        core: '#f9f1ff',
        mid: '#c76bff',
        outer: '#7f3dff',
        sparkle: '#efd4ff',
    },
    default: {
        core: '#fff9f0',
        mid: '#ffb347',
        outer: '#ff7a18',
        sparkle: '#ffe0b2',
    },
};

const MERGE_PALETTES = {
    red: {
        trail: [255, 168, 136],
        glow: [255, 230, 214],
    },
    blue: {
        trail: [150, 205, 255],
        glow: [205, 235, 255],
    },
    default: {
        trail: [255, 210, 190],
        glow: [255, 240, 226],
    },
};
function getScreenShakeOffset(game) {
    const shake = game?.screenShake;
    if (!shake || shake.duration <= 0 || shake.intensity <= 0) {
        return { x: 0, y: 0 };
    }

    const time = shake.elapsed ?? 0;
    const progress = Math.min(1, shake.duration > 0 ? time / shake.duration : 1);
    const falloff = Math.pow(1 - progress, 2);
    const baseIntensity = shake.intensity * falloff;
    if (baseIntensity <= 0.01) {
        return { x: 0, y: 0 };
    }

    const frequency = shake.frequency ?? 42;
    const phaseX = (time * frequency) + (shake.seedX ?? 0);
    const phaseY = (time * (frequency * 0.82)) + (shake.seedY ?? 0);
    const offsetX = Math.sin(phaseX) * baseIntensity;
    const offsetY = Math.cos(phaseY) * baseIntensity;
    return { x: offsetX, y: offsetY };
}

function getEnergyPalette(color) {
    if (!color) return ENERGY_PALETTES.default;
    return ENERGY_PALETTES[color] ?? ENERGY_PALETTES.default;
}

function getMergePalette(color) {
    if (!color) return MERGE_PALETTES.default;
    return MERGE_PALETTES[color] ?? MERGE_PALETTES.default;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
    return clamp(value, 0, 1);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function easeInOutCubic(t) {
    const clamped = clamp01(t);
    if (clamped < 0.5) {
        return 4 * clamped * clamped * clamped;
    }
    const normalized = -2 * clamped + 2;
    return 1 - (normalized * normalized * normalized) / 2;
}

function easeOutCubic(t) {
    const clamped = clamp01(t);
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}

function toMergeColor(rgb, alpha) {
    const safeAlpha = clamp01(alpha);
    const [r, g, b] = rgb ?? [255, 255, 255];
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function getProjectileAnimationState(projectile) {
    const anim = projectile?.anim && typeof projectile.anim === 'object' ? projectile.anim : {};
    return {
        time: anim.time ?? 0,
        pulseOffset: anim.pulseOffset ?? 0,
        sparkleOffset: anim.sparkleOffset ?? 0,
        jitterAngle: anim.jitterAngle ?? 0,
        pulseSpeed: anim.pulseSpeed ?? 9,
        shimmerSpeed: anim.shimmerSpeed ?? 7,
        vibrationStrength: anim.vibrationStrength ?? 0,
    };
}

function traceEllipse(ctx, cx, cy, rx, ry) {
    if (!ctx) return;
    if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        return;
    }

    const canTransform = typeof ctx.save === 'function'
        && typeof ctx.restore === 'function'
        && typeof ctx.translate === 'function'
        && typeof ctx.scale === 'function';

    if (canTransform) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(rx, ry);
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.restore();
        return;
    }

    const radius = Math.max(rx, ry);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
}

export function draw(game) {
    const ctx = game.ctx;
    const { scale = 1, offsetX = 0, offsetY = 0 } = game.viewport ?? {};
    const shakeOffset = getScreenShakeOffset(game);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX + shakeOffset.x, offsetY + shakeOffset.y);

    drawBase(game);
    drawPlatforms(game);
    drawGrid(game);
    drawEntities(game);

    ctx.restore();
}

function drawBase(game) {
    const ctx = game.ctx;
    ctx.fillStyle = 'green';
    ctx.fillRect(game.base.x, game.base.y, game.base.w, game.base.h);
}

function drawPlatforms(game) {
    const { platforms = [], assets } = game;
    const platformImage = assets?.platform;

    if (!platformImage || platforms.length === 0) {
        return;
    }

    platforms.forEach(platform => {
        platform.draw(game.ctx, platformImage);
    });
}

function drawGrid(game) {
    const ctx = game.ctx;
    const grid = game.getAllCells();
    const cellImage = game.assets?.cell;
    const isPreparationPhase = !game.waveInProgress;
    const elapsed = game.elapsedTime ?? 0;
    grid.forEach(cell => {
        const centerX = cell.x + cell.w / 2;
        const centerY = cell.y + cell.h / 2;
        let pulseIntensity = 0;

        if (!cell.occupied && cellImage) {
            ctx.drawImage(cellImage, cell.x, cell.y, cell.w, cell.h);
        }

        if (isPreparationPhase && !cell.occupied) {
            const offset = (cell.x + cell.y) * 0.008;
            const pulse = Math.sin(elapsed * 2.8 + offset);
            pulseIntensity = (pulse + 1) / 2;

            const easedPulse = Math.pow(pulseIntensity, 0.7);
            const baseRadius = Math.min(cell.w, cell.h) / 2;
            const innerRadius = baseRadius * 0.4;
            const glowRadius = baseRadius * (0.9 + easedPulse * 0.12);
            const glowOpacity = 0.12 + easedPulse * 0.22;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = glowOpacity;

            if (typeof ctx.createRadialGradient === 'function') {
                const gradient = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    innerRadius,
                    centerX,
                    centerY,
                    glowRadius
                );
                gradient.addColorStop(0, 'rgba(150, 245, 255, 0.98)');
                gradient.addColorStop(0.55, 'rgba(128, 234, 255, 0.6)');
                gradient.addColorStop(1, 'rgba(128, 234, 255, 0)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = 'rgba(128, 234, 255, 0.45)';
            }

            ctx.fillRect(
                centerX - glowRadius,
                centerY - glowRadius,
                glowRadius * 2,
                glowRadius * 2
            );
            ctx.restore();
        }

        if (cell.highlight > 0) {
            const alpha = Math.min(1, cell.highlight * 3);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'red';
            ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
            ctx.restore();
        }

        if (cell.mergeHint > 0 && cell.occupied) {
            const pulse = Math.sin(elapsed * 4 + (cell.x + cell.y) * 0.01);
            const normalized = (pulse + 1) / 2;
            const alpha = 0.35 + normalized * 0.35;
            const thickness = 3 + normalized * 2;
            const color = cell.tower?.color === 'blue'
                ? `rgba(130, 180, 255, ${alpha})`
                : `rgba(255, 180, 120, ${alpha})`;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = thickness;
            ctx.strokeStyle = color;
            ctx.strokeRect(cell.x + thickness, cell.y + thickness, cell.w - thickness * 2, cell.h - thickness * 2);
            ctx.restore();
        }
    });

    if (Array.isArray(game.mergeHintPairs) && game.mergeHintPairs.length > 0) {
        const pairPulse = (Math.sin(elapsed * 4.2) + 1) / 2;
        game.mergeHintPairs.forEach(({ cellA, cellB, color }) => {
            const startX = cellA.x + cellA.w / 2;
            const startY = cellA.y + cellA.h / 2;
            const endX = cellB.x + cellB.w / 2;
            const endY = cellB.y + cellB.h / 2;
            const hue = color === 'blue'
                ? `rgba(130, 180, 255, ${0.35 + pairPulse * 0.45})`
                : `rgba(255, 180, 120, ${0.35 + pairPulse * 0.45})`;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 4 + pairPulse * 3;
            ctx.strokeStyle = hue;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
        });
    }
}

export function drawEntities(game) {
    const ctx = game.ctx;
    const assets = game.assets;

    const layeredEntities = [];

    for (const tower of game.towers) {
        layeredEntities.push({
            sortKey: computeSortKey(tower),
            draw: () => tower.draw(ctx, assets),
        });
    }

    for (const enemy of game.enemies) {
        layeredEntities.push({
            sortKey: computeSortKey(enemy),
            draw: () => enemy.draw(ctx, assets),
        });
    }

    layeredEntities
        .sort((a, b) => a.sortKey - b.sortKey)
        .forEach(layer => layer.draw());

    drawMergeAnimations(ctx, game.mergeAnimations ?? [], assets);

    const defaultRadius = game.projectileRadius ?? 6;
    game.projectiles.forEach(p => {
        const palette = getEnergyPalette(p.color);
        const anim = getProjectileAnimationState(p);
        const radius = p.radius ?? defaultRadius;
        const pulse = Math.sin(anim.time * anim.pulseSpeed + anim.pulseOffset);
        const shimmer = Math.sin(anim.time * anim.shimmerSpeed + anim.sparkleOffset);
        const vibration = radius * anim.vibrationStrength * Math.sin(anim.time * (anim.pulseSpeed * 1.4) + anim.pulseOffset);
        const jitterX = Math.cos(anim.jitterAngle) * vibration;
        const jitterY = Math.sin(anim.jitterAngle) * vibration;
        const centerX = p.x + jitterX;
        const centerY = p.y + jitterY;

        const outerRadius = radius * (1.8 + 0.35 * pulse);
        const midRadius = radius * (1.1 + 0.18 * Math.sin(anim.time * (anim.pulseSpeed * 0.6) + anim.pulseOffset + Math.PI / 4));
        const coreRadius = radius * (0.55 + 0.1 * Math.sin(anim.time * (anim.shimmerSpeed * 1.3) + anim.sparkleOffset));
        const sparkleRadius = radius * (0.28 + 0.05 * Math.sin(anim.time * (anim.shimmerSpeed * 1.8) + anim.sparkleOffset * 0.5));
        const sparkleOrbit = radius * (0.8 + 0.1 * shimmer);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        ctx.globalAlpha = 0.45 + 0.25 * pulse;
        ctx.fillStyle = palette.outer;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = palette.mid;
        ctx.beginPath();
        ctx.arc(centerX, centerY, midRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = palette.core;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 2; i++) {
            const sparklePhase = anim.sparkleOffset + anim.time * anim.shimmerSpeed + i * Math.PI;
            const sparkleX = centerX + Math.cos(sparklePhase) * sparkleOrbit;
            const sparkleY = centerY + Math.sin(sparklePhase) * sparkleOrbit;
            ctx.globalAlpha = 0.8 + 0.15 * Math.sin(sparklePhase * 2);
            ctx.fillStyle = palette.sparkle;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, sparkleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    drawExplosions(ctx, game.explosions ?? []);
}

function computeSortKey(entity) {
    const y = typeof entity.y === 'number' ? entity.y : 0;
    const height = typeof entity.h === 'number' ? entity.h : 0;
    return y + height;
}

function drawMergeAnimations(ctx, animations, assets) {
    if (!Array.isArray(animations) || animations.length === 0) {
        return;
    }

    animations.forEach(animation => {
        const progress = animation.duration ? clamp01(animation.elapsed / animation.duration) : 1;
        drawMergeTrail(ctx, animation, progress);
        drawMergeTraveler(ctx, animation, progress, assets);
        drawMergeTargetGlow(ctx, animation, progress);
    });
}

function drawMergeTrail(ctx, animation, progress) {
    const start = animation.startCenter;
    const end = animation.endCenter;
    if (!start || !end) {
        return;
    }

    const palette = getMergePalette(animation.color);
    const outerAlpha = 0.55 * (1 - progress * 0.9);
    const innerAlpha = 0.85 * (1 - progress * 0.95);
    const width = (animation.trailWidth ?? 30) * (1 - progress * 0.8);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    ctx.strokeStyle = toMergeColor(palette.trail, outerAlpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${innerAlpha})`;
    ctx.lineWidth = width * 0.45;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const orbProgress = easeInOutCubic(progress);
    const orbX = lerp(start.x, end.x, orbProgress);
    const orbY = lerp(start.y, end.y, orbProgress);
    const orbRadius = (animation.orbRadius ?? width * 0.6) * (1 - progress * 0.4);
    const orbAlpha = 0.8 * (1 - progress * 0.6);

    ctx.fillStyle = toMergeColor(palette.glow, orbAlpha);
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, orbAlpha + 0.2)})`;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawMergeTraveler(ctx, animation, progress, assets) {
    const sprite = assets?.[animation.spriteKey];
    if (!sprite) {
        return;
    }

    const start = animation.start;
    const end = animation.end;
    if (!start || !end) {
        return;
    }

    const baseWidth = animation.width ?? sprite.width;
    const baseHeight = animation.height ?? sprite.height;
    if (!baseWidth || !baseHeight) {
        return;
    }

    const eased = easeInOutCubic(progress);
    const posX = lerp(start.x, end.x, eased);
    const posY = lerp(start.y, end.y, eased);
    const scale = 1 + 0.12 * (1 - progress);
    const width = baseWidth * scale;
    const height = baseHeight * scale;
    const drawX = posX + (baseWidth - width) / 2;
    const drawY = posY + (baseHeight - height) / 2;
    const alpha = clamp01(easeOutCubic(1 - progress));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, drawX, drawY, width, height);
    ctx.restore();
}

function drawMergeTargetGlow(ctx, animation, progress) {
    const targetTower = animation.targetTower;
    if (!targetTower || typeof targetTower.center !== 'function') {
        return;
    }

    const center = targetTower.center();
    const palette = getMergePalette(animation.color);
    const radiusBase = Math.max(targetTower.w ?? 0, targetTower.h ?? 0) * 0.42;
    const glowStrength = easeOutCubic(1 - progress);
    const radius = radiusBase * (1 + 0.3 * glowStrength);
    const alpha = 0.5 * glowStrength;
    const yOffset = (targetTower.h ?? 0) * 0.25;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 5 * (0.65 + 0.35 * glowStrength);
    ctx.strokeStyle = toMergeColor(palette.glow, alpha);
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, radius, 0, Math.PI * 2);
    ctx.stroke();

    const coreStrength = clamp01(glowStrength * 1.1);
    ctx.globalAlpha = 0.7 * coreStrength;
    ctx.fillStyle = `rgba(255,255,255,${0.45 * coreStrength})`;
    ctx.beginPath();
    ctx.arc(center.x, center.y - yOffset, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
