export type QuestObjectiveType =
    | 'eliminate'
    | 'deliver'
    | 'travel'
    | 'barter'
    | 'scout'
    | 'hunt'
    | 'recover'
    | 'escort'
    | 'defend';

export type QuestNameDomain = 'location' | 'artifact' | 'character' | 'monster' | 'mainQuest';

export type PackSourceType = 'local-pattern' | 'remote-location' | 'remote-word' | 'remote-name' | 'echo';

export type QuestNode = {
    id: string;
    title: string;
    description: string;
    conditionText: string;
    objectiveType: QuestObjectiveType;
    children: QuestNode[];
};

export type GeneratedName = {
    text: string;
    sourceTypes: PackSourceType[];
};

export type RareMonsterProfile = {
    name: GeneratedName;
    count: number;
    stats: string[];
    effects: string[];
    bonus: string;
};
