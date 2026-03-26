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
