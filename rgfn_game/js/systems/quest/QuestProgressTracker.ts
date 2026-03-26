import { QuestNode } from './QuestTypes.js';

const LOCATION_OBJECTIVES = new Set(['travel', 'scout']);

export default class QuestProgressTracker {
    private readonly root: QuestNode;

    constructor(root: QuestNode) {
        this.root = root;
        this.recomputeCompletion(this.root);
    }

    public recordLocationEntry(locationName: string): boolean {
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        if (!normalizedLocation) {
            return false;
        }

        const changed = this.markLocationObjectives(this.root, normalizedLocation);
        if (!changed) {
            return false;
        }

        this.recomputeCompletion(this.root);
        return true;
    }

    public recordBarterCompletion(traderName: string, itemName: string): boolean {
        const normalizedTrader = traderName.trim().toLocaleLowerCase();
        const normalizedItem = itemName.trim().toLocaleLowerCase();
        if (!normalizedTrader || !normalizedItem) {
            return false;
        }

        const changed = this.markBarterObjectives(this.root, normalizedTrader, normalizedItem);
        if (!changed) {
            return false;
        }

        this.recomputeCompletion(this.root);
        return true;
    }

    private markLocationObjectives(node: QuestNode, normalizedLocation: string): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markLocationObjectives(child, normalizedLocation) || changed;
        }

        if (!LOCATION_OBJECTIVES.has(node.objectiveType)) {
            return changed;
        }

        if (node.children.length > 0) {
            return changed;
        }

        const locationEntity = node.entities.find((entity) => entity.type === 'location');
        if (!locationEntity) {
            return changed;
        }

        if (locationEntity.text.trim().toLocaleLowerCase() !== normalizedLocation) {
            return changed;
        }

        if (node.isCompleted) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }

    private markBarterObjectives(node: QuestNode, normalizedTrader: string, normalizedItem: string): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markBarterObjectives(child, normalizedTrader, normalizedItem) || changed;
        }

        if (node.objectiveType !== 'barter' || node.children.length > 0 || node.isCompleted) {
            return changed;
        }

        const trader = node.entities.find((entity) => entity.type === 'person');
        const item = node.entities.find((entity) => entity.type === 'item');
        if (!trader || !item) {
            return changed;
        }

        const traderMatches = trader.text.trim().toLocaleLowerCase() === normalizedTrader;
        const itemMatches = item.text.trim().toLocaleLowerCase() === normalizedItem;
        if (!traderMatches || !itemMatches) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }

    private recomputeCompletion(node: QuestNode): boolean {
        if (node.children.length === 0) {
            node.isCompleted = Boolean(node.isCompleted);
            return node.isCompleted;
        }

        const allChildrenCompleted = node.children.every((child) => this.recomputeCompletion(child));
        node.isCompleted = allChildrenCompleted;
        return allChildrenCompleted;
    }
}
