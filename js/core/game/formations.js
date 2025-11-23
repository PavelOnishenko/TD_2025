import { scaleDifficulty } from '../../utils/difficultyScaling.js';

const DEFAULTS = {
    formationGap: 0.75,
    minimumWeight: 0,
};

let formationIdCounter = 0;

function sanitizeId(label = '') {
    const trimmed = String(label ?? '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    if (!trimmed) {
        formationIdCounter += 1;
        return `formation-${formationIdCounter}`;
    }
    return trimmed;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function createProbabilityFunction(expression, defaults) {
    const { minimumWeight = 0 } = defaults ?? {};
    if (!expression || typeof expression !== 'string') {
        return () => 1;
    }
    let compiled;
    try {
        // wave and formation are available for expressions
        compiled = new Function('wave', 'formation', `return (${expression});`);
    } catch (error) {
        return () => minimumWeight;
    }
    return (wave, formation) => {
        try {
            const value = Number(compiled(wave, formation));
            if (!Number.isFinite(value)) {
                return minimumWeight;
            }
            if (value <= 0) {
                return minimumWeight;
            }
            return value;
        } catch (error) {
            return minimumWeight;
        }
    };
}

function parseHeader(line) {
    const content = line.replace(/^#\s*/, '').trim();
    const segments = content
        .split('|')
        .map(segment => segment.trim())
        .filter(Boolean);
    const [first, ...rest] = segments;
    const header = {
        id: sanitizeId(first ?? ''),
        label: first ?? '',
        difficulty: NaN,
        probability: '',
        gap: undefined,
        minWave: undefined,
    };
    for (const segment of rest) {
        const [rawKey, ...rawValueParts] = segment.split('=');
        if (!rawKey) {
            continue;
        }
        const key = rawKey.trim().toLowerCase();
        const value = rawValueParts.join('=').trim();
        if (key === 'difficulty') {
            header.difficulty = toNumber(value, NaN);
        } else if (key === 'probability') {
            header.probability = value;
        } else if (key === 'gap') {
            header.gap = toNumber(value, undefined);
        } else if (key === 'minwave') {
            header.minWave = toNumber(value, undefined);
        }
    }
    return header;
}

function parseShipLine(line) {
    const sanitized = line.replace(/\s+#.*$/, '').trim();
    if (!sanitized) {
        return null;
    }
    const tokens = sanitized.split(/\s+/);
    if (!tokens.length) {
        return null;
    }
    const [typeToken, ...restTokens] = tokens;
    const descriptor = {
        type: (typeToken ?? '').toLowerCase(),
        time: 0,
        y: undefined,
        x: undefined,
        color: undefined,
        groupSize: undefined,
        spacing: undefined,
        offsets: undefined,
    };
    const offsets = [];
    for (const token of restTokens) {
        if (!token) {
            continue;
        }
        if (token.startsWith('@')) {
            descriptor.time = toNumber(token.slice(1), descriptor.time);
            continue;
        }
        const [rawKey, rawValue] = token.split('=');
        if (!rawKey) {
            continue;
        }
        const key = rawKey.trim().toLowerCase();
        const value = rawValue?.trim();
        if (key === 'y') {
            descriptor.y = toNumber(value, descriptor.y);
        } else if (key === 'x') {
            descriptor.x = toNumber(value, descriptor.x);
        } else if (key === 'color') {
            descriptor.color = value ? value.toLowerCase() : undefined;
        } else if (key === 'group' || key === 'groupsize') {
            descriptor.groupSize = Math.max(1, Math.floor(toNumber(value, descriptor.groupSize ?? 0)));
        } else if (key === 'spacing') {
            descriptor.spacing = toNumber(value, descriptor.spacing);
        } else if (key === 'offset') {
            offsets.push(toNumber(value, 0));
        }
    }
    if (offsets.length) {
        descriptor.offsets = offsets;
    }
    return descriptor;
}

function normalizeShipDescriptor(descriptor) {
    const normalized = { ...descriptor };
    normalized.time = toNumber(normalized.time, 0);
    if (normalized.y !== undefined) {
        normalized.y = toNumber(normalized.y, undefined);
    }
    if (normalized.x !== undefined) {
        normalized.x = toNumber(normalized.x, undefined);
    }
    if (normalized.color) {
        const lowered = normalized.color.toLowerCase();
        if (lowered === 'auto' || lowered === 'random') {
            normalized.color = undefined;
        } else {
            normalized.color = lowered;
        }
    }
    if (normalized.groupSize !== undefined) {
        normalized.groupSize = Math.max(1, Math.floor(toNumber(normalized.groupSize, 1)));
    }
    if (normalized.spacing !== undefined) {
        normalized.spacing = toNumber(normalized.spacing, undefined);
    }
    if (Array.isArray(normalized.offsets)) {
        normalized.offsets = normalized.offsets.map(value => toNumber(value, 0));
    }
    return normalized;
}

function finalizeFormation(current, defaults) {
    if (!current || !current.ships.length) {
        return null;
    }
    const ships = current.ships.map(normalizeShipDescriptor);
    const duration = ships.reduce((maxTime, ship) => Math.max(maxTime, ship.time ?? 0), 0);
    const difficulty = Number.isFinite(current.difficulty) && current.difficulty > 0
        ? current.difficulty
        : ships.length;
    const minWave = Number.isFinite(current.minWave)
        ? Math.max(1, Math.floor(current.minWave))
        : 1;
    return {
        id: current.id,
        label: current.label,
        difficulty,
        probabilityFn: createProbabilityFunction(current.probability, defaults),
        ships,
        duration,
        gap: current.gap,
        minWave,
    };
}

export function parseFormationText(definitions, defaults = {}) {
    if (!definitions || typeof definitions !== 'string') {
        return [];
    }
    const formations = [];
    let current = null;
    const lines = definitions.split(/\r?\n/);
    const pushCurrent = () => {
        const finalized = finalizeFormation(current, defaults);
        if (finalized) {
            formations.push(finalized);
        }
    };
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        if (line === '---') {
            pushCurrent();
            current = null;
            continue;
        }
        if (line.startsWith('#')) {
            pushCurrent();
            current = { ...parseHeader(line), ships: [] };
            continue;
        }
        if (!current) {
            continue;
        }
        const ship = parseShipLine(line);
        if (ship) {
            current.ships.push(ship);
        }
    }
    pushCurrent();
    return formations;
}

function getScheduledDifficulty(waveSchedule, index) {
    if (!Array.isArray(waveSchedule) || index < 0 || index >= waveSchedule.length) {
        return undefined;
    }
    const entry = waveSchedule[index];
    if (Number.isFinite(entry?.difficulty)) {
        return entry.difficulty;
    }
    if (Array.isArray(entry)) {
        return getScheduledDifficulty(entry, entry.length - 1);
    }
    return undefined;
}

function resolveWaveDifficulty(config, waveSchedule, wave) {
    const applyMultiplier = value => scaleDifficulty(value, config);
    const index = Math.max(0, Math.floor(wave) - 1);
    const scheduled = getScheduledDifficulty(waveSchedule, index);
    if (Number.isFinite(scheduled)) {
        return applyMultiplier(scheduled);
    }
    const endless = config.endlessDifficulty ?? {};
    const scheduledLength = Array.isArray(waveSchedule) ? waveSchedule.length : 0;
    const startWave = Number.isFinite(endless.startWave)
        ? endless.startWave
        : (scheduledLength > 0 ? scheduledLength + 1 : 1);
    if (wave < startWave) {
        const last = getScheduledDifficulty(waveSchedule, scheduledLength - 1);
        return applyMultiplier(Number.isFinite(last) ? last : 0);
    }
    const lastScheduled = getScheduledDifficulty(waveSchedule, scheduledLength - 1);
    const base = Number.isFinite(endless.base)
        ? endless.base
        : (Number.isFinite(lastScheduled) ? lastScheduled : 0);
    const growth = Number.isFinite(endless.growth) ? endless.growth : 0;
    const max = Number.isFinite(endless.max) ? endless.max : Infinity;
    const waveOffset = Math.max(0, wave - startWave);
    const computed = base + growth * waveOffset;
    const capped = Math.min(max, Math.max(0, Math.round(computed)));
    return applyMultiplier(capped);
}

function weightedRandomChoice(items, weights, randomFn) {
    if (!items.length) {
        return null;
    }
    const total = weights.reduce((sum, weight) => sum + (Number.isFinite(weight) ? Math.max(0, weight) : 0), 0);
    if (total <= 0) {
        const index = Math.floor((randomFn?.() ?? Math.random()) * items.length);
        return items[Math.min(items.length - 1, Math.max(0, index))];
    }
    let roll = (randomFn?.() ?? Math.random()) * total;
    for (let i = 0; i < items.length; i++) {
        const weight = Number.isFinite(weights[i]) ? Math.max(0, weights[i]) : 0;
        roll -= weight;
        if (roll <= 0) {
            return items[i];
        }
    }
    return items.at(-1) ?? null;
}

export function createFormationManager(config = {}, waveSchedule = []) {
    const defaults = { ...DEFAULTS, ...(config.defaults ?? {}) };
    const parsed = parseFormationText(config.definitions ?? '', defaults);
    const formations = Array.isArray(config.formations) && config.formations.length
        ? config.formations.map(item => finalizeFormation(item, defaults)).filter(Boolean)
        : parsed;
    if (!formations.length) {
        return null;
    }
    const manager = {
        defaults,
        formations,
        config,
        planWave(wave, options = {}) {
            const totalDifficulty = Number.isFinite(options.totalDifficulty)
                ? options.totalDifficulty
                : resolveWaveDifficulty(config, waveSchedule, wave);
            if (!Number.isFinite(totalDifficulty) || totalDifficulty <= 0) {
                return null;
            }
            const randomFn = typeof options.random === 'function' ? options.random : null;
            let remaining = Math.max(0, Math.floor(totalDifficulty));
            const selections = [];
            const safetyLimit = Math.max(1, options.iterationLimit ?? 200);
            let iterations = 0;
            while (remaining > 0 && iterations < safetyLimit) {
                iterations += 1;
                const candidates = formations.filter(formation => formation.difficulty <= remaining
                    && wave >= (formation.minWave ?? 1));
                if (!candidates.length) {
                    break;
                }
                const weights = candidates.map(candidate => candidate.probabilityFn?.(wave, candidate) ?? 0);
                const chosen = weightedRandomChoice(candidates, weights, randomFn);
                if (!chosen) {
                    break;
                }
                selections.push(chosen);
                remaining -= chosen.difficulty;
            }
            if (!selections.length) {
                return null;
            }
            const events = [];
            let cursorTime = 0;
            for (const selection of selections) {
                const baseTime = cursorTime;
                let localMax = 0;
                for (const ship of selection.ships) {
                    const scheduledTime = baseTime + Math.max(0, ship.time ?? 0);
                    localMax = Math.max(localMax, ship.time ?? 0);
                    events.push({
                        time: scheduledTime,
                        type: ship.type,
                        color: ship.color,
                        x: ship.x,
                        y: ship.y,
                        groupSize: ship.groupSize,
                        spacing: ship.spacing,
                        offsets: Array.isArray(ship.offsets) ? ship.offsets.slice() : undefined,
                        colors: Array.isArray(ship.colors) ? ship.colors.slice() : undefined,
                        formationId: selection.id,
                    });
                }
                const gap = Number.isFinite(selection.gap) ? selection.gap : defaults.formationGap;
                cursorTime = baseTime + localMax + (Number.isFinite(gap) ? Math.max(0, gap) : 0);
            }
            events.sort((a, b) => a.time - b.time || a.formationId.localeCompare(b.formationId));
            const totalEvents = events.length;
            const spentDifficulty = selections.reduce((sum, formation) => sum + formation.difficulty, 0);
            return {
                wave,
                totalDifficulty: spentDifficulty,
                remainingDifficulty: Math.max(0, remaining),
                totalEnemies: totalEvents,
                events,
                selections,
            };
        },
    };
    manager.hasFormations = () => formations.length > 0;
    return manager;
}

export default createFormationManager;
