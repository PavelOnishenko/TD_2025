import Player from '../../../entities/player/Player.js';
import { createItemById } from '../../../entities/Item.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import VillageStockService from './VillageStockService.js';
import { VillageActionsCallbacks } from './VillageActionsTypes.js';
import { VillageNpcProfile } from '../VillageDialogueEngine.js';

type TradeDeps = {
    player: Player;
    callbacks: VillageActionsCallbacks;
    stockService: VillageStockService;
    getSelectedNpc: () => VillageNpcProfile | null;
    addLog: (message: string, type?: string) => void;
    updateButtons: () => void;
};

export default class VillageTradeInteractionService {
    private deps: TradeDeps;

    constructor(deps: TradeDeps) {
        this.deps = deps;
    }

    public handleWait(): void {
        this.deps.player.heal(1);
        this.deps.player.restoreMana(1);
        this.deps.addLog('You wait at the inn and recover 1 HP and 1 mana.', 'player');
        this.deps.callbacks.onUpdateHUD();
    }

    public handleSleepInRoom(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc || !this.isInnkeeper(selectedNpc.role)) {
            this.deps.addLog('To rent a safe room, speak with an innkeeper first.', 'system');
            return;
        }

        const roomCost = balanceConfig.survival.innRoomCostGold;
        if (this.deps.player.gold < roomCost) {
            this.deps.addLog(`Room costs ${roomCost}g. You need more gold.`, 'system');
            return;
        }

        this.deps.player.gold -= roomCost;
        const recovered = this.deps.player.recoverFatigue(balanceConfig.survival.villageSleepFatigueRecovery);
        this.deps.player.heal(2);
        this.deps.player.restoreMana(2);
        this.deps.addLog(`${selectedNpc.name} rents you a room for ${roomCost}g. Safe sleep restores ${Math.round(recovered)} fatigue.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    public handleBuyOffer(offerIndex: number): void {
        const offer = this.deps.stockService.getOffer(offerIndex);
        if (!offer) {
            this.deps.addLog('This offer is not available.', 'system');
            return;
        }

        if (this.deps.player.gold < offer.buyPrice) {
            this.deps.addLog(`Not enough gold. ${offer.kindName} costs ${offer.buyPrice}g.`, 'system');
            return;
        }

        const itemId = offer.possibleItemIds[Math.floor(Math.random() * offer.possibleItemIds.length)];
        const item = createItemById(itemId);
        if (!item) {
            this.deps.addLog('The merchant cannot find that item right now.', 'system');
            return;
        }

        if (!this.deps.player.addItemToInventory(item)) {
            this.deps.addLog('Inventory full. Sell something first.', 'system');
            return;
        }

        this.deps.player.gold -= offer.buyPrice;
        this.deps.addLog(`You buy ${offer.kindName} (${offer.buyPrice}g) and receive: ${item.name}.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    public handleSellSelected(selectedIndex: number): void {
        if (!Number.isFinite(selectedIndex)) {
            this.deps.addLog('Choose an inventory item to sell.', 'system');
            return;
        }

        const removedItem = this.deps.player.removeInventoryItemAt(selectedIndex);
        if (!removedItem) {
            this.deps.addLog('That item is no longer available.', 'system');
            this.deps.updateButtons();
            return;
        }

        const sellPrice = this.deps.stockService.getSellPrice(removedItem);
        this.deps.player.gold += sellPrice;
        this.deps.addLog(`You sold ${removedItem.name} for ${sellPrice}g.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    private isInnkeeper(role: string): boolean {
        const normalized = role.trim().toLocaleLowerCase();
        return normalized.includes('innkeeper') || normalized.includes('tavern') || normalized.includes('host');
    }
}
