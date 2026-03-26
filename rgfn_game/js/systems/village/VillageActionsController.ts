import Player from '../../entities/Player.js';
import Item, { createItemById } from '../../entities/Item.js';
import VillageDialogueEngine, { CompassDirection, VillageDialogueOutcome, VillageDirectionHint, VillageNpcProfile } from './VillageDialogueEngine.js';

type VillageUI = {
    sidebar: HTMLElement;
    title: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    buyOffer1Btn: HTMLButtonElement;
    buyOffer2Btn: HTMLButtonElement;
    buyOffer3Btn: HTMLButtonElement;
    buyOffer4Btn: HTMLButtonElement;
    sellSelect: HTMLSelectElement;
    sellSelectedBtn: HTMLButtonElement;
    npcList: HTMLElement;
    npcTitle: HTMLElement;
    askVillageInput: HTMLInputElement;
    askVillageBtn: HTMLButtonElement;
};

type VillageActionsCallbacks = {
    onUpdateHUD: () => void;
    onLeaveVillage: () => void;
    getVillageDirectionHint: (settlementName: string) => VillageDirectionHint;
};

type VillageOffer = {
    kindName: string;
    buyPrice: number;
    possibleItemIds: string[];
};

type OfferKind = {
    kindName: string;
    buyPrice: number;
    itemIds: string[];
};

const POTION_KINDS: OfferKind[] = [
    { kindName: 'Healing Potion', buyPrice: 4, itemIds: ['healingPotion'] },
    { kindName: 'Mana Potion', buyPrice: 5, itemIds: ['manaPotion'] },
];

const NON_POTION_KINDS: OfferKind[] = [
    { kindName: 'Knife', buyPrice: 4, itemIds: ['knife_t1', 'knife_t2', 'knife_t3', 'knife_t4'] },
    { kindName: 'Short Sword', buyPrice: 9, itemIds: ['shortSword_t1', 'shortSword_t2', 'shortSword_t3', 'shortSword_t4'] },
    { kindName: 'Axe', buyPrice: 12, itemIds: ['axe_t1', 'axe_t2', 'axe_t3', 'axe_t4'] },
    { kindName: 'Two-Handed Sword', buyPrice: 22, itemIds: ['twoHandedSword_t1', 'twoHandedSword_t2', 'twoHandedSword_t3', 'twoHandedSword_t4'] },
    { kindName: 'Bow', buyPrice: 15, itemIds: ['bow_t1', 'bow_t2', 'bow_t3', 'bow_t4'] },
    { kindName: 'Crossbow', buyPrice: 24, itemIds: ['crossbow_t1', 'crossbow_t2', 'crossbow_t3', 'crossbow_t4'] },
    { kindName: 'Armor', buyPrice: 16, itemIds: ['armor_t1', 'armor_t2', 'armor_t3', 'armor_t4'] },
];

export default class VillageActionsController {
    private player: Player;
    private villageUI: VillageUI;
    private callbacks: VillageActionsCallbacks;
    private gameLog: HTMLElement;
    private currentOffers: VillageOffer[] = [];
    private readonly dialogueEngine: VillageDialogueEngine;
    private currentVillageName = '';
    private npcRoster: VillageNpcProfile[] = [];
    private villageNpcRosters: Map<string, VillageNpcProfile[]> = new Map();
    private selectedNpcId: string | null = null;

    constructor(player: Player, villageUI: VillageUI, gameLog: HTMLElement, callbacks: VillageActionsCallbacks) {
        this.player = player;
        this.villageUI = villageUI;
        this.gameLog = gameLog;
        this.callbacks = callbacks;
        this.dialogueEngine = new VillageDialogueEngine();
    }

    public enterVillage(villageName: string): void {
        this.currentVillageName = villageName;
        this.villageUI.title.textContent = `Village: ${villageName}`;
        this.refreshVillageStock();
        this.npcRoster = this.getOrCreateVillageNpcRoster(villageName);
        this.selectedNpcId = null;
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.remove('hidden');
        this.villageUI.actions.classList.add('hidden');
        this.gameLog.innerHTML = '';
        this.addLog(`You discover ${villageName}. Enter it?`, 'system');
        this.updateButtons();
    }

    public exitVillage(): void {
        this.villageUI.sidebar.classList.add('hidden');
    }

    public handleEnter(villageName: string): void {
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.addLog(`You enter ${villageName} market square.`, 'system');
        this.addLog('This village offers one potion type and three random item kinds.', 'system');
        this.addLog(`You notice ${this.npcRoster.length} locals open for conversation.`, 'system');
        this.renderNpcButtons();
        this.updateNpcPanel();
        this.updateButtons();
    }

    public handleSkip(): void {
        this.addLog('You decide not to enter and continue your journey.', 'system');
        this.callbacks.onLeaveVillage();
    }

    public handleWait(): void {
        this.player.heal(1);
        this.player.restoreMana(1);
        this.addLog('You wait at the inn and recover 1 HP and 1 mana.', 'player');
        this.callbacks.onUpdateHUD();
    }

    public handleBuyOffer(offerIndex: number): void {
        const offer = this.currentOffers[offerIndex];
        if (!offer) {
            this.addLog('This offer is not available.', 'system');
            return;
        }

        if (this.player.gold < offer.buyPrice) {
            this.addLog(`Not enough gold. ${offer.kindName} costs ${offer.buyPrice}g.`, 'system');
            return;
        }

        const itemId = offer.possibleItemIds[Math.floor(Math.random() * offer.possibleItemIds.length)];
        const item = createItemById(itemId);
        if (!item) {
            this.addLog('The merchant cannot find that item right now.', 'system');
            return;
        }

        const addedToInventory = this.player.addItemToInventory(item);
        if (!addedToInventory) {
            this.addLog('Inventory full. Sell something first.', 'system');
            return;
        }

        this.player.gold -= offer.buyPrice;
        this.addLog(`You buy ${offer.kindName} (${offer.buyPrice}g) and receive: ${item.name}.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleSellSelected(): void {
        const selectedIndex = Number.parseInt(this.villageUI.sellSelect.value, 10);
        if (!Number.isFinite(selectedIndex)) {
            this.addLog('Choose an inventory item to sell.', 'system');
            return;
        }

        const removedItem = this.player.removeInventoryItemAt(selectedIndex);
        if (!removedItem) {
            this.addLog('That item is no longer available.', 'system');
            this.updateButtons();
            return;
        }

        const sellPrice = this.getSellPrice(removedItem);
        this.player.gold += sellPrice;
        this.addLog(`You sold ${removedItem.name} for ${sellPrice}g.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleSelectNpc(index: number): void {
        const npc = this.npcRoster[index];
        if (!npc) {
            this.addLog('No one with that description is nearby.', 'system');
            return;
        }

        this.selectedNpcId = npc.id;
        this.updateNpcPanel();
        this.renderNpcButtons();
        this.addLog(`You approach ${npc.name} the ${npc.role}.`, 'player');
        this.addLog(`${npc.name} looks ${npc.look} and speaks in a ${npc.speechStyle} manner.`, 'system-message');
    }

    public handleAskAboutSettlement(): void {
        const selectedNpc = this.getSelectedNpc();
        if (!selectedNpc) {
            this.addLog('Choose an NPC first before asking for directions.', 'system');
            return;
        }

        const targetSettlement = this.villageUI.askVillageInput.value.trim();
        if (!targetSettlement) {
            this.addLog('Type the settlement name you want to find.', 'system');
            return;
        }

        const hint = this.callbacks.getVillageDirectionHint(targetSettlement);
        const answer = this.dialogueEngine.buildLocationAnswer(selectedNpc, hint);

        this.addLog(`You ask ${selectedNpc.name}: "Where is ${targetSettlement}?"`, 'player');
        this.addLog(`${selectedNpc.name} (${selectedNpc.role}, ${answer.truthfulness}): ${answer.speech}`, 'system');
        this.addLog(answer.tone, 'system-message');
        if (hint.exists && answer.truthfulness === 'truth') {
            this.addLog(`Your map notes: ${targetSettlement} lies ${hint.direction} (${this.describeDistance(hint.distanceCells ?? 0)}).`, 'system-message');
        }
    }

    public handleLeave(): void {
        this.addLog('You leave the village.', 'system');
        this.callbacks.onLeaveVillage();
    }

    public addLog(message: string, type: string = 'system'): void {
        const line = document.createElement('div');
        line.textContent = message;
        line.classList.add(`${type}-action`);
        this.gameLog.appendChild(line);
        this.gameLog.scrollTop = this.gameLog.scrollHeight;
    }

    public updateButtons(): void {
        const buyButtons = [
            this.villageUI.buyOffer1Btn,
            this.villageUI.buyOffer2Btn,
            this.villageUI.buyOffer3Btn,
            this.villageUI.buyOffer4Btn,
        ];

        buyButtons.forEach((button, index) => {
            const offer = this.currentOffers[index];
            if (!offer) {
                button.disabled = true;
                button.textContent = 'Unavailable';
                return;
            }

            const canAfford = this.player.gold >= offer.buyPrice;
            button.disabled = !canAfford;
            button.textContent = `Buy ${offer.kindName} (${offer.buyPrice}g) · random tier`;
        });

        this.refreshSellOptions();
        this.villageUI.sellSelectedBtn.disabled = this.villageUI.sellSelect.disabled;
        this.villageUI.askVillageBtn.disabled = !this.getSelectedNpc() || !this.villageUI.askVillageInput.value.trim();
    }

    private getOrCreateVillageNpcRoster(villageName: string): VillageNpcProfile[] {
        const cachedRoster = this.villageNpcRosters.get(villageName);
        if (cachedRoster) {
            return cachedRoster;
        }

        const roster = this.dialogueEngine.createNpcRoster(villageName);
        this.villageNpcRosters.set(villageName, roster);
        return roster;
    }

    private refreshVillageStock(): void {
        const potionOffer = this.pickOne(POTION_KINDS);
        const nonPotionOffers = this.pickMany(NON_POTION_KINDS, 3);
        this.currentOffers = [potionOffer, ...nonPotionOffers].map((offerKind) => ({
            kindName: offerKind.kindName,
            buyPrice: offerKind.buyPrice,
            possibleItemIds: offerKind.itemIds,
        }));
    }

    private refreshSellOptions(): void {
        const selectedValue = this.villageUI.sellSelect.value;
        const inventory = this.player.getInventory();

        this.villageUI.sellSelect.innerHTML = '';

        inventory.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = `${item.name} (+${this.getSellPrice(item)}g)`;
            this.villageUI.sellSelect.appendChild(option);
        });

        if (this.villageUI.sellSelect.options.length === 0) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'No inventory items to sell';
            this.villageUI.sellSelect.appendChild(placeholder);
            this.villageUI.sellSelect.disabled = true;
            return;
        }

        this.villageUI.sellSelect.disabled = false;
        const hasPreviousSelection = Array.from(this.villageUI.sellSelect.options).some((option) => option.value === selectedValue);
        this.villageUI.sellSelect.value = hasPreviousSelection ? selectedValue : this.villageUI.sellSelect.options[0].value;
    }

    private renderNpcButtons(): void {
        this.villageUI.npcList.innerHTML = '';
        this.npcRoster.forEach((npc, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'action-btn village-npc-btn';
            button.textContent = `${npc.name} (${npc.role})`;
            if (this.selectedNpcId === npc.id) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => this.handleSelectNpc(index));
            this.villageUI.npcList.appendChild(button);
        });
    }

    private updateNpcPanel(): void {
        const npc = this.getSelectedNpc();
        if (!npc) {
            this.villageUI.npcTitle.textContent = 'Choose someone to talk to';
            return;
        }

        this.villageUI.npcTitle.textContent = `${npc.name}, ${npc.role} — ${npc.speechStyle}`;
    }

    private getSelectedNpc(): VillageNpcProfile | null {
        if (!this.selectedNpcId) {
            return null;
        }

        return this.npcRoster.find((npc) => npc.id === this.selectedNpcId) ?? null;
    }

    private describeDistance(distanceCells: number): string {
        if (distanceCells <= 4) {
            return 'close by';
        }
        if (distanceCells <= 12) {
            return 'medium range';
        }
        if (distanceCells <= 24) {
            return 'far';
        }
        return 'very far';
    }

    private getSellPrice(item: Item): number {
        return Math.max(1, Math.ceil(item.goldValue * 0.5));
    }

    private pickOne<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    private pickMany<T>(array: T[], count: number): T[] {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, Math.min(count, copy.length));
    }
}
