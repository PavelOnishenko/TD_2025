export function createFlyingEnergyParticle(x, y, amount, game) {
    const targetX = (game.logicalW || 540) / 2;
    const targetY = 40;
    const duration = game.gameConfig?.effects?.flyingEnergy?.duration ?? 1.5;

    const particle = {
        startX: x,
        startY: y,
        targetX,
        targetY,
        amount,
        elapsed: 0,
        duration,
    };

    console.log('[FlyingEnergy] Created particle:', particle);
    return particle;
}

export function updateFlyingEnergy(particles, dt) {
    if (!Array.isArray(particles) || particles.length === 0) {
        return;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.elapsed += dt;

        if (particle.elapsed >= particle.duration) {
            particles.splice(i, 1);
        }
    }
}

function easeInCubic(t) {
    return t * t * t;
}

export function drawFlyingEnergy(ctx, particles, game) {
    if (!Array.isArray(particles) || particles.length === 0) {
        return;
    }

    const fontSize = game?.gameConfig?.effects?.flyingEnergy?.fontSize ?? 32;

    particles.forEach(particle => {
        const progress = Math.min(1, particle.elapsed / particle.duration);
        const eased = easeInCubic(progress);

        const x = particle.startX + (particle.targetX - particle.startX) * eased;
        const y = particle.startY + (particle.targetY - particle.startY) * eased;

        const alpha = progress < 0.8 ? 1 : (1 - (progress - 0.8) / 0.2);

        ctx.save();

        // Draw glow effect similar to projectiles
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#facc15';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#facc15';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${fontSize}px "Baloo 2", sans-serif`;
        const text = `+${particle.amount}`;
        ctx.fillText(text, x, y);

        // Draw main text with stroke
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeText(text, x, y);

        ctx.fillStyle = '#facc15';
        ctx.fillText(text, x, y);

        ctx.restore();
    });
}
