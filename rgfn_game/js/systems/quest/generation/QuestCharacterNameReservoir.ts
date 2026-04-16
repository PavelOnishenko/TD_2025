import { theme } from '../../../config/ThemeConfig.js';
import QuestPackService from './QuestPackService.js';

export default class QuestCharacterNameReservoir {
    private readonly names: string[] = [];
    private isRefilling = false;

    constructor(private readonly packService: QuestPackService, private readonly refillSize: number = 16, private readonly refillThreshold: number = 8) {
        this.triggerRefill();
    }

    public nextName = (): string => {
        const selectedName = this.names.shift();
        if (this.names.length < this.refillThreshold) {
            this.triggerRefill();
        }
        return selectedName ?? '';
    };

    private triggerRefill(): void {
        if (this.isRefilling) {
            return;
        }
        this.isRefilling = true;
        void this.refill().finally(() => {
            this.isRefilling = false;
        });
    }

    private async refill(): Promise<void> {
        const maxWords = Math.max(1, Math.floor(theme.quest.nameGeneration.maxWordsByDomain.character ?? 2));
        const generatedNames = await Promise.all(
            Array.from({ length: this.refillSize }, async () => (await this.packService.generateName('character', maxWords)).text.trim()),
        );
        generatedNames.filter((name) => name.length > 0).forEach((name) => this.names.push(name));
    }
}
