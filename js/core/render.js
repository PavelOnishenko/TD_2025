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

function getEnergyPalette(color) {
    if (!color) return ENERGY_PALETTES.default;
    return ENERGY_PALETTES[color] ?? ENERGY_PALETTES.default;
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

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

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
    });
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
