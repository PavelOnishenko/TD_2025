/* eslint-disable style-guide/file-length-error */
import Player from '../../entities/player/Player.js';
import VillageDialogueEngine, { VillageNpcProfile } from './VillageDialogueEngine.js';
import VillageBarterService from './actions/VillageBarterService.js';
import VillageStockService from './actions/VillageStockService.js';
import VillageUiPresenter from './actions/VillageUiPresenter.js';
import VillageTradeInteractionService from './actions/VillageTradeInteractionService.js';
import VillageDialogueInteractionService from './actions/VillageDialogueInteractionService.js';
import { QuestBarterContract, QuestDefendContract, QuestEscortContract, VillageActionsCallbacks, VillageUI } from './actions/VillageActionsTypes.js';
import { isDeveloperModeEnabled } from '../../utils/DeveloperModeConfig.js';
import { QuestNode } from '../quest/QuestTypes.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
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
    private defendContracts: QuestDefendContract[] = [];
    private activeNpcSideQuestIds: Set<string> = new Set();
    private knownNpcNames: Set<string> = new Set();
    private joinedEscortNpcKeys: Set<string> = new Set();

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
    public configureQuestDefendContracts = (contracts: QuestDefendContract[]): void => {
        this.defendContracts = contracts;
        this.villageNpcRosters.forEach((roster, villageName) => this.ensureQuestPeoplePresent(roster, villageName));
        if (this.currentVillageName.trim()) {
            this.npcRoster = this.getOrCreateVillageNpcRoster(this.currentVillageName);
            this.refreshNpcUi();
        }
    };
    public exitVillage(): void {
        this.villageUI.sidebar.classList.add('hidden');
        this.villageUI.actions.classList.add('hidden');
        this.villageUI.rumorsPanel.classList.add('hidden');
        this.closeDialogueWindow();
    }
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
    public handleVillageWait(): void { this.tradeInteraction.handleVillageWait(); }
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
        this.addRecoverLeadFromNpc(npc);
        this.handleSelectedNpcSideQuests(npc);
        this.callbacks.onAdvanceTime(8, 0.12);
    }

    public handleAskAboutSettlement(): void { this.dialogueInteraction.handleAskAboutSettlement(); this.callbacks.onAdvanceTime(14, 0.1); }
    public handleAskAboutNearbySettlements(): void { this.dialogueInteraction.handleAskAboutNearbySettlements(); }
    public handleAskAboutPerson(): void { this.dialogueInteraction.handleAskAboutPerson(); this.callbacks.onAdvanceTime(14, 0.1); }
    public handleAskAboutBarter(): void { this.dialogueInteraction.handleAskAboutBarter(); this.callbacks.onAdvanceTime(16, 0.12); }
    public handleConfirmBarter(): void { this.dialogueInteraction.handleConfirmBarter(); this.callbacks.onAdvanceTime(18, 0.15); }
    public handleConfrontRecoverTarget(): void { this.dialogueInteraction.handleConfrontRecoverTarget(); this.callbacks.onAdvanceTime(18, 0.15); }
    // eslint-disable-next-line style-guide/function-length-warning
    public handleStartDefendObjective(): void {
        const npc = this.getSelectedNpc();
        if (!npc) {
            this.addLog('Choose an NPC before committing to village defense duty.', 'system');
            return;
        }
        const status = this.callbacks.onTryStartDefend?.(npc.name, this.currentVillageName, this.npcRoster.map((villager) => villager.name))
            ?? { status: 'inactive' as const };
        if (status.status === 'started') {
            this.addLog(`You tell ${npc.name}: "I am ready to defend you as we agreed upon earlier."`, 'player');
            this.addLog(`${npc.name}: "Hold this village for ${status.days ?? '?'} days while we secure the artifact."`, 'system');
            this.callbacks.onAdvanceTime(20, 0.15);
            this.updateButtons();
            return;
        }
        if (status.status === 'already-active') {
            this.addLog(`${npc.name} says the defense operation is already underway. Stay in the village and keep watch.`, 'system-message');
            return;
        }
        this.addLog(`${npc.name} has no defense assignment for you in this village.`, 'system-message');
    }
    // eslint-disable-next-line style-guide/function-length-warning
    public handleRecruitEscort(): void {
        const npc = this.getSelectedNpc();
        if (!npc) {
            this.addLog('Choose an NPC first before inviting anyone to your group.', 'system');
            return;
        }
        const status = this.callbacks.onTryRecruitEscort(npc.name, this.currentVillageName);
        if (status === 'joined') {
            this.joinedEscortNpcKeys.add(this.getEscortNpcKey(npc.name, this.currentVillageName));
            this.addLog(`${npc.name} agrees to travel with you. Escort objective updated.`, 'system');
            this.updateButtons();
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
        this.villageUI.sidebar.classList.add('hidden');
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.villageUI.rumorsPanel.classList.remove('hidden');
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
        shouldShowAskBarterAction: (npcName) => this.hasActiveBarterDealForNpc(npcName),
        shouldShowBarterNowAction: (npcName) => this.hasActiveBarterDealForNpc(npcName),
        shouldShowConfrontRecoverAction: (npcName, villageName) => this.canConfrontRecoverTarget(npcName, villageName),
        shouldShowRecruitEscortAction: (npcName, villageName) => this.canRecruitEscort(npcName, villageName),
        shouldShowDefendAction: (npcName, villageName) => this.canStartDefendObjective(npcName, villageName),
        getCurrentVillageName: () => this.currentVillageName,
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
            this.ensureQuestPeoplePresent(cachedRoster, villageName);
            return cachedRoster;
        }

        const roster = this.dialogueEngine.createNpcRoster(villageName);
        this.ensureQuestPeoplePresent(roster, villageName);
        this.villageNpcRosters.set(villageName, roster);
        return roster;
    }

    private ensureQuestPeoplePresent(roster: VillageNpcProfile[], villageName: string): void {
        const unavailableNpcNames = this.getUnavailableNpcNames(villageName);
        this.removeUnavailableNpcs(roster, unavailableNpcNames);
        this.barterService.getVillageContractTraders(villageName).forEach((traderName) => this.appendTraderIfMissing(roster, villageName, traderName));
        this.escortContracts
            .filter((contract) => contract.sourceVillage.trim().toLocaleLowerCase() === villageName.trim().toLocaleLowerCase())
            .forEach((contract) => this.appendEscortIfMissing(roster, villageName, contract));
        this.defendContracts
            .filter((contract) => contract.villageName.trim().toLocaleLowerCase() === villageName.trim().toLocaleLowerCase())
            .forEach((contract) => this.appendDefendContactIfMissing(roster, villageName, contract, unavailableNpcNames));
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

    private appendDefendContactIfMissing(roster: VillageNpcProfile[], villageName: string, contract: QuestDefendContract, unavailableNpcNames: Set<string>): void {
        if (unavailableNpcNames.has(contract.personName.trim().toLocaleLowerCase())) {
            return;
        }
        const exists = roster.some((npc) => npc.name.toLocaleLowerCase() === contract.personName.toLocaleLowerCase());
        if (exists) {
            return;
        }
        roster.unshift({
            id: `${villageName.toLowerCase()}-${contract.personName.toLocaleLowerCase()}-defend`,
            name: contract.personName,
            role: `Artifact Custodian (${contract.artifactName})`,
            look: 'dusty gloves, encrypted satchel, sleepless eyes',
            speechStyle: 'urgent and strategic',
            disposition: 'truthful',
        });
    }

    private appendRecoverHolderIfMissing(roster: VillageNpcProfile[], villageName: string, personName: string, itemName: string): void {
        const exists = roster.some((npc) => npc.name.toLocaleLowerCase() === personName.toLocaleLowerCase());
        if (exists) {
            return;
        }

        roster.unshift({
            id: `${villageName.toLowerCase()}-${personName.toLocaleLowerCase()}-recover`,
            name: personName,
            role: `Wanted for ${itemName}`,
            look: 'hidden satchel, tense posture, restless eyes',
            speechStyle: 'guarded and hostile',
            disposition: 'liar',
        });
    }

    private getUnavailableNpcNames(villageName: string): Set<string> {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        return new Set(
            this.defendContracts
                .filter((contract) => contract.villageName.trim().toLocaleLowerCase() === normalizedVillage)
                .flatMap((contract) => contract.fallenDefenderNames ?? [])
                .map((name) => name.trim().toLocaleLowerCase())
                .filter((name) => name.length > 0),
        );
    }

    private removeUnavailableNpcs(roster: VillageNpcProfile[], unavailableNpcNames: Set<string>): void {
        if (unavailableNpcNames.size === 0) {
            return;
        }
        for (let index = roster.length - 1; index >= 0; index -= 1) {
            if (unavailableNpcNames.has(roster[index].name.trim().toLocaleLowerCase())) {
                roster.splice(index, 1);
            }
        }
        const selectedNpc = this.getSelectedNpc();
        if (selectedNpc && unavailableNpcNames.has(selectedNpc.name.trim().toLocaleLowerCase())) {
            this.selectedNpcId = null;
        }
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

    private hasActiveBarterDealForNpc(npcName: string): boolean {
        if (!npcName.trim() || !this.currentVillageName.trim()) {
            return false;
        }
        const deal = this.barterService.getBarterDealForNpc(this.currentVillageName, npcName);
        return Boolean(deal && !deal.isCompleted);
    }

    private canConfrontRecoverTarget(npcName: string, villageName: string): boolean {
        const selectedNpc = this.getSelectedNpc();
        if (!npcName.trim() || !villageName.trim() || !selectedNpc) {
            return false;
        }
        return selectedNpc.role.trim().toLocaleLowerCase().startsWith('wanted for ');
    }

    private canRecruitEscort(npcName: string, villageName: string): boolean {
        if (!npcName.trim() || !villageName.trim()) {
            return false;
        }
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const isEscortContractNpc = this.escortContracts.some((contract) =>
            contract.personName.trim().toLocaleLowerCase() === normalizedNpc
            && contract.sourceVillage.trim().toLocaleLowerCase() === normalizedVillage,
        );
        return isEscortContractNpc && !this.joinedEscortNpcKeys.has(this.getEscortNpcKey(npcName, villageName));
    }

    private getEscortNpcKey = (npcName: string, villageName: string): string => `${villageName.trim().toLocaleLowerCase()}::${npcName.trim().toLocaleLowerCase()}`;

    private canStartDefendObjective(npcName: string, villageName: string): boolean {
        if (!npcName.trim() || !villageName.trim() || !this.callbacks.onTryStartDefend) {
            return false;
        }
        const normalizedNpc = npcName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        return this.defendContracts.some((contract) =>
            contract.personName.trim().toLocaleLowerCase() === normalizedNpc
            && contract.villageName.trim().toLocaleLowerCase() === normalizedVillage,
        );
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private handleSelectedNpcSideQuests(npc: VillageNpcProfile): void {
        const offers = this.callbacks.getVillageSideQuestOffers?.(this.currentVillageName, npc.name) ?? [];
        if (offers.length === 0) {
            if (this.tryTurnInNpcSideQuest(npc)) {
                this.updateButtons();
            }
            return;
        }
        this.addLog(
            `${npc.name} can offer ${offers.length} side quest${offers.length === 1 ? '' : 's'}.`,
            'system-message',
        );
        offers.forEach((offer) => this.addLog(this.formatSideQuestOfferLine(offer), 'system-message'));
        const acceptedOffers = offers
            .map((offer) => ({ offer, result: this.callbacks.acceptSideQuest?.(offer.id) ?? { accepted: false, reason: 'inactive' as const } }))
            .filter(({ result }) => result.accepted)
            .map(({ offer }) => offer);
        acceptedOffers.forEach((quest) => {
            this.activeNpcSideQuestIds.add(quest.id);
            this.injectSideQuestNpcReferencesIntoNearbyRosters(quest);
            this.addLog(`New side quest accepted: ${quest.title}.`, 'system');
        });
        if (acceptedOffers.length > 0) {
            this.updateButtons();
        }
    }

    private formatSideQuestOfferLine(quest: QuestNode): string {
        const rewardSegment = quest.reward?.trim() ? ` Reward: ${quest.reward}.` : '';
        return `Offer — ${quest.title}: ${quest.description}.${rewardSegment}`;
    }

    private tryTurnInNpcSideQuest(npc: VillageNpcProfile): boolean {
        if (!this.callbacks.turnInSideQuest || this.activeNpcSideQuestIds.size === 0) {
            return false;
        }
        let turnedInAny = false;
        Array.from(this.activeNpcSideQuestIds).forEach((questId) => {
            const result = this.callbacks.turnInSideQuest?.(questId, npc.name, this.currentVillageName);
            if (!result?.turnedIn) {
                return;
            }
            turnedInAny = true;
            this.activeNpcSideQuestIds.delete(questId);
            this.addLog(
                `${npc.name} accepts your side-quest handoff for ${questId}.${result.reward ? ` Reward received: ${result.reward}.` : ''}`,
                'system',
            );
        });
        return turnedInAny;
    }

    private getKnownSettlementNames(): string[] {
        const knownFromMap = this.callbacks.getKnownSettlementNames?.() ?? [];
        const knownFromQuest = this.callbacks.getKnownQuestSettlementNames?.() ?? [];
        if (!isDeveloperModeEnabled()) {
            return this.toSortedUnique([...knownFromMap, ...knownFromQuest]);
        }
        const fromBarterContracts = this.barterService
            .getKnownTraderNames()
            .map((traderName) => this.barterService.getPersonDirectionHint(traderName, this.callbacks.getVillageDirectionHint).villageName)
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        const fromEscortContracts = this.escortContracts.flatMap((contract) => [contract.sourceVillage, contract.destinationVillage]);
        return this.toSortedUnique([...knownFromMap, ...knownFromQuest, ...fromBarterContracts, ...fromEscortContracts]);
    }

    private getKnownPersonNames(): string[] {
        const knownSettlements = this.buildNearbyKnownSettlementSet();
        const fromBarter = this.barterService.getKnownTraderNames().filter((traderName) => this.shouldIncludeTraderName(traderName, knownSettlements));
        const fromEscort = this.escortContracts.filter((contract) => this.shouldIncludeEscortContract(contract, knownSettlements)).map((contract) => contract.personName);
        const fromNpcRoster = Array.from(this.knownNpcNames);
        return this.toSortedUnique([...fromBarter, ...fromEscort, ...fromNpcRoster]);
    }

    private populateSelectWithOptions(select: HTMLSelectElement, values: string[], placeholder: string): void {
        const existingValue = select.value;
        select.innerHTML = '';

        if (values.length === 0) {
            this.createAndAppendOption(select, '', placeholder);
            return;
        }

        values.forEach((value) => {
            this.createAndAppendOption(select, value, value);
        });
        const hasPreviousSelection = values.some((value) => value === existingValue);
        select.value = hasPreviousSelection ? existingValue : values[0];
    }

    private toSortedUnique = (values: string[]): string[] => Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)))
        .sort((left, right) => left.localeCompare(right));

    private addRecoverLeadFromNpc(npc: VillageNpcProfile): void {
        const recoverLead = this.callbacks.onRevealRecoverHolder?.(this.currentVillageName, npc.name) ?? { revealed: false };
        if (!recoverLead.revealed || !recoverLead.personName || !recoverLead.itemName) {
            return;
        }
        this.appendRecoverHolderIfMissing(this.npcRoster, this.currentVillageName, recoverLead.personName, recoverLead.itemName);
        this.addLog(
            `${npc.name} lowers their voice: "${recoverLead.personName} is carrying ${recoverLead.itemName}. You'll find them in this village."`,
            'system-message',
        );
        this.refreshNpcUi();
        this.refreshDialogueTargetOptions();
    }

    private buildNearbyKnownSettlementSet = (): Set<string> => {
        const knownSettlements = this.callbacks.getKnownSettlementNames?.() ?? [];
        const nearbySettlements = this.getNearbyVillageSet(this.currentVillageName);
        return new Set(
            knownSettlements
                .map((name) => name.trim().toLocaleLowerCase())
                .filter((name) => nearbySettlements.has(name)),
        );
    };

    private getNearbyVillageSet(villageName: string): Set<string> {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedVillage) {
            return new Set();
        }
        const maxDistanceCells = Math.max(1, Math.floor(balanceConfig.quest?.sideQuestNearbyRosterDistanceCells ?? 4));
        const nearby = this.callbacks.getNearbyVillageNames?.(villageName, maxDistanceCells) ?? [];
        return new Set([normalizedVillage, ...nearby.map((name) => name.trim().toLocaleLowerCase()).filter((name) => name.length > 0)]);
    }

    private injectSideQuestNpcReferencesIntoNearbyRosters(quest: QuestNode): void {
        const nearbyVillageSet = this.getNearbyVillageSet(this.currentVillageName);
        this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, quest.giverVillageName, quest.giverNpcName, 'Side Quest Giver');
        quest.children.forEach((child) => this.injectChildObjectiveNpcs(nearbyVillageSet, child));
    }

    private injectChildObjectiveNpcs(nearbyVillageSet: Set<string>, child: QuestNode): void {
        const localDelivery = child.objectiveData?.localDelivery;
        if (localDelivery) {
            this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, localDelivery.villageName, localDelivery.sourceNpcName, 'Courier Handler');
            this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, localDelivery.villageName, localDelivery.recipientNpcName, 'Delivery Recipient');
        }
        const recover = child.objectiveData?.recover;
        if (recover) {
            this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, recover.currentVillage, recover.personName, `Wanted for ${recover.itemName}`);
        }
        const escort = child.objectiveData?.escort;
        if (escort) {
            this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, escort.sourceVillage, escort.personName, `Escort to ${escort.destinationVillage}`);
        }
        const defend = child.objectiveData?.defend;
        if (defend) {
            this.injectNpcIntoNearbyVillageRoster(nearbyVillageSet, defend.villageName, defend.contactName, `Artifact Custodian (${defend.artifactName})`);
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private injectNpcIntoNearbyVillageRoster(nearbyVillageSet: Set<string>, villageName: string | undefined, npcName: string | undefined, role: string): void {
        const normalizedVillage = villageName?.trim().toLocaleLowerCase();
        const normalizedNpcName = npcName?.trim();
        if (!normalizedVillage || !normalizedNpcName || !nearbyVillageSet.has(normalizedVillage)) {
            return;
        }
        const roster = this.getOrCreateVillageNpcRoster(villageName.trim());
        const exists = roster.some((npc) => npc.name.trim().toLocaleLowerCase() === normalizedNpcName.toLocaleLowerCase());
        if (exists) {
            return;
        }
        roster.unshift({
            id: `${normalizedVillage}-${normalizedNpcName.toLocaleLowerCase()}-side`,
            name: normalizedNpcName,
            role,
            look: 'travel-worn cloak, practical satchel, watchful gaze',
            speechStyle: 'measured and direct',
            disposition: 'truthful',
        });
    }

    private shouldIncludeTraderName(traderName: string, knownSettlements: Set<string>): boolean {
        if (isDeveloperModeEnabled()) {
            return true;
        }

        const hint = this.barterService.getPersonDirectionHint(traderName, this.callbacks.getVillageDirectionHint);
        if (!hint.exists || !hint.villageName) {
            return false;
        }
        return knownSettlements.has(hint.villageName.trim().toLocaleLowerCase());
    }

    private shouldIncludeEscortContract(contract: QuestEscortContract, knownSettlements: Set<string>): boolean {
        if (isDeveloperModeEnabled()) {
            return true;
        }

        const source = contract.sourceVillage.trim().toLocaleLowerCase();
        const destination = contract.destinationVillage.trim().toLocaleLowerCase();
        return knownSettlements.has(source) || knownSettlements.has(destination);
    }

    private createAndAppendOption(select: HTMLSelectElement, value: string, text: string): void {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
}
