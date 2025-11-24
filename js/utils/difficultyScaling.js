import gameConfig from '../config/gameConfig.js';

function resolveMultiplier(source = gameConfig?.waves) {
    const multiplier = Number(source?.difficultyMultiplier ?? gameConfig?.waves?.difficultyMultiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
        throw new Error(`Invalid difficulty multiplier: ${multiplier}`);
    }
    return multiplier;
}

export function getDifficultyMultiplier(source) {
    return resolveMultiplier(source);
}

export function scaleDifficulty(baseDifficulty, source) {
    const difficulty = Number(baseDifficulty);
    if (!Number.isFinite(difficulty)) {
        throw new Error(`Invalid base difficulty: ${baseDifficulty}`);
    }
    const scaled = difficulty * resolveMultiplier(source);
    return Math.max(0, Math.round(scaled));
}

export default scaleDifficulty;
