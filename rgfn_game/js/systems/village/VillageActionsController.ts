import Player from '../../entities/player/Player.js';
import VillageDialogueEngine, { VillageNpcProfile } from './VillageDialogueEngine.js';
import VillageBarterService from './actions/VillageBarterService.js';
import VillageStockService from './actions/VillageStockService.js';
import VillageUiPresenter from './actions/VillageUiPresenter.js';
import VillageTradeInteractionService from './actions/VillageTradeInteractionService.js';
import VillageDialogueInteractionService from './actions/VillageDialogueInteractionService.js';
import { QuestBarterContract, QuestEscortContract, VillageActionsCallbacks, VillageUI } from './actions/VillageActionsTypes.js';

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
    private escortContracts: QuestEscortContract[] = [];
    private knownNpcNames: Set<string> = new Set();

    constructor(player: Player, villageUI: VillageUI, gameLog: HTMLElement, callbacks: VillageActionsCallbacks) {
        this.villageUI = villageUI;
        this.callbacks = callbacks;
        this.uiPresenter = this.createVillageUiPresenter(player, villageUI, gameLog);
        this.tradeInteraction = this.createTradeInteraction(player, callbacks);
        this.dialogueInteraction = this.createDialogueInteraction(player, villageUI, callbacks);
    }

    public enterVillage(villageName: string): void {
        this.currentVillageName = villageName;
        this.barterService.assignQuestBarterContractsIfNeeded(villageName);
        this.stockService.refreshVillageStock();
        this.npcRoster = this.getOrCreateVillageNpcRoster(villageName);
        this.selectedNpcId = null;
        this.prepareVillageUiForEntry(villageName);
        this.handleEnter(villageName);
        this.logVillageContractHints(villageName);
        this.refreshDialogueTargetOptions();
    }

    public configureQuestBarterContracts(contracts: QuestBarterContract[]): void {
        this.barterService.configureQuestBarterContracts(contracts);
        this.refreshDialogueTargetOptions();
    }
    public configureQuestEscortContracts = (contracts: QuestEscortContract[]): void => {
        this.escortContracts = contracts;
        this.refreshDialogueTargetOptions();
    };
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
    public handleDoctorTreatment(): void { this.tradeInteraction.handleDoctorTreatment(); }
    public handleInnMeal(): void { this.tradeInteraction.handleInnMeal(); }
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
        this.knownNpcNames.add(npc.name);
        this.refreshNpcUi();
        this.addLog(`You approach ${npc.name} the ${npc.role}.`, 'player');
        this.addLog(`${npc.name} looks ${npc.look} and speaks in a ${npc.speechStyle} manner.`, 'system-message');
        this.callbacks.onAdvanceTime(8, 0.12);
    }

    public handleAskAboutSettlement(): void { this.dialogueInteraction.handleAskAboutSettlement(); this.callbacks.onAdvanceTime(14, 0.1); }
    public handleAskAboutNearbySettlements(): void { this.dialogueInteraction.handleAskAboutNearbySettlements(); }
    public handleAskAboutPerson(): void { this.dialogueInteraction.handleAskAboutPerson(); this.callbacks.onAdvanceTime(14, 0.1); }
    public handleAskAboutBarter(): void { this.dialogueInteraction.handleAskAboutBarter(); this.callbacks.onAdvanceTime(16, 0.12); }
    public handleConfirmBarter(): void { this.dialogueInteraction.handleConfirmBarter(); this.callbacks.onAdvanceTime(18, 0.15); }
    public handleRecruitEscort(): void {
        const npc = this.getSelectedNpc();
        if (!npc) {
            this.addLog('Choose an NPC first before inviting anyone to your group.', 'system');
            return;
        }
        const status = this.callbacks.onTryRecruitEscort(npc.name, this.currentVillageName);
        if (status === 'joined') {
            this.addLog(`${npc.name} agrees to travel with you. Escort objective updated.`, 'system');
            this.callbacks.onAdvanceTime(20, 0.15);
            return;
        }
        if (status === 'already-joined') {
            this.addLog(`${npc.name} is already traveling with you.`, 'system-message');
            return;
        }
        this.addLog(`${npc.name} has no escort contract to join from this village.`, 'system-message');
    }
    public handleLeave(): void { this.addLog('You leave the village.', 'system'); this.callbacks.onAdvanceTime(5, 0.08); this.callbacks.onLeaveVillage(); }
    public addLog(message: string, type: string = 'system'): void { this.uiPresenter.addLog(message, type); }
    public updateButtons(): void { this.uiPresenter.updateButtons(); }

    private prepareVillageUiForEntry(villageName: string): void {
        this.villageUI.title.textContent = `Village: ${villageName}`;
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.closeDialogueWindow();
        this.villageUI.dialogueLog.innerHTML = '';
        this.addLog(`You arrive at ${villageName}.`, 'system');
    }

    private logVillageContractHints(villageName: string): void {
        this.barterService.getVillageContractHints(villageName).forEach((hint) => this.addLog(`Rumor update: ${hint}`, 'system-message'));
    }

    private createVillageUiPresenter = (player: Player, villageUI: VillageUI, gameLog: HTMLElement): VillageUiPresenter => new VillageUiPresenter({
        player,
        villageUI,
        gameLog,
        onSelectNpc: (index) => this.handleSelectNpc(index),
        getOffers: () => this.stockService.getCurrentOffers(),
        getSelectedNpc: () => this.getSelectedNpc(),
        getSellPrice: (item) => this.stockService.getSellPrice(item),
        isInnkeeper: (role) => this.isInnkeeper(role),
    });

    private createTradeInteraction = (player: Player, callbacks: VillageActionsCallbacks): VillageTradeInteractionService => new VillageTradeInteractionService({
        player,
        callbacks,
        stockService: this.stockService,
        getSelectedNpc: () => this.getSelectedNpc(),
        addLog: (message, type) => this.addLog(message, type),
        updateButtons: () => this.updateButtons(),
    });

    private createDialogueInteraction = (
        player: Player,
        villageUI: VillageUI,
        callbacks: VillageActionsCallbacks,
    ): VillageDialogueInteractionService => new VillageDialogueInteractionService({
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

    private refreshNpcUi(): void {
        this.uiPresenter.renderNpcButtons(this.npcRoster, this.selectedNpcId);
        this.uiPresenter.updateNpcPanel(this.getSelectedNpc());
        this.npcRoster.forEach((npc) => this.knownNpcNames.add(npc.name));
        this.refreshDialogueTargetOptions();
        this.updateButtons();
    }

    private getOrCreateVillageNpcRoster(villageName: string): VillageNpcProfile[] {
        const cachedRoster = this.villageNpcRosters.get(villageName);
        if (cachedRoster) {
            return cachedRoster;
        }

        const roster = this.dialogueEngine.createNpcRoster(villageName);
        this.barterService.getVillageContractTraders(villageName).forEach((traderName) => this.appendTraderIfMissing(roster, villageName, traderName));
        this.escortContracts
            .filter((contract) => contract.sourceVillage.trim().toLocaleLowerCase() === villageName.trim().toLocaleLowerCase())
            .forEach((contract) => this.appendEscortIfMissing(roster, villageName, contract));
        this.villageNpcRosters.set(villageName, roster);
        return roster;
    }

    private appendEscortIfMissing(roster: VillageNpcProfile[], villageName: string, contract: QuestEscortContract): void {
        const exists = roster.some((npc) => npc.name.toLocaleLowerCase() === contract.personName.toLocaleLowerCase());
        if (exists) {
            return;
        }

        roster.unshift({
            id: `${villageName.toLowerCase()}-${contract.personName.toLocaleLowerCase()}-escort`,
            name: contract.personName,
            role: `Escort to ${contract.destinationVillage}`,
            look: 'travel cloak, packed satchel, alert posture',
            speechStyle: 'focused and practical',
            disposition: 'truthful',
        });
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

    private refreshDialogueTargetOptions(): void {
        this.populateSelectWithOptions(this.villageUI.askVillageInput, this.getKnownSettlementNames(), 'Choose known settlement');
        this.populateSelectWithOptions(this.villageUI.askPersonInput, this.getKnownPersonNames(), 'Choose known person');
    }

    private getKnownSettlementNames(): string[] {
        const knownFromMap = this.callbacks.getKnownSettlementNames?.() ?? [];
        const fromBarterContracts = this.barterService
            .getKnownTraderNames()
            .map((traderName) => this.barterService.getPersonDirectionHint(traderName, this.callbacks.getVillageDirectionHint).villageName)
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        const fromEscortContracts = this.escortContracts.flatMap((contract) => [contract.sourceVillage, contract.destinationVillage]);
        return this.toSortedUnique([...knownFromMap, ...fromBarterContracts, ...fromEscortContracts]);
    }

    private getKnownPersonNames(): string[] {
        const fromBarter = this.barterService.getKnownTraderNames();
        const fromEscort = this.escortContracts.map((contract) => contract.personName);
        const fromNpcRoster = Array.from(this.knownNpcNames);
        return this.toSortedUnique([...fromBarter, ...fromEscort, ...fromNpcRoster]);
    }

    private populateSelectWithOptions(select: HTMLSelectElement, values: string[], placeholder: string): void {
        const existingValue = select.value;
        select.innerHTML = '';

        if (values.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = placeholder;
            select.appendChild(option);
            return;
        }

        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        const hasPreviousSelection = values.some((value) => value === existingValue);
        select.value = hasPreviousSelection ? existingValue : values[0];
    }

    private toSortedUnique(values: string[]): string[] {
        return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)))
            .sort((left, right) => left.localeCompare(right));
    }
}
