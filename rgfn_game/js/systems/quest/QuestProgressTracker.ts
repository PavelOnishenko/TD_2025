import { QuestLocationTradeProgress } from './QuestLocationTradeProgress.js';
import { ActiveMonsterObjective, QuestMonsterProgress } from './QuestMonsterProgress.js';
import { QuestTraversalCompletion } from './QuestTraversalCompletion.js';
import { QuestNode } from './QuestTypes.js';

export default class QuestProgressTracker {
    private readonly root: QuestNode;

    private readonly locationTradeProgress: QuestLocationTradeProgress;

    private readonly monsterProgress: QuestMonsterProgress;

    private readonly completion: QuestTraversalCompletion;

    constructor(root: QuestNode) {
        this.root = root;
        this.locationTradeProgress = new QuestLocationTradeProgress();
        this.monsterProgress = new QuestMonsterProgress();
        this.completion = new QuestTraversalCompletion();
        this.completion.recomputeCompletion(this.root);
    }

    public recordLocationEntry(locationName: string): boolean {
        return this.recordLocationEntryWithInventory(locationName, []);
    }

    public recordLocationEntryWithInventory(locationName: string, carriedItems: string[]): boolean {
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        if (!normalizedLocation) {
            return false;
        }

        const carried = new Set(
            carriedItems
                .map((item) => item.trim().toLocaleLowerCase())
                .filter(Boolean),
        );

        const changed = this.locationTradeProgress.markLocationAndDeliveryObjectives(this.root, normalizedLocation, carried);
        if (!changed) {
            return false;
        }

        this.completion.recomputeCompletion(this.root);
        return true;
    }

    public recordBarterCompletion(traderName: string, itemName: string, villageName: string): boolean {
        const normalizedTrader = traderName.trim().toLocaleLowerCase();
        const normalizedItem = itemName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedTrader || !normalizedItem || !normalizedVillage) {
            return false;
        }

        const changed = this.locationTradeProgress.markBarterAndPickupObjectives(
            this.root,
            normalizedTrader,
            normalizedItem,
            normalizedVillage,
        );
        if (!changed) {
            return false;
        }

        this.completion.recomputeCompletion(this.root);
        return true;
    }

    public recordMonsterKill(monsterName: string): boolean {
        const normalizedMonsterName = monsterName.trim().toLocaleLowerCase();
        if (!normalizedMonsterName) {
            return false;
        }

        const changed = this.monsterProgress.markMonsterKillObjectives(this.root, normalizedMonsterName);
        if (!changed) {
            return false;
        }

        this.completion.recomputeCompletion(this.root);
        return true;
    }

    public getActiveMonsterObjectives(): ActiveMonsterObjective[] {
        const objectives: ActiveMonsterObjective[] = [];
        this.monsterProgress.collectActiveMonsterObjectives(this.root, objectives);
        return objectives;
    }
}
