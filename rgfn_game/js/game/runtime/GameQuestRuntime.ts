import QuestProgressTracker from '../../systems/quest/QuestProgressTracker.js';
import { QuestNode } from '../../systems/quest/QuestTypes.js';
import QuestUiController from '../../systems/quest/QuestUiController.js';
import QuestGenerator from '../../systems/quest/QuestGenerator.js';
import WorldMap from '../../systems/world/WorldMap.js';
import Skeleton, { MonsterMutationTrait } from '../../entities/Skeleton.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';

export default class GameQuestRuntime {
    public activeQuest: QuestNode | null = null;
    public questUiController: QuestUiController | null = null;
    public questProgressTracker: QuestProgressTracker | null = null;

    public async initialize(
        questGenerator: QuestGenerator,
        questUiController: QuestUiController,
        getSavedQuest: () => QuestNode | null,
        onContractsReady: (contracts: Array<{ traderName: string; itemName: string; sourceVillage?: string; destinationVillage?: string; contractType: 'barter' | 'deliver' }>) => void,
        worldMap: WorldMap,
    ): Promise<void> {
        const savedQuest = getSavedQuest();
        const quest = savedQuest ?? await questGenerator.generateMainQuest();
        this.activeQuest = quest;
        this.questUiController = questUiController;
        this.questProgressTracker = new QuestProgressTracker(quest);
        onContractsReady(this.collectBarterContracts(quest));
        this.registerQuestLocations(worldMap, quest);
        questUiController.renderQuest(quest);
        if (!savedQuest) {
            questUiController.showIntro();
        }
    }

    public recordLocationEntry(locationName: string, carriedItemNames: string[]): boolean {
        if (!this.questProgressTracker || !this.questUiController || !this.activeQuest) {
            return false;
        }
        if (!this.questProgressTracker.recordLocationEntryWithInventory(locationName, carriedItemNames)) {
            return false;
        }
        this.questUiController.renderQuest(this.activeQuest);
        return true;
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
}
