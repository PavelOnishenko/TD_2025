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
    objectiveData?: QuestObjectiveData;
    children: QuestNode[];
    isCompleted?: boolean;
};

export type DeliverObjectiveData = {
    sourceVillage: string;
    sourceTrader: string;
    destinationVillage: string;
    itemName: string;
    isPickedUp?: boolean;
};

export type GeneratedName = {
    text: string;
    domain: QuestNameDomain;
    sourceTypes: PackSourceType[];
};

export type QuestTextEntity = {
    text: string;
    type: 'location' | 'item' | 'person' | 'monster';
};

export type RareMonsterProfile = {
    name: GeneratedName;
    count: number;
    stats: string[];
    effects: string[];
    bonus: string;
    mutatedFrom: string;
};

export type MonsterObjectiveData = {
    targetName: string;
    requiredKills: number;
    currentKills?: number;
    villageName?: string;
    mutations?: string[];
    mutatedFrom?: string;
};

export type EscortObjectiveData = {
    personName: string;
    sourceVillage: string;
    destinationVillage: string;
    hasJoined?: boolean;
    isDead?: boolean;
};

export type RecoverEnemyProfile = {
    archetypeId: string;
    xpValue: number;
    width: number;
    height: number;
    baseStats: { hp: number; damage: number; armor: number; mana: number };
    skills: { vitality: number; toughness: number; strength: number; agility: number; connection: number; intelligence: number };
};

export type RecoverObjectiveData = {
    itemName: string;
    personName: string;
    initialVillage: string;
    currentVillage: string;
    isPersonKnown?: boolean;
    hasFled?: boolean;
    enemyProfile?: RecoverEnemyProfile;
};

export type DefendObjectiveDefender = {
    name: string;
    level: number;
    maxHp: number;
    currentHp: number;
    inventoryItemIds: string[];
    equippedWeaponItemId?: string;
    equippedArmorItemId?: string;
    stats?: {
        damage: number;
        armor: number;
        mana: number;
        vitality: number;
        toughness: number;
        strength: number;
        agility: number;
        connection: number;
        intelligence: number;
    };
    isDead?: boolean;
};

export type DefendObjectiveData = {
    villageName: string;
    artifactName: string;
    contactName: string;
    durationDays: number;
    timeRemainingMinutes: number;
    isDefenseActive?: boolean;
    defenders?: DefendObjectiveDefender[];
    fallenDefenderNames?: string[];
    battleCooldownMinutes?: number;
    remainingBattles?: number;
};

export type QuestObjectiveData = {
    deliver?: DeliverObjectiveData;
    monster?: MonsterObjectiveData;
    escort?: EscortObjectiveData;
    recover?: RecoverObjectiveData;
    defend?: DefendObjectiveData;
};
