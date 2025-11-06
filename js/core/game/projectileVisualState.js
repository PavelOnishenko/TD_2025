function randomPhase() {
    return Math.random() * Math.PI * 2;
}

export function createProjectileVisualState(options = {}) {
    const {
        pulseOffset = randomPhase(),
        sparkleOffset = randomPhase(),
        jitterAngle = randomPhase(),
        pulseSpeed = 8 + Math.random() * 4,
        shimmerSpeed = 6 + Math.random() * 4,
        vibrationStrength = 0.35 + Math.random() * 0.15,
    } = options ?? {};

    return {
        time: 0,
        pulseOffset,
        sparkleOffset,
        jitterAngle,
        pulseSpeed,
        shimmerSpeed,
        vibrationStrength,
    };
}
