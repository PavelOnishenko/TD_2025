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

        const changed = this.markLocationObjectives(this.root, normalizedLocation) || this.markDeliverObjectives(this.root, normalizedLocation, new Set());
        if (!changed) {
            return false;
        }

        this.recomputeCompletion(this.root);
        return true;
    }

    public recordLocationEntryWithInventory(locationName: string, carriedItems: string[]): boolean {
        const normalizedLocation = locationName.trim().toLocaleLowerCase();
        if (!normalizedLocation) {
            return false;
        }

        const carried = new Set(carriedItems.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean));
        const changed = this.markLocationObjectives(this.root, normalizedLocation) || this.markDeliverObjectives(this.root, normalizedLocation, carried);
        if (!changed) {
            return false;
        }

        this.recomputeCompletion(this.root);
        return true;
    }

    public recordBarterCompletion(traderName: string, itemName: string, villageName: string): boolean {
        const normalizedTrader = traderName.trim().toLocaleLowerCase();
        const normalizedItem = itemName.trim().toLocaleLowerCase();
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        if (!normalizedTrader || !normalizedItem || !normalizedVillage) {
            return false;
        }

        const changed = this.markBarterObjectives(this.root, normalizedTrader, normalizedItem)
            || this.markDeliverPickupObjectives(this.root, normalizedTrader, normalizedItem, normalizedVillage);
        if (!changed) {
            return false;
        }

        this.recomputeCompletion(this.root);
        return true;
    }

    private markDeliverObjectives(node: QuestNode, normalizedLocation: string, carriedItems: Set<string>): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markDeliverObjectives(child, normalizedLocation, carriedItems) || changed;
        }

        if (node.objectiveType !== 'deliver' || node.children.length > 0 || node.isCompleted) {
            return changed;
        }

        const deliverData = node.objectiveData?.deliver;
        if (!deliverData?.isPickedUp) {
            return changed;
        }

        const destinationMatches = deliverData.destinationVillage.trim().toLocaleLowerCase() === normalizedLocation;
        const carryingItem = carriedItems.has(deliverData.itemName.trim().toLocaleLowerCase());
        if (!destinationMatches || !carryingItem) {
            return changed;
        }

        node.isCompleted = true;
        return true;
    }

    private markDeliverPickupObjectives(node: QuestNode, normalizedTrader: string, normalizedItem: string, normalizedVillage: string): boolean {
        let changed = false;

        for (const child of node.children) {
            changed = this.markDeliverPickupObjectives(child, normalizedTrader, normalizedItem, normalizedVillage) || changed;
        }

        if (node.objectiveType !== 'deliver' || node.children.length > 0) {
            return changed;
        }

        const deliverData = node.objectiveData?.deliver;
        if (!deliverData || deliverData.isPickedUp) {
            return changed;
        }

        const traderMatches = deliverData.sourceTrader.trim().toLocaleLowerCase() === normalizedTrader;
        const itemMatches = deliverData.itemName.trim().toLocaleLowerCase() === normalizedItem;
        const villageMatches = deliverData.sourceVillage.trim().toLocaleLowerCase() === normalizedVillage;
        if (!traderMatches || !itemMatches || !villageMatches) {
            return changed;
        }

        deliverData.isPickedUp = true;
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
