import gameConfig from '../config/gameConfig.js';

function resolveMultiplier(source = gameConfig?.waves) {
    const raw = source?.difficultyMultiplier ?? gameConfig?.waves?.difficultyMultiplier;
    const multiplier = Number(raw);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
        return 1;
    }
    return multiplier;
}

export function getDifficultyMultiplier(source) {
    return resolveMultiplier(source);
}

export function scaleDifficulty(baseDifficulty, source) {
    const difficulty = Number(baseDifficulty);
    if (!Number.isFinite(difficulty)) {
        return baseDifficulty;
    }
    const multiplier = resolveMultiplier(source);
    const scaled = difficulty * multiplier;
    return Math.max(0, Math.round(scaled));
}

export default scaleDifficulty;
