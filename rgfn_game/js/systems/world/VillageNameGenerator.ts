const VILLAGE_NAME_TEMPLATES: ReadonlyArray<ReadonlyArray<'PREFIX' | 'STEM' | 'SUFFIX' | 'LINK'>> = [
    ['PREFIX', 'STEM', 'SUFFIX'],
    ['PREFIX', 'STEM', 'STEM', 'SUFFIX'],
    ['PREFIX', 'STEM', 'LINK', 'SUFFIX'],
    ['PREFIX', 'STEM', 'SUFFIX', 'SUFFIX'],
    ['STEM', 'SUFFIX'],
    ['PREFIX', 'STEM'],
    ['PREFIX', 'LINK', 'STEM', 'SUFFIX'],
    ['PREFIX', 'STEM', 'LINK', 'STEM', 'SUFFIX'],
];

const VILLAGE_NAME_PARTS = {
    PREFIX: [
        'ash', 'black', 'briar', 'brim', 'cedar', 'cinder', 'cold', 'crow', 'dawn', 'deep',
        'drift', 'dusk', 'east', 'ember', 'fallow', 'frost', 'glen', 'gold', 'gray', 'green',
        'high', 'hollow', 'iron', 'lake', 'long', 'mist', 'moon', 'moss', 'north', 'oak',
        'pine', 'raven', 'red', 'reed', 'river', 'rose', 'salt', 'shadow', 'silver', 'snow',
        'south', 'spruce', 'star', 'stone', 'storm', 'sun', 'thorn', 'timber', 'vale', 'west',
        'white', 'wild', 'willow', 'wind', 'wolf',
    ],
    STEM: [
        'barrow', 'brook', 'burn', 'cliff', 'crest', 'cross', 'dale', 'den', 'dun', 'fall',
        'fen', 'field', 'ford', 'gate', 'glen', 'grove', 'guard', 'harbor', 'haven', 'helm',
        'hill', 'holt', 'keep', 'mere', 'moor', 'pass', 'peak', 'point', 'port', 'reach',
        'rest', 'ridge', 'rock', 'run', 'shade', 'shore', 'stead', 'stone', 'vale', 'watch',
        'water', 'way', 'well', 'wild', 'wind', 'wood',
    ],
    SUFFIX: [
        'bank', 'barrow', 'bend', 'borough', 'bridge', 'brook', 'burgh', 'cross', 'dale', 'den',
        'edge', 'end', 'fall', 'field', 'ford', 'gate', 'grove', 'guard', 'ham', 'haven',
        'helm', 'hill', 'hold', 'hollow', 'keep', 'landing', 'march', 'market', 'meadow', 'mill',
        'moor', 'mouth', 'point', 'rest', 'ridge', 'rock', 'run', 'stead', 'stone', 'strand',
        'tower', 'vale', 'view', 'ward', 'watch', 'way', 'well', 'wich', 'wood',
    ],
    LINK: ['-', "'"],
} as const;

function seededRandom(seed: number): number {
    const value = Math.sin(seed) * 10000;
    return value - Math.floor(value);
}

function pickFrom<T>(items: readonly T[], seed: number): T {
    const index = Math.floor(seededRandom(seed) * items.length) % items.length;
    return items[index];
}

function capitalizePart(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function generateVillageName(seed: number): string {
    const template = pickFrom(VILLAGE_NAME_TEMPLATES, (seed * 1.13) + 17);
    let offset = 0;
    const pieces = template.map((token) => {
        const part = pickFrom(VILLAGE_NAME_PARTS[token], seed + (offset * 37.19));
        offset += 1;
        return part;
    });

    const merged: string[] = [];
    for (const piece of pieces) {
        if (piece === '-' || piece === "'") {
            if (merged.length === 0) {
                continue;
            }
            merged[merged.length - 1] += piece;
            continue;
        }

        if (merged.length > 0 && (merged[merged.length - 1].endsWith('-') || merged[merged.length - 1].endsWith("'"))) {
            merged[merged.length - 1] += capitalizePart(piece);
        } else {
            merged.push(capitalizePart(piece));
        }
    }

    if (merged.length > 1 && seededRandom(seed + 911) < 0.26) {
        return `${merged[0]} ${merged.slice(1).join('')}`;
    }

    return merged.join('');
}
