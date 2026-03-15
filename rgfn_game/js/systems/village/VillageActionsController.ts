import Player from '../../entities/Player.js';
import Item, { BOW_ITEM, HEALING_POTION_ITEM, MANA_POTION_ITEM } from '../../entities/Item.js';

const VILLAGE_BOW_BUY_PRICE = 15;
const VILLAGE_BOW_SELL_PRICE = 8;
const VILLAGE_HEALING_POTION_BUY_PRICE = 4;
const VILLAGE_HEALING_POTION_SELL_PRICE = 2;
const VILLAGE_MANA_POTION_BUY_PRICE = 5;
const VILLAGE_MANA_POTION_SELL_PRICE = 3;

type VillageUI = {
    sidebar: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    log: HTMLElement;
    buyBtn: HTMLButtonElement;
    sellBtn: HTMLButtonElement;
    buyPotionBtn: HTMLButtonElement;
    sellPotionBtn: HTMLButtonElement;
    buyManaPotionBtn: HTMLButtonElement;
    sellManaPotionBtn: HTMLButtonElement;
};

type VillageActionsCallbacks = {
    onUpdateHUD: () => void;
    onLeaveVillage: () => void;
};

export default class VillageActionsController {
    private player: Player;
    private villageUI: VillageUI;
    private callbacks: VillageActionsCallbacks;

    constructor(player: Player, villageUI: VillageUI, callbacks: VillageActionsCallbacks) {
        this.player = player;
        this.villageUI = villageUI;
        this.callbacks = callbacks;
    }

    public enterVillage(villageName: string): void {
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.remove('hidden');
        this.villageUI.actions.classList.add('hidden');
        this.villageUI.log.innerHTML = '';
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

    public handleBuyBow(): void {
        if (this.player.equippedWeapon?.name === 'Bow') {
            this.addLog('You already have a bow equipped.', 'system');
            return;
        }

        if (this.player.gold < VILLAGE_BOW_BUY_PRICE) {
            this.addLog(`Not enough gold. Bow costs ${VILLAGE_BOW_BUY_PRICE}.`, 'system');
            return;
        }

        const addedToInventory = this.player.addItemToInventory(new Item(BOW_ITEM));
        if (!addedToInventory) {
            this.addLog('Inventory full. You cannot buy the bow.', 'system');
            return;
        }

        this.player.gold -= VILLAGE_BOW_BUY_PRICE;
        this.addLog(`You bought a Bow for ${VILLAGE_BOW_BUY_PRICE} gold.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleSellBow(): void {
        const weapon = this.player.equippedWeapon;
        if (!weapon || weapon.name !== 'Bow') {
            this.addLog('You have no bow to sell.', 'system');
            return;
        }

        this.player.unequipWeapon();
        this.player.gold += VILLAGE_BOW_SELL_PRICE;
        this.addLog(`You sold your Bow for ${VILLAGE_BOW_SELL_PRICE} gold.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleBuyPotion(): void {
        if (this.player.gold < VILLAGE_HEALING_POTION_BUY_PRICE) {
            this.addLog(`Not enough gold. Healing Potion costs ${VILLAGE_HEALING_POTION_BUY_PRICE}.`, 'system');
            return;
        }

        const wasAdded = this.player.addItemToInventory(new Item(HEALING_POTION_ITEM));
        if (!wasAdded) {
            this.addLog('Your inventory is full. Cannot buy a Healing Potion.', 'system');
            return;
        }

        this.player.gold -= VILLAGE_HEALING_POTION_BUY_PRICE;
        this.addLog(`You bought a Healing Potion for ${VILLAGE_HEALING_POTION_BUY_PRICE} gold.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleSellPotion(): void {
        const soldPotion = this.player.removeHealingPotionFromInventory();
        if (!soldPotion) {
            this.addLog('You have no Healing Potion to sell.', 'system');
            return;
        }

        this.player.gold += VILLAGE_HEALING_POTION_SELL_PRICE;
        this.addLog(`You sold a Healing Potion for ${VILLAGE_HEALING_POTION_SELL_PRICE} gold.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleBuyManaPotion(): void {
        if (this.player.gold < VILLAGE_MANA_POTION_BUY_PRICE) {
            this.addLog(`Not enough gold. Mana Potion costs ${VILLAGE_MANA_POTION_BUY_PRICE}.`, 'system');
            return;
        }

        const wasAdded = this.player.addItemToInventory(new Item(MANA_POTION_ITEM));
        if (!wasAdded) {
            this.addLog('Your inventory is full. Cannot buy a Mana Potion.', 'system');
            return;
        }

        this.player.gold -= VILLAGE_MANA_POTION_BUY_PRICE;
        this.addLog(`You bought a Mana Potion for ${VILLAGE_MANA_POTION_BUY_PRICE} gold.`, 'player');
        this.callbacks.onUpdateHUD();
        this.updateButtons();
    }

    public handleSellManaPotion(): void {
        const soldPotion = this.player.removeManaPotionFromInventory();
        if (!soldPotion) {
            this.addLog('You have no Mana Potion to sell.', 'system');
            return;
        }

        this.player.gold += VILLAGE_MANA_POTION_SELL_PRICE;
        this.addLog(`You sold a Mana Potion for ${VILLAGE_MANA_POTION_SELL_PRICE} gold.`, 'player');
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
        this.villageUI.log.appendChild(line);
        this.villageUI.log.scrollTop = this.villageUI.log.scrollHeight;
    }

    public updateButtons(): void {
        const hasBowEquipped = this.player.equippedWeapon?.name === 'Bow';
        const canAffordBow = this.player.gold >= VILLAGE_BOW_BUY_PRICE;
        const hpPotionCount = this.player.getHealingPotionCount();
        const manaPotionCount = this.player.getManaPotionCount();

        this.villageUI.buyBtn.disabled = hasBowEquipped || !canAffordBow;
        this.villageUI.sellBtn.disabled = !hasBowEquipped;
        this.villageUI.buyPotionBtn.disabled = this.player.gold < VILLAGE_HEALING_POTION_BUY_PRICE;
        this.villageUI.sellPotionBtn.disabled = hpPotionCount === 0;
        this.villageUI.buyManaPotionBtn.disabled = this.player.gold < VILLAGE_MANA_POTION_BUY_PRICE;
        this.villageUI.sellManaPotionBtn.disabled = manaPotionCount === 0;
    }
}
