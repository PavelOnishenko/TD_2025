import { LOCAL_PATTERNS } from './QuestPatterns.js';
import { DefaultQuestRandom, QuestRandom } from './QuestRandom.js';
import { GeneratedName, PackSourceType, QuestNameDomain } from './QuestTypes.js';
import { balanceConfig } from '../../config/balanceConfig.js';

type FetchLike = (input: string) => Promise<{ text(): Promise<string>; json(): Promise<unknown> }>;
type AssetMap = Record<string, string[]>;
type PackSource = { type: PackSourceType; domain: QuestNameDomain; available: boolean; generate(limit: number): Promise<string[]> };
type QuestPackServiceDeps = {
    fetchImpl?: FetchLike;
    random?: QuestRandom;
    fileReader?: (path: string) => Promise<string>;
    locationNamesProvider?: () => string[] | Promise<string[]>;
};

type CountryRecord = { name?: { common?: string }; capital?: string[]; region?: string; subregion?: string };
type RandomUserResponse = { results: Array<{ name: { first: string; last: string } }> };
type LengthWeightMap = Partial<Record<1 | 2 | 3 | 4, number>>;

const ASSET_PATHS = {
    ADJECTIVE: '../../../data/quest-packs/common/adjectives.txt',
    NOUN: '../../../data/quest-packs/common/nouns.txt',
    PREPOSITION: '../../../data/quest-packs/common/prepositions.txt',
    WEAPON: '../../../data/quest-packs/common/weapons.txt',
    GIVEN: '../../../data/quest-packs/people/given.txt',
    FAMILY: '../../../data/quest-packs/people/family.txt',
    ROLE: '../../../data/quest-packs/people/trader_roles.txt',
    SPECIES: '../../../data/quest-packs/monsters/species.txt',
} as const;

const PLACE_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion';
const NAME_URL = 'https://randomuser.me/api/?inc=name&noinfo&results=1';
const ECHO_SYLLABLES = ['va', 'lor', 'quin', 'esh', 'dra', 'morn', 'lys', 'tor', 'zen', 'ka'];
const DOMAINS: QuestNameDomain[] = ['location', 'artifact', 'character', 'monster', 'mainQuest'];

export default class QuestPackService {
    private readonly fetchImpl: FetchLike;
    private readonly random: QuestRandom;
    private readonly fileReader: (path: string) => Promise<string>;
    private readonly locationNamesProvider: () => string[] | Promise<string[]>;
    private readonly assets: AssetMap = {};
    private readonly sources: PackSource[] = [];
    private initialized = false;

    constructor(deps: QuestPackServiceDeps = {}) {
        this.fetchImpl = deps.fetchImpl ?? ((input: string) => globalThis.fetch(input));
        this.random = deps.random ?? new DefaultQuestRandom();
        this.fileReader = deps.fileReader ?? ((path) => this.readTextAsset(path));
        this.locationNamesProvider = deps.locationNamesProvider ?? (() => []);
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        await this.loadAssets();
        this.createSources();
        await this.probeSources();
        this.initialized = true;
    }

    public async generateName(domain: QuestNameDomain, maxWords: number): Promise<GeneratedName> {
        await this.initialize();
        if (domain === 'location') {
            const villageSource = this.sources.find((source) => source.domain === 'location' && source.type === 'map-village' && source.available);
            if (villageSource) {
                const villageName = (await villageSource.generate(maxWords))[0];
                if (villageName) {
                    return { text: this.titleCase([villageName]), domain, sourceTypes: [villageSource.type] };
                }
            }
        }

        const target = this.pickWordTarget(domain, maxWords);
        const words: string[] = [];
        const sourceTypes: PackSourceType[] = [];
        while (words.length < target) {
            const source = this.pickSource(domain);
            const limit = Math.min(3, target - words.length);
            words.push(...(await source.generate(limit)).slice(0, limit));
            sourceTypes.push(source.type);
        }
        return { text: this.titleCase(words), domain, sourceTypes };
    }

    private pickWordTarget(domain: QuestNameDomain, maxWords: number): number {
        const cap = Math.max(1, maxWords);
        const configuredWeights = balanceConfig.questNameGeneration.wordLengthWeightsByDomain[domain] as LengthWeightMap | undefined;
        const weightedTargets = this.resolveLengthWeights(configuredWeights, cap);

        const totalWeight = weightedTargets.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = this.random.nextInt(1, totalWeight);
        for (const entry of weightedTargets) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.words;
            }
        }

        return Math.min(2, cap);
    }

    private resolveLengthWeights(weights: LengthWeightMap | undefined, cap: number): Array<{ words: number; weight: number }> {
        if (!weights) {
            return [{ words: 1, weight: 1 }];
        }

        const entries = (Object.entries(weights) as Array<[string, number]>)
            .map(([length, weight]) => ({ words: Number(length), weight }))
            .filter((entry) => Number.isInteger(entry.words)
                && entry.words >= 1
                && entry.words <= cap
                && entry.weight > 0);

        if (entries.length > 0) {
            return entries;
        }

        return [{ words: 1, weight: 1 }];
    }

    private async loadAssets(): Promise<void> {
        for (const [key, path] of Object.entries(ASSET_PATHS)) {
            this.assets[key] = this.wordList(await this.fileReader(path));
        }
    }

    private createSources(): void {
        for (const domain of DOMAINS) {
            this.sources.push(this.localSource(domain));
            this.sources.push(this.echoSource(domain));
        }
        this.sources.push(this.mapVillageSource());
        this.sources.push(this.locationSource());
        this.sources.push(this.nameSource('character'));
        this.sources.push(this.nameSource('monster'));
    }

    private async probeSources(): Promise<void> {
        for (const source of this.sources) {
            if (source.type === 'map-village') {
                source.available = (await this.locationNamesProvider())
                    .map((name) => name.trim())
                    .filter(Boolean)
                    .length > 0;
                continue;
            }

            source.available = !source.type.startsWith('remote') || await this.isAvailable(source);
        }
    }

    private async isAvailable(source: PackSource): Promise<boolean> {
        try {
            return (await source.generate(1)).length > 0;
        } catch {
            return false;
        }
    }

    private pickSource(domain: QuestNameDomain): PackSource {
        return this.random.pick(this.sources.filter((source) => source.domain === domain && source.available));
    }

    private localSource(domain: QuestNameDomain): PackSource {
        return { type: 'local-pattern', domain, available: true, generate: (limit) => this.localPack(domain, limit) };
    }

    private async localPack(domain: QuestNameDomain, limit: number): Promise<string[]> {
        const options = LOCAL_PATTERNS.filter((item) => item.domain === domain && item.tokens.length <= limit);
        const pattern = this.random.pick(options);
        return pattern.tokens.map((token) => this.random.pick(this.assets[token]));
    }


    private mapVillageSource(): PackSource {
        return { type: 'map-village', domain: 'location', available: true, generate: () => this.mapVillagePack() };
    }

    private async mapVillagePack(): Promise<string[]> {
        const villageNames = (await this.locationNamesProvider())
            .map((name) => name.trim())
            .filter(Boolean);
        if (villageNames.length === 0) {
            return [];
        }
        const selected = this.random.pick(villageNames);
        return selected ? [selected] : [];
    }

    private locationSource(): PackSource {
        return { type: 'remote-location', domain: 'location', available: false, generate: () => this.fetchLocationPack() };
    }

    private async fetchLocationPack(): Promise<string[]> {
        const response = await this.fetchImpl(PLACE_URL);
        const sample = this.random.pick(await response.json() as CountryRecord[]);
        const choices = [sample.name?.common, sample.capital?.[0], sample.subregion, sample.region].filter(Boolean) as string[];
        return this.wordList(this.random.pick(choices)).slice(0, 3);
    }

    private nameSource(domain: QuestNameDomain): PackSource {
        return { type: 'remote-name', domain, available: false, generate: (limit) => this.fetchName(limit) };
    }

    private async fetchName(limit: number): Promise<string[]> {
        const response = await this.fetchImpl(NAME_URL);
        const data = await response.json() as RandomUserResponse;
        const name = data.results[0].name;
        return [name.first, name.last].map((part) => part.toLowerCase()).slice(0, limit);
    }

    private echoSource(domain: QuestNameDomain): PackSource {
        return { type: 'echo', domain, available: true, generate: (limit) => Promise.resolve(this.echoPack(limit)) };
    }

    private echoPack(limit: number): string[] {
        return Array.from({ length: Math.max(1, limit) }, () => `${this.random.pick(ECHO_SYLLABLES)}${this.random.pick(ECHO_SYLLABLES)}`);
    }

    private titleCase(words: string[]): string {
        return words.map((word) => this.capitalizeWord(word)).join(' ');
    }

    private capitalizeWord(word: string): string {
        return word.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
    }

    private wordList(text: string): string[] {
        return text.split(/\s+/).map((word) => word.trim()).filter(Boolean);
    }

    private async readTextAsset(path: string): Promise<string> {
        const url = new URL(path, import.meta.url);
        if (url.protocol === 'file:') {
            const load = Function('path', 'return import(path)') as (path: string) => Promise<{ readFile(file: URL, encoding: string): Promise<string> }>;
            return (await load('node:fs/promises')).readFile(url, 'utf8');
        }
        return (await this.fetchImpl(url.toString())).text();
    }
}
