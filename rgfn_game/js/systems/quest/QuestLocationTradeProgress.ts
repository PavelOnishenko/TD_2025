import { QuestNode } from './QuestTypes.js';

const LOCATION_OBJECTIVES = new Set(['travel', 'scout']);

export class QuestLocationTradeProgress {
    public markLocationAndDeliveryObjectives(node: QuestNode, normalizedLocation: string, carriedItems: Set<string>): boolean {
        const locationChanged = this.markLocationObjectives(node, normalizedLocation);
        const deliveryChanged = this.markDeliverObjectives(node, normalizedLocation, carriedItems);
        return locationChanged || deliveryChanged;
    }

    public markBarterAndPickupObjectives(node: QuestNode, normalizedTrader: string, normalizedItem: string, normalizedVillage: string): boolean {
        const barterChanged = this.markBarterObjectives(node, normalizedTrader, normalizedItem);
        const pickupChanged = this.markDeliverPickupObjectives(node, normalizedTrader, normalizedItem, normalizedVillage);
        return barterChanged || pickupChanged;
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

        if (!LOCATION_OBJECTIVES.has(node.objectiveType) || node.children.length > 0) {
            return changed;
        }

        const locationEntity = node.entities.find((entity) => entity.type === 'location');
        if (!locationEntity || locationEntity.text.trim().toLocaleLowerCase() !== normalizedLocation || node.isCompleted) {
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
}
