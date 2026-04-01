import QuestProgressTracker from '../../systems/quest/QuestProgressTracker.js';
import { EscortObjectiveData, QuestNode } from '../../systems/quest/QuestTypes.js';
import QuestUiController from '../../systems/quest/ui/QuestUiController.js';
import QuestGenerator from '../../systems/quest/QuestGenerator.js';
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Skeleton, { MonsterMutationTrait } from '../../entities/Skeleton.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { getDeveloperModeConfig } from '../../utils/DeveloperModeConfig.js';

type QuestContractsReadyPayload = {
    barterContracts: Array<{
        traderName: string;
        itemName: string;
        sourceVillage?: string;
        destinationVillage?: string;
        contractType: 'barter' | 'deliver';
    }>;
    escortContracts: Array<{ personName: string; sourceVillage: string; destinationVillage: string }>;
};

export default class GameQuestRuntime {
    public activeQuest: QuestNode | null = null;
    public questUiController: QuestUiController | null = null;
    public questProgressTracker: QuestProgressTracker | null = null;

    public async initialize(
        questGenerator: QuestGenerator,
        questUiController: QuestUiController,
        getSavedQuest: () => QuestNode | null,
        onContractsReady: (payload: QuestContractsReadyPayload) => void,
        worldMap: WorldMap,
    ): Promise<void> {
        const savedQuest = getSavedQuest();
        const quest = savedQuest ?? await questGenerator.generateMainQuest();
        this.activeQuest = quest;
        this.questUiController = questUiController;
        this.questProgressTracker = new QuestProgressTracker(quest);
        onContractsReady({ barterContracts: this.collectBarterContracts(quest), escortContracts: this.collectEscortContracts(quest) });
        this.registerQuestLocations(worldMap, quest);
        questUiController.renderQuest(quest);
        if (!savedQuest && getDeveloperModeConfig().questIntroEnabled) {
            questUiController.showIntro();
        }
    }

    public recordLocationEntry(locationName: string, carriedItemNames: string[]): boolean {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return false;
        }
        const locationChanged = this.questProgressTracker.recordLocationEntryWithInventory(locationName, carriedItemNames);
        const escortChanged = this.resolveEscortArrival(locationName);
        if (!locationChanged && !escortChanged) {
            return false;
        }
        this.questUiController.renderQuest(this.activeQuest);
        return true;
    }

    public recruitEscort(personName: string, villageName: string): 'joined' | 'inactive' | 'already-joined' | 'not-available' {
        if (!this.activeQuest || !this.questUiController) {
            return 'inactive';
        }

        const normalizedPerson = personName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedPerson || !normalizedVillage) {
            return 'not-available';
        }

        let result: 'joined' | 'already-joined' | 'not-available' = 'not-available';
        let didJoin = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const escort = node.objectiveData?.escort;
            if (!escort || escort.isDead) {
                return;
            }
            if (escort.personName.trim().toLocaleLowerCase() !== normalizedPerson) {
                return;
            }
            if (escort.sourceVillage.trim().toLocaleLowerCase() !== normalizedVillage) {
                return;
            }
            if (escort.hasJoined) {
                result = 'already-joined';
                return;
            }
            escort.hasJoined = true;
            result = 'joined';
            didJoin = true;
        });

        if (didJoin) {
            this.questProgressTracker?.recomputeCompletion();
            this.questUiController.renderQuest(this.activeQuest);
        }
        return result;
    }

    public getGroupMembers(): Array<{ name: string; hp: number; maxHp: number; status: 'following' | 'dead' }> {
        if (!this.activeQuest) {
            return [];
        }

        const members: Array<{ name: string; hp: number; maxHp: number; status: 'following' | 'dead' }> = [];
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const escort = node.objectiveData?.escort;
            if (!escort?.hasJoined) {
                return;
            }
            members.push({
                name: escort.personName,
                hp: this.getEscortCurrentHp(escort),
                maxHp: this.getEscortMaxHp(escort),
                status: escort.isDead ? 'dead' : 'following',
            });
        });
        return members;
    }

    public applyEscortBattleDamage(enemyName: string, damage: number): { applied: boolean; targetName?: string; died?: boolean } {
        if (!this.activeQuest || damage <= 0) {
            return { applied: false };
        }

        const joinedEscorts: EscortObjectiveData[] = [];
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType === 'escort' && node.children.length === 0 && !node.isCompleted && node.objectiveData?.escort?.hasJoined && !node.objectiveData.escort.isDead) {
                joinedEscorts.push(node.objectiveData.escort);
            }
        });
        if (joinedEscorts.length === 0) {
            return { applied: false };
        }

        const target = joinedEscorts[Math.floor(Math.random() * joinedEscorts.length)]!;
        const nextHp = Math.max(0, this.getEscortCurrentHp(target) - damage);
        this.setEscortCurrentHp(target, nextHp);
        const died = nextHp <= 0;
        if (died) {
            target.isDead = true;
            target.hasJoined = false;
        }
        this.questProgressTracker?.recomputeCompletion();
        this.questUiController?.renderQuest(this.activeQuest);
        return { applied: true, targetName: target.personName, died };
    }

    public recordBarterCompletion(traderName: string, itemName: string, villageName: string): 'updated' | 'no-objective' | 'inactive' {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return 'inactive';
        }
        if (!this.questProgressTracker.recordBarterCompletion(traderName, itemName, villageName)) {
            return 'no-objective';
        }
        this.questUiController.renderQuest(this.activeQuest);
        return 'updated';
    }

    public recordMonsterKill(monsterName: string): boolean {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return false;
        }
        if (!this.questProgressTracker.recordMonsterKill(monsterName)) {
            return false;
        }
        this.questUiController.renderQuest(this.activeQuest);
        return true;
    }

    public tryCreateQuestMonsterEncounter(worldMap: WorldMap): { enemies: Skeleton[]; hint?: string } | null {
        if (!this.questProgressTracker) {
            return null;
        }
        for (const objective of this.questProgressTracker.getActiveMonsterObjectives()) {
            if (!objective.villageName) {
                continue;
            }
            const hint = worldMap.getVillageDirectionHintFromPlayer(objective.villageName);
            if (!hint.exists || typeof hint.distanceCells !== 'number' || hint.distanceCells > 7) {
                continue;
            }
            const chance = hint.distanceCells <= 2 ? 0.42 : 0.2;
            if (Math.random() >= chance) {
                continue;
            }
            const spawnCount = Math.max(1, Math.min(3, objective.remainingKills));
            const mutations = objective.mutations.filter((value): value is MonsterMutationTrait => ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'].includes(value));
            const enemies = Array.from({ length: spawnCount }, () => new Skeleton(0, 0, { ...balanceConfig.enemies.skeleton, name: objective.targetName, mutations }));
            return { enemies, hint: `Scouts report ${objective.targetName} tracks near ${objective.villageName} (${hint.direction ?? 'nearby'}).` };
        }
        return null;
    }

    private resolveEscortArrival(locationName: string): boolean {
        if (!this.activeQuest) {
            return false;
        }
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        let changed = false;
        this.visitQuestNodes(this.activeQuest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || node.isCompleted) {
                return;
            }
            const escort = node.objectiveData?.escort;
            if (!escort || escort.isDead || !escort.hasJoined) {
                return;
            }
            if (escort.destinationVillage.trim().toLocaleLowerCase() !== normalizedLocation) {
                return;
            }
            node.isCompleted = true;
            escort.hasJoined = false;
            changed = true;
        });
        if (changed) {
            this.questProgressTracker?.recomputeCompletion();
        }
        return changed;
    }

    private registerQuestLocations(worldMap: WorldMap, quest: QuestNode): void {
        for (const entity of quest.entities) {
            if (entity.type === 'location') {
                worldMap.registerNamedLocation(entity.text);
            }
        }
        quest.children.forEach((child) => this.registerQuestLocations(worldMap, child));
    }

    private collectBarterContracts(quest: QuestNode): Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' }> {
        const contracts: Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' }> = [];
        const visit = (node: QuestNode): void => {
            if (node.objectiveType === 'barter' && node.children.length === 0) {
                const trader = node.entities.find((entity) => entity.type === 'person')?.text?.trim();
                const item = node.entities.find((entity) => entity.type === 'item')?.text?.trim();
                if (trader && item) {
                    contracts.push({ traderName: trader, itemName: item, contractType: 'barter' });
                }
            }
            if (node.objectiveType === 'deliver' && node.children.length === 0) {
                const deliverData = node.objectiveData?.deliver;
                if (deliverData?.sourceTrader && deliverData?.itemName) {
                    contracts.push({ traderName: deliverData.sourceTrader, itemName: deliverData.itemName, sourceVillage: deliverData.sourceVillage, destinationVillage: deliverData.destinationVillage, contractType: 'deliver' });
                }
            }
            node.children.forEach((child) => visit(child));
        };
        visit(quest);
        return contracts;
    }

    private collectEscortContracts(quest: QuestNode): Array<{ personName: string; sourceVillage: string; destinationVillage: string }> {
        const contracts: Array<{ personName: string; sourceVillage: string; destinationVillage: string }> = [];
        this.visitQuestNodes(quest, (node) => {
            if (node.objectiveType !== 'escort' || node.children.length > 0 || !node.objectiveData?.escort) {
                return;
            }
            const escort = node.objectiveData.escort;
            contracts.push({ personName: escort.personName, sourceVillage: escort.sourceVillage, destinationVillage: escort.destinationVillage });
        });
        return contracts;
    }

    private visitQuestNodes(node: QuestNode, visitor: (node: QuestNode) => void): void {
        visitor(node);
        node.children.forEach((child) => this.visitQuestNodes(child, visitor));
    }

    private getEscortCurrentHp(escort: EscortObjectiveData): number {
        const metadata = escort as EscortObjectiveData & { currentHp?: number };
        if (typeof metadata.currentHp === 'number') {
            return metadata.currentHp;
        }
        return this.getEscortMaxHp(escort);
    }

    private setEscortCurrentHp(escort: EscortObjectiveData, hp: number): void {
        const metadata = escort as EscortObjectiveData & { currentHp?: number };
        metadata.currentHp = Math.max(0, hp);
    }

    private getEscortMaxHp = (_escort: EscortObjectiveData): number => 6;
}
