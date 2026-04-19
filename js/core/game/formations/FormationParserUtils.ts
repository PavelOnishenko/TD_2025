import { FormationDefinition, FormationDefaults, FormationShipDescriptor } from './FormationTypes.js';

const HEADER_MARK = /^#\s*/;
const COMMENT_SUFFIX = /\s+#.*$/;
const ID_SANITIZE = /[^a-zA-Z0-9]+/g;

type FormationDraft = FormationDefinition & { probability?: string };

type IdState = { nextId: number };

const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toFiniteOrUndefined = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

export const sanitizeId = (label: string, state: IdState): string => {
    const trimmed = String(label ?? '').replace(ID_SANITIZE, '-').replace(/^-+|-+$/g, '').toLowerCase();
    if (trimmed) {
        return trimmed;
    }
    state.nextId += 1;
    return `formation-${state.nextId}`;
};

export const createProbabilityFunction = (expression: string | undefined, defaults: FormationDefaults): ((wave: number, formation: FormationDefinition) => number) => {
    const minimumWeight = defaults.minimumWeight ?? 0;
    if (!expression || typeof expression !== 'string') {
        return () => 1;
    }
    const compiled = compileExpression(expression);
    if (!compiled) {
        return () => minimumWeight;
    }
    return (wave, formation) => resolveProbability(compiled, minimumWeight, wave, formation);
};

const compileExpression = (expression: string): ((wave: number, formation: FormationDefinition) => number) | null => {
    try {
        return new Function('wave', 'formation', `return (${expression});`) as (wave: number, formation: FormationDefinition) => number;
    } catch {
        return null;
    }
};

const resolveProbability = (
    compiled: (wave: number, formation: FormationDefinition) => number,
    minimumWeight: number,
    wave: number,
    formation: FormationDefinition,
): number => {
    try {
        const value = Number(compiled(wave, formation));
        return Number.isFinite(value) && value > 0 ? value : minimumWeight;
    } catch {
        return minimumWeight;
    }
};

export const parseHeader = (line: string, state: IdState): FormationDraft => {
    const segments = line.replace(HEADER_MARK, '').trim().split('|').map((part) => part.trim()).filter(Boolean);
    const [first, ...rest] = segments;
    const header: FormationDraft = { id: sanitizeId(first ?? '', state), label: first ?? '', difficulty: Number.NaN, probability: '', ships: [] };
    for (const segment of rest) {
        applyHeaderSegment(header, segment);
    }
    return header;
};

const applyHeaderSegment = (header: FormationDraft, segment: string): void => {
    const [rawKey, ...valueParts] = segment.split('=');
    const key = rawKey?.trim().toLowerCase();
    if (!key) {
        return;
    }
    const value = valueParts.join('=').trim();
    if (key === 'difficulty') {header.difficulty = toNumber(value, Number.NaN);}
    if (key === 'probability') {header.probability = value;}
    if (key === 'gap') {header.gap = toFiniteOrUndefined(value);}
    if (key === 'minwave') {header.minWave = toFiniteOrUndefined(value);}
};

export const parseShipLine = (line: string): FormationShipDescriptor | null => {
    const tokens = line.replace(COMMENT_SUFFIX, '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
        return null;
    }
    const [typeToken, ...restTokens] = tokens;
    const descriptor: FormationShipDescriptor = { type: (typeToken ?? '').toLowerCase(), time: 0 };
    for (const token of restTokens) {
        applyShipToken(descriptor, token);
    }
    return descriptor;
};

const applyShipToken = (descriptor: FormationShipDescriptor, token: string): void => {
    if (token.startsWith('@')) {
        descriptor.time = toNumber(token.slice(1), descriptor.time ?? 0);
        return;
    }
    const [rawKey, rawValue] = token.split('=');
    const key = rawKey?.trim().toLowerCase();
    if (!key) {
        return;
    }
    applyShipProperty(descriptor, key, rawValue?.trim());
};

const applyShipProperty = (descriptor: FormationShipDescriptor, key: string, value: string | undefined): void => {
    if (key === 'y') {descriptor.y = toFiniteOrUndefined(value);}
    if (key === 'x') {descriptor.x = toFiniteOrUndefined(value);}
    if (key === 'color') {descriptor.color = value ? value.toLowerCase() : undefined;}
    if (key === 'group' || key === 'groupsize') {descriptor.groupSize = Math.max(1, Math.floor(toNumber(value, descriptor.groupSize ?? 0)));}
    if (key === 'spacing') {descriptor.spacing = toFiniteOrUndefined(value);}
    if (key === 'offset') {appendOffset(descriptor, toNumber(value, 0));}
};

const appendOffset = (descriptor: FormationShipDescriptor, offset: number): void => {
    const offsets = Array.isArray(descriptor.offsets) ? descriptor.offsets.slice() : [];
    offsets.push(offset);
    descriptor.offsets = offsets;
};

export const createIdState = (): IdState => ({ nextId: 0 });
