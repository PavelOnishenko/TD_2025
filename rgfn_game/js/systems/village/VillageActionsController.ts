import Player from '../../entities/player/Player.js';
import VillageDialogueEngine, { VillageNpcProfile } from './VillageDialogueEngine.js';
import VillageBarterService from './actions/VillageBarterService.js';
import VillageStockService from './actions/VillageStockService.js';
import VillageUiPresenter from './actions/VillageUiPresenter.js';
import VillageTradeInteractionService from './actions/VillageTradeInteractionService.js';
import VillageDialogueInteractionService from './actions/VillageDialogueInteractionService.js';
import { QuestBarterContract, VillageActionsCallbacks, VillageUI } from './actions/VillageActionsTypes.js';

export default class VillageActionsController {
    private readonly villageUI: VillageUI;
    private readonly callbacks: VillageActionsCallbacks;
    private readonly dialogueEngine = new VillageDialogueEngine();
    private readonly stockService = new VillageStockService();
    private readonly barterService = new VillageBarterService();
    private readonly uiPresenter: VillageUiPresenter;
    private readonly tradeInteraction: VillageTradeInteractionService;
    private readonly dialogueInteraction: VillageDialogueInteractionService;
    private currentVillageName = '';
    private npcRoster: VillageNpcProfile[] = [];
    private villageNpcRosters: Map<string, VillageNpcProfile[]> = new Map();
    private selectedNpcId: string | null = null;

    constructor(player: Player, villageUI: VillageUI, gameLog: HTMLElement, callbacks: VillageActionsCallbacks) {
        this.villageUI = villageUI;
        this.callbacks = callbacks;
        this.uiPresenter = new VillageUiPresenter({
            player,
            villageUI,
            gameLog,
            onSelectNpc: (index) => this.handleSelectNpc(index),
            getOffers: () => this.stockService.getCurrentOffers(),
            getSelectedNpc: () => this.getSelectedNpc(),
            getSellPrice: (item) => this.stockService.getSellPrice(item),
            isInnkeeper: (role) => this.isInnkeeper(role),
        });
        this.tradeInteraction = new VillageTradeInteractionService({
            player,
            callbacks,
            stockService: this.stockService,
            getSelectedNpc: () => this.getSelectedNpc(),
            addLog: (message, type) => this.addLog(message, type),
            updateButtons: () => this.updateButtons(),
        });
        this.dialogueInteraction = new VillageDialogueInteractionService({
            player,
            villageUI,
            callbacks,
            dialogueEngine: this.dialogueEngine,
            barterService: this.barterService,
            getCurrentVillageName: () => this.currentVillageName,
            getSelectedNpc: () => this.getSelectedNpc(),
            addLog: (message, type) => this.addLog(message, type),
            describeDistance: (distanceCells) => this.describeDistance(distanceCells),
            updateButtons: () => this.updateButtons(),
        });
    }

    public enterVillage(villageName: string): void {
        this.currentVillageName = villageName;
        this.barterService.assignQuestBarterContractsIfNeeded(villageName);
        this.villageUI.title.textContent = `Village: ${villageName}`;
        this.stockService.refreshVillageStock();
        this.npcRoster = this.getOrCreateVillageNpcRoster(villageName);
        this.selectedNpcId = null;
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.closeDialogueWindow();
        this.villageUI.dialogueLog.innerHTML = '';
        this.addLog(`You arrive at ${villageName}.`, 'system');
        this.handleEnter(villageName);
        this.barterService.getVillageContractHints(villageName).forEach((hint) => this.addLog(`Rumor update: ${hint}`, 'system-message'));
    }

    public configureQuestBarterContracts(contracts: QuestBarterContract[]): void { this.barterService.configureQuestBarterContracts(contracts); }
    public exitVillage(): void { this.villageUI.sidebar.classList.add('hidden'); this.closeDialogueWindow(); }
    public handleEnter(villageName: string): void {
        this.addLog(`You enter ${villageName} market square.`, 'system');
        this.addLog('This village offers one potion type and three random item kinds.', 'system');
        this.addLog(`You notice ${this.npcRoster.length} locals open for conversation.`, 'system');
        this.refreshNpcUi();
    }

    public openDialogueWindow(): void {
        if (!this.getSelectedNpc()) {
            this.addLog('Choose an NPC first before opening a dialogue window.', 'system');
            return;
        }
        this.uiPresenter.openDialogueWindow();
    }

    public closeDialogueWindow(): void { this.uiPresenter.closeDialogueWindow(); }
    public handleSkip(): void { this.addLog('You decide not to enter and continue your journey.', 'system'); this.callbacks.onLeaveVillage(); }
    public handleWait(): void { this.tradeInteraction.handleWait(); }
    public handleSleepInRoom(): void { this.tradeInteraction.handleSleepInRoom(); }
    public handleBuyOffer(offerIndex: number): void { this.tradeInteraction.handleBuyOffer(offerIndex); }
    public handleSellSelected(): void { this.tradeInteraction.handleSellSelected(Number.parseInt(this.villageUI.sellSelect.value, 10)); }

    public handleSelectNpc(index: number): void {
        const npc = this.npcRoster[index];
        if (!npc) {
            this.addLog('No one with that description is nearby.', 'system');
            return;
        }

        this.selectedNpcId = npc.id;
        this.refreshNpcUi();
        this.addLog(`You approach ${npc.name} the ${npc.role}.`, 'player');
        this.addLog(`${npc.name} looks ${npc.look} and speaks in a ${npc.speechStyle} manner.`, 'system-message');
    }

    public handleAskAboutSettlement(): void { this.dialogueInteraction.handleAskAboutSettlement(); }
    public handleAskAboutPerson(): void { this.dialogueInteraction.handleAskAboutPerson(); }
    public handleAskAboutBarter(): void { this.dialogueInteraction.handleAskAboutBarter(); }
    public handleConfirmBarter(): void { this.dialogueInteraction.handleConfirmBarter(); }
    public handleLeave(): void { this.addLog('You leave the village.', 'system'); this.callbacks.onLeaveVillage(); }
    public addLog(message: string, type: string = 'system'): void { this.uiPresenter.addLog(message, type); }
    public updateButtons(): void { this.uiPresenter.updateButtons(); }

    private refreshNpcUi(): void {
        this.uiPresenter.renderNpcButtons(this.npcRoster, this.selectedNpcId);
        this.uiPresenter.updateNpcPanel(this.getSelectedNpc());
        this.updateButtons();
    }

    private getOrCreateVillageNpcRoster(villageName: string): VillageNpcProfile[] {
        const cachedRoster = this.villageNpcRosters.get(villageName);
        if (cachedRoster) {
            return cachedRoster;
        }

        const roster = this.dialogueEngine.createNpcRoster(villageName);
        this.barterService.getVillageContractTraders(villageName).forEach((traderName) => this.appendTraderIfMissing(roster, villageName, traderName));
        this.villageNpcRosters.set(villageName, roster);
        return roster;
    }

    private appendTraderIfMissing(roster: VillageNpcProfile[], villageName: string, traderName: string): void {
        const exists = roster.some((npc) => npc.name.toLocaleLowerCase() === traderName.toLocaleLowerCase());
        if (exists) {
            return;
        }

        roster.unshift({
            id: `${villageName.toLowerCase()}-${traderName.toLocaleLowerCase()}`,
            name: traderName,
            role: 'Barter Broker',
            look: 'emerald scarf, ledger satchel, watchful eyes',
            speechStyle: 'steady and transactional',
            disposition: 'truthful',
        });
    }

    private getSelectedNpc(): VillageNpcProfile | null {
        if (!this.selectedNpcId) {
            return null;
        }

        return this.npcRoster.find((npc) => npc.id === this.selectedNpcId) ?? null;
    }

    private isInnkeeper(role: string): boolean {
        const normalized = role.trim().toLocaleLowerCase();
        return normalized.includes('innkeeper') || normalized.includes('tavern') || normalized.includes('host');
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
}
