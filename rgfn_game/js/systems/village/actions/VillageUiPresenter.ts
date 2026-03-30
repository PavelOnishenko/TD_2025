import Player from '../../../entities/player/Player.js';
import Item from '../../../entities/Item.js';
import { VillageNpcProfile } from '../VillageDialogueEngine.js';
import { VillageOffer, VillageUI } from './VillageActionsTypes.js';

type PresenterDeps = {
    player: Player;
    villageUI: VillageUI;
    gameLog: HTMLElement;
    onSelectNpc: (index: number) => void;
    getOffers: () => VillageOffer[];
    getSelectedNpc: () => VillageNpcProfile | null;
    getSellPrice: (item: Item) => number;
    isInnkeeper: (role: string) => boolean;
};

export default class VillageUiPresenter {
    private deps: PresenterDeps;

    constructor(deps: PresenterDeps) {
        this.deps = deps;
    }

    public openDialogueWindow(): void {
        this.deps.villageUI.dialogueModal.classList.remove('hidden');
    }

    public closeDialogueWindow(): void {
        this.deps.villageUI.dialogueModal.classList.add('hidden');
    }

    public addLog(message: string, type: string = 'system'): void {
        this.appendLogLine(this.deps.gameLog, message, type);
        this.appendLogLine(this.deps.villageUI.dialogueLog, message, type);
        this.deps.gameLog.scrollTop = this.deps.gameLog.scrollHeight;
        this.deps.villageUI.dialogueLog.scrollTop = this.deps.villageUI.dialogueLog.scrollHeight;
    }

    public updateButtons(): void {
        this.updateBuyButtons();
        this.refreshSellOptions();
        this.deps.villageUI.sellSelectedBtn.disabled = this.deps.villageUI.sellSelect.disabled;
        const selectedNpc = this.deps.getSelectedNpc();
        const hasSelectedNpc = selectedNpc !== null;
        this.deps.villageUI.openDialogueBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.askVillageBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.askPersonBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.askBarterBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.barterNowBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.sleepRoomBtn.disabled = !hasSelectedNpc || !this.deps.isInnkeeper(selectedNpc?.role ?? '');
    }

    public renderNpcButtons(npcRoster: VillageNpcProfile[], selectedNpcId: string | null): void {
        this.deps.villageUI.npcList.innerHTML = '';
        npcRoster.forEach((npc, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'action-btn village-npc-btn';
            button.textContent = `${npc.name} (${npc.role})`;
            if (selectedNpcId === npc.id) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => this.deps.onSelectNpc(index));
            this.deps.villageUI.npcList.appendChild(button);
        });
    }

    public updateNpcPanel(npc: VillageNpcProfile | null): void {
        if (!npc) {
            this.deps.villageUI.npcTitle.textContent = 'Choose someone to talk to';
            this.deps.villageUI.dialogueSelectedNpc.textContent = 'Select an NPC in the village rumors panel first.';
            return;
        }

        this.deps.villageUI.npcTitle.textContent = `${npc.name}, ${npc.role} — ${npc.speechStyle}`;
        this.deps.villageUI.dialogueSelectedNpc.textContent = `Speaking with ${npc.name}, ${npc.role}.`;
    }

    private updateBuyButtons(): void {
        const buyButtons = [this.deps.villageUI.buyOffer1Btn, this.deps.villageUI.buyOffer2Btn, this.deps.villageUI.buyOffer3Btn, this.deps.villageUI.buyOffer4Btn];

        buyButtons.forEach((button, index) => {
            const offer = this.deps.getOffers()[index];
            if (!offer) {
                button.disabled = true;
                button.textContent = 'Unavailable';
                return;
            }

            const canAfford = this.deps.player.gold >= offer.buyPrice;
            button.disabled = !canAfford;
            button.textContent = `Buy ${offer.kindName} (${offer.buyPrice}g) · random tier`;
        });
    }

    private refreshSellOptions(): void {
        const selectedValue = this.deps.villageUI.sellSelect.value;
        const inventory = this.deps.player.getInventory();
        this.deps.villageUI.sellSelect.innerHTML = '';
        inventory.forEach((item, index) => this.appendSellOption(item, index));

        if (this.deps.villageUI.sellSelect.options.length === 0) {
            this.appendNoSellOption();
            this.deps.villageUI.sellSelect.disabled = true;
            return;
        }

        this.deps.villageUI.sellSelect.disabled = false;
        const hasPreviousSelection = Array.from(this.deps.villageUI.sellSelect.options)
            .some((option) => option.value === selectedValue);
        this.deps.villageUI.sellSelect.value = hasPreviousSelection
            ? selectedValue
            : this.deps.villageUI.sellSelect.options[0].value;
    }

    private appendSellOption(item: Item, index: number): void {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${item.name} (+${this.deps.getSellPrice(item)}g)`;
        this.deps.villageUI.sellSelect.appendChild(option);
    }

    private appendNoSellOption(): void {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'No inventory items to sell';
        this.deps.villageUI.sellSelect.appendChild(placeholder);
    }

    private appendLogLine(container: HTMLElement, message: string, type: string): void {
        const line = document.createElement('div');
        line.textContent = message;
        line.classList.add(`${type}-action`);
        container.appendChild(line);
    }
}
