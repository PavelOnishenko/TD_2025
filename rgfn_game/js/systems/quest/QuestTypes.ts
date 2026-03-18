export type QuestObjectiveType = 'eliminate' | 'deliver' | 'travel' | 'barter' | 'scout';

export type QuestNode = {
    id: string;
    title: string;
    description: string;
    conditionText: string;
    objectiveType: QuestObjectiveType;
    children: QuestNode[];
};
