export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function clamp01(value) {
    return clamp(value, 0, 1);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t) {
    if (t < 0.5) {
        return 2 * t * t;
    }
    return 1 - Math.pow(-2 * t + 2, 2) / 2;
}
