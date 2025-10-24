function randomPhase() {
    return Math.random() * Math.PI * 2;
}

export function createProjectileVisualState() {
    return {
        time: 0,
        pulseOffset: randomPhase(),
        sparkleOffset: randomPhase(),
        jitterAngle: randomPhase(),
        pulseSpeed: 8 + Math.random() * 4,
        shimmerSpeed: 6 + Math.random() * 4,
        vibrationStrength: 0.35 + Math.random() * 0.15,
    };
}
