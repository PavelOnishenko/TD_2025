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

export type PackSourceType = 'local-pattern' | 'map-village' | 'remote-location' | 'remote-name' | 'echo';

export type QuestNode = {
    id: string;
    title: string;
    description: string;
    conditionText: string;
    objectiveType: QuestObjectiveType;
    entities: QuestTextEntity[];
    children: QuestNode[];
    objectiveData?: QuestObjectiveData;
    isCompleted?: boolean;
};

export type DeliverObjectiveData = {
    sourceVillage: string;
    sourceTrader: string;
    destinationVillage: string;
    itemName: string;
    isPickedUp?: boolean;
};

export type QuestObjectiveData = {
    deliver?: DeliverObjectiveData;
};

export type GeneratedName = {
    text: string;
    domain: QuestNameDomain;
    sourceTypes: PackSourceType[];
};

export type QuestTextEntity = {
    text: string;
    type: 'location' | 'item' | 'person';
};

export type RareMonsterProfile = {
    name: GeneratedName;
    count: number;
    stats: string[];
    effects: string[];
    bonus: string;
};
