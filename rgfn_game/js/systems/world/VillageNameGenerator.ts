type NameWordToken = 'COMPACT' | 'DESCRIPTOR' | 'PLACE';

type NamePattern = {
    tokens: NameWordToken[];
    weight: number;
};

const NAME_PATTERNS: NamePattern[] = [
    { tokens: ['COMPACT'], weight: 52 },
    { tokens: ['DESCRIPTOR', 'PLACE'], weight: 17 },
    { tokens: ['COMPACT', 'PLACE'], weight: 14 },
    { tokens: ['DESCRIPTOR', 'COMPACT'], weight: 7 },
    { tokens: ['COMPACT', 'COMPACT'], weight: 6 },
    { tokens: ['DESCRIPTOR', 'PLACE', 'PLACE'], weight: 2 },
    { tokens: ['COMPACT', 'PLACE', 'PLACE'], weight: 1 },
    { tokens: ['DESCRIPTOR', 'COMPACT', 'PLACE', 'PLACE'], weight: 1 },
];

const DESCRIPTORS = [
    'ash', 'black', 'briar', 'cedar', 'cinder', 'cold', 'crow', 'dawn', 'deep', 'drift',
    'dusk', 'east', 'ember', 'fallow', 'frost', 'gold', 'gray', 'green', 'high', 'hollow',
    'iron', 'long', 'mist', 'moon', 'moss', 'north', 'oak', 'pine', 'raven', 'red',
    'reed', 'river', 'rose', 'salt', 'shadow', 'silver', 'snow', 'south', 'star', 'stone',
    'storm', 'sun', 'thorn', 'timber', 'vale', 'west', 'white', 'wild', 'willow', 'wind', 'wolf',
] as const;

const COMPACT_START = [
    'ash', 'briar', 'brim', 'cedar', 'crow', 'dawn', 'deep', 'dun', 'east', 'ember',
    'fallow', 'frost', 'glen', 'gray', 'green', 'high', 'iron', 'lake', 'long', 'mist',
    'moon', 'moss', 'north', 'oak', 'pine', 'raven', 'red', 'river', 'rose', 'shadow',
    'silver', 'snow', 'south', 'star', 'stone', 'storm', 'sun', 'thorn', 'west', 'white',
    'wild', 'willow', 'wind', 'wolf',
] as const;

const COMPACT_MID = [
    'bar', 'brook', 'crest', 'cross', 'den', 'fen', 'field', 'ford', 'glen', 'guard',
    'har', 'haven', 'helm', 'hill', 'holt', 'mere', 'moor', 'point', 'reach', 'rest',
    'ridge', 'rock', 'run', 'shade', 'shore', 'stead', 'stone', 'watch', 'water', 'well', 'wood',
] as const;

const COMPACT_END = [
    'bank', 'barrow', 'bend', 'bridge', 'brook', 'cross', 'dale', 'den', 'edge', 'end',
    'fall', 'field', 'ford', 'gate', 'grove', 'guard', 'ham', 'haven', 'helm', 'hill',
    'hold', 'hollow', 'keep', 'landing', 'march', 'market', 'meadow', 'mill', 'moor', 'point',
    'rest', 'ridge', 'rock', 'run', 'stead', 'stone', 'strand', 'tower', 'vale', 'view',
    'ward', 'watch', 'way', 'well', 'wich', 'wood',
] as const;

const PLACE_WORDS = [
    'bank', 'barrow', 'bridge', 'crossing', 'dale', 'den', 'fields', 'ford', 'gate', 'grove',
    'harbor', 'haven', 'heights', 'hollow', 'keep', 'landing', 'market', 'meadow', 'mills', 'moor',
    'pass', 'reach', 'rest', 'ridge', 'shore', 'stead', 'tower', 'vale', 'ward', 'watch',
    'way', 'well', 'woods',
] as const;

const COMPOUND_LINKERS = ['', '-', "'"] as const;

function seededRandom(seed: number): number {
    const value = Math.sin(seed) * 10000;
    return value - Math.floor(value);
}

function pickFrom<T>(items: readonly T[], seed: number): T {
    const index = Math.floor(seededRandom(seed) * items.length) % items.length;
    return items[index];
}

function pickWeightedPattern(seed: number): NamePattern {
    const totalWeight = NAME_PATTERNS.reduce((total, pattern) => total + pattern.weight, 0);
    let roll = Math.floor(seededRandom(seed) * totalWeight) + 1;
    for (const pattern of NAME_PATTERNS) {
        roll -= pattern.weight;
        if (roll <= 0) {
            return pattern;
        }
    }
    return NAME_PATTERNS[0];
}

function capitalizePart(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildCompoundWord(seed: number): string {
    const complexityRoll = seededRandom(seed + 33);
    const partCount = complexityRoll < 0.9
        ? 2
        : complexityRoll < 0.99
            ? 3
            : 4;

    const linker = pickFrom(COMPOUND_LINKERS, seed + 49);
    const parts: string[] = [];
    parts.push(pickFrom(COMPACT_START, seed + 101));

    const midPartCount = Math.max(0, partCount - 2);
    for (let index = 0; index < midPartCount; index += 1) {
        parts.push(pickFrom(COMPACT_MID, seed + 201 + (index * 37)));
    }

    parts.push(pickFrom(COMPACT_END, seed + 401));

    const merged = parts.reduce((total, part, index) => {
        if (index === 0) {
            return capitalizePart(part);
        }

        if (!linker) {
            return `${total}${part}`;
        }

        return `${total}${linker}${capitalizePart(part)}`;
    }, '');

    return merged;
}

function buildWord(token: NameWordToken, seed: number): string {
    if (token === 'DESCRIPTOR') {
        return capitalizePart(pickFrom(DESCRIPTORS, seed + 701));
    }

    if (token === 'PLACE') {
        return capitalizePart(pickFrom(PLACE_WORDS, seed + 809));
    }

    return buildCompoundWord(seed + 907);
}

export function generateVillageName(seed: number): string {
    const pattern = pickWeightedPattern(seed + 11);
    return pattern.tokens
        .map((token, index) => buildWord(token, seed + (index * 131)))
        .join(' ');
}
