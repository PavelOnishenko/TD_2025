import Player from '../../entities/Player.js';
import Item, { createItemById } from '../../entities/Item.js';

type VillageUI = {
    sidebar: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    buyOffer1Btn: HTMLButtonElement;
    buyOffer2Btn: HTMLButtonElement;
    buyOffer3Btn: HTMLButtonElement;
    buyOffer4Btn: HTMLButtonElement;
    sellSelect: HTMLSelectElement;
    sellSelectedBtn: HTMLButtonElement;
};

type VillageActionsCallbacks = {
    onUpdateHUD: () => void;
    onLeaveVillage: () => void;
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

    constructor(player: Player, villageUI: VillageUI, gameLog: HTMLElement, callbacks: VillageActionsCallbacks) {
        this.player = player;
        this.villageUI = villageUI;
        this.gameLog = gameLog;
        this.callbacks = callbacks;
    }

    public enterVillage(villageName: string): void {
        this.refreshVillageStock();
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
        this.villageUI.sellSelectedBtn.disabled = this.villageUI.sellSelect.options.length === 0;
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

    private getSellPrice(item: Item): number {
        if (item.id === 'healingPotion') {
            return 2;
        }

        if (item.id === 'manaPotion') {
            return 3;
        }

        const baseValue = item.goldValue || 1;
        return Math.max(1, Math.floor(baseValue * 0.6));
    }

    private pickOne<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    private pickMany<T>(items: T[], count: number): T[] {
        const pool = [...items];
        const picked: T[] = [];

        while (picked.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            picked.push(pool[index]);
            pool.splice(index, 1);
        }

        return picked;
    }
}
