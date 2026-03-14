import gameConfig from '../config/gameConfig.js';

interface GameConfigShape {
    waves?: { difficultyMultiplier?: number };
}

const typedGameConfig = gameConfig as unknown as GameConfigShape;

interface DifficultySource {
    difficultyMultiplier?: number;
}

interface WaveConfig {
    difficultyMultiplier?: number;
}

function resolveMultiplier(source: DifficultySource | WaveConfig | undefined = typedGameConfig?.waves): number {
    const raw = source?.difficultyMultiplier ?? typedGameConfig?.waves?.difficultyMultiplier;
    const multiplier = Number(raw);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
        return 1;
    }
    return multiplier;
}

export function getDifficultyMultiplier(source?: DifficultySource | WaveConfig): number {
    return resolveMultiplier(source);
}

export function scaleDifficulty(baseDifficulty: number, source?: DifficultySource | WaveConfig): number {
    const difficulty = Number(baseDifficulty);
    if (!Number.isFinite(difficulty)) {
        return baseDifficulty;
    }
    const multiplier = resolveMultiplier(source);
    const scaled = difficulty * multiplier;
    return Math.max(0, Math.round(scaled));
}

export default scaleDifficulty;
