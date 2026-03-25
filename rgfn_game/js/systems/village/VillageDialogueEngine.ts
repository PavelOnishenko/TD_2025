export type CompassDirection = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';

export type VillageDirectionHint = {
    settlementName: string;
    exists: boolean;
    direction?: CompassDirection;
    distanceCells?: number;
};

export type NpcDisposition = 'silent' | 'truthful' | 'imprecise' | 'liar' | 'malicious' | 'random';

export type VillageNpcProfile = {
    id: string;
    name: string;
    role: string;
    look: string;
    speechStyle: string;
    disposition: NpcDisposition;
};

export type VillageDialogueOutcome = {
    speech: string;
    tone: string;
    truthfulness: 'truth' | 'imprecise' | 'lie' | 'refusal' | 'random';
};

const DIRECTIONS: CompassDirection[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export default class VillageDialogueEngine {
    public createNpcRoster(villageName: string): VillageNpcProfile[] {
        const rosterSize = 3 + Math.floor(Math.random() * 3);
        return Array.from({ length: rosterSize }, (_, index) => this.createNpc(villageName, index));
    }

    public buildLocationAnswer(npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'silent') {
            return {
                speech: `"I don't discuss roads with strangers."`,
                tone: `${npc.name} folds their arms and avoids eye contact.`,
                truthfulness: 'refusal',
            };
        }

        if (!hint.exists) {
            if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
                return {
                    speech: `"Of course I know it. Go ${this.randomDirection()} until nightfall."`,
                    tone: `${npc.name} speaks with suspicious confidence.`,
                    truthfulness: 'lie',
                };
            }

            return {
                speech: `"Never heard of ${hint.settlementName}. Maybe try another village."`,
                tone: `${npc.name} shrugs apologetically.`,
                truthfulness: npc.disposition === 'random' ? 'random' : 'refusal',
            };
        }

        if (npc.disposition === 'truthful') {
            return {
                speech: `"${hint.settlementName}? Head ${hint.direction}. It's about ${this.distanceText(hint.distanceCells ?? 0)} away."`,
                tone: `${npc.name} answers clearly and points on the horizon.`,
                truthfulness: 'truth',
            };
        }

        if (npc.disposition === 'imprecise') {
            return {
                speech: `"I think it's ${this.nearbyDirection(hint.direction!)}... maybe ${this.impreciseDistance(hint.distanceCells ?? 0)} from here."`,
                tone: `${npc.name} scratches their chin, unsure but trying to help.`,
                truthfulness: 'imprecise',
            };
        }

        if (npc.disposition === 'liar') {
            return {
                speech: `"Easy. Just go ${this.oppositeDirection(hint.direction!)} and you cannot miss it."`,
                tone: `${npc.name} smiles too quickly.`,
                truthfulness: 'lie',
            };
        }

        if (npc.disposition === 'malicious') {
            return {
                speech: `"Take the ${this.oppositeDirection(hint.direction!)} road to the old ruins. ${hint.settlementName} should be behind them."`,
                tone: `${npc.name} lowers their voice and gives a predatory grin.`,
                truthfulness: 'lie',
            };
        }

        return {
            speech: `"Hmm... try ${this.randomDirection()}. I have a feeling."`,
            tone: `${npc.name} waves vaguely without checking the sky.`,
            truthfulness: 'random',
        };
    }

    public randomDirection(): CompassDirection {
        return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }

    private createNpc(villageName: string, index: number): VillageNpcProfile {
        const names = ['Mara', 'Iven', 'Tor', 'Selene', 'Garr', 'Nira', 'Bram', 'Talia', 'Daren', 'Ysolde'];
        const roles = ['Trader', 'Hunter', 'Miller', 'Guard', 'Herbalist', 'Carpenter'];
        const looks = [
            'scarred face, travel cloak, muddy boots',
            'sunburnt skin, braided hair, patched vest',
            'silver earrings, clean gloves, observant eyes',
            'broad shoulders, old armor, calm expression',
            'ink-stained fingers, satchel of notes, tired smile',
        ];
        const speechStyles = ['calm and measured', 'fast and nervous', 'warm and direct', 'cold and formal', 'playful but evasive'];
        const dispositions: NpcDisposition[] = ['truthful', 'imprecise', 'liar', 'silent', 'malicious', 'random'];

        return {
            id: `${villageName.toLowerCase()}-${index}`,
            name: names[Math.floor(Math.random() * names.length)],
            role: roles[Math.floor(Math.random() * roles.length)],
            look: looks[Math.floor(Math.random() * looks.length)],
            speechStyle: speechStyles[Math.floor(Math.random() * speechStyles.length)],
            disposition: dispositions[Math.floor(Math.random() * dispositions.length)],
        };
    }

    private oppositeDirection(direction: CompassDirection): CompassDirection {
        const idx = DIRECTIONS.indexOf(direction);
        return DIRECTIONS[(idx + 4) % DIRECTIONS.length];
    }

    private nearbyDirection(direction: CompassDirection): CompassDirection {
        const idx = DIRECTIONS.indexOf(direction);
        const shift = Math.random() < 0.5 ? -1 : 1;
        return DIRECTIONS[(idx + shift + DIRECTIONS.length) % DIRECTIONS.length];
    }

    private distanceText(distanceCells: number): string {
        if (distanceCells <= 4) return 'a short walk';
        if (distanceCells <= 12) return 'half a day';
        if (distanceCells <= 24) return 'about a day';
        return 'several days';
    }

    private impreciseDistance(distanceCells: number): string {
        if (distanceCells <= 8) return 'nearby';
        if (distanceCells <= 18) return 'not too far';
        return 'far from here';
    }
}
