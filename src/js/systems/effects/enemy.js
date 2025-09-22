function shouldRenderGlow(enemy, ctx) {
    return (
        enemy &&
        typeof enemy.canRenderGlow === 'function' &&
        enemy.canRenderGlow(ctx)
    );
}

function resolveGlowPalette(enemy) {
    if (typeof enemy.getGlowPalette === 'function') {
        return enemy.getGlowPalette();
    }
    return null;
}

function computeGlowState(enemy) {
    const anchorX = enemy.x + enemy.engineFlame.anchor.x + enemy.engineFlame.offset.x;
    const anchorY = enemy.y + enemy.engineFlame.anchor.y + enemy.engineFlame.offset.y;
    const timeSource = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const flicker = 0.75 + Math.sin(timeSource / 180 + enemy.glowPhase) * 0.25;
    const stretch = 1.15 + Math.sin(timeSource / 260 + enemy.glowPhase * 0.6) * 0.2;
    return { anchorX, anchorY, flicker, stretch };
}

function drawGlowHalo(ctx, enemy, palette, flicker, stretch) {
    ctx.save();
    ctx.scale(1, 1.25 * stretch);
    ctx.globalAlpha = 0.55;
    const haloRadius = enemy.w * (0.38 + 0.07 * flicker);
    const haloGradient = ctx.createRadialGradient(0, 0, haloRadius * 0.1, 0, 0, haloRadius);
    haloGradient.addColorStop(0, palette.core);
    haloGradient.addColorStop(0.4, palette.mid);
    haloGradient.addColorStop(1, palette.halo);
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGlowFlame(ctx, enemy, palette, flicker, stretch) {
    ctx.save();
    ctx.translate(0, -enemy.h * 0.05);
    ctx.scale(1, stretch * 1.5);
    ctx.globalAlpha = 0.7;
    const flameHeight = enemy.h * (0.9 + 0.1 * flicker);
    const flameGradient = ctx.createLinearGradient(0, 0, 0, -flameHeight);
    flameGradient.addColorStop(0, palette.core);
    flameGradient.addColorStop(0.25, palette.flare);
    flameGradient.addColorStop(1, palette.trail);
    ctx.fillStyle = flameGradient;
    const flameWidth = enemy.w * (0.22 + 0.08 * flicker);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(flameWidth, -flameHeight * 0.35, 0, -flameHeight);
    ctx.quadraticCurveTo(-flameWidth, -flameHeight * 0.35, 0, 0);
    ctx.fill();
    ctx.restore();
}

function drawGlowSpark(ctx, enemy, palette, flicker) {
    ctx.save();
    ctx.translate(0, -enemy.h * 0.1);
    ctx.scale(1, 1 + 0.3 * flicker);
    ctx.globalAlpha = 0.9;
    const sparkRadius = enemy.w * (0.16 + 0.05 * flicker);
    const sparkGradient = ctx.createRadialGradient(0, 0, sparkRadius * 0.25, 0, 0, sparkRadius);
    sparkGradient.addColorStop(0, palette.spark);
    sparkGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sparkGradient;
    ctx.beginPath();
    ctx.arc(0, 0, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export function drawEnemyEngineGlow(ctx, enemy) {
    if (!shouldRenderGlow(enemy, ctx)) return;
    const palette = resolveGlowPalette(enemy);
    if (!palette) return;
    const { anchorX, anchorY, flicker, stretch } = computeGlowState(enemy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(enemy.engineFlame.angle);
    drawGlowHalo(ctx, enemy, palette, flicker, stretch);
    drawGlowFlame(ctx, enemy, palette, flicker, stretch);
    drawGlowSpark(ctx, enemy, palette, flicker);
    ctx.restore();
    ctx.restore();
}
