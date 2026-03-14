export type HudElements = {
    modeIndicator: HTMLElement;
    usePotionBtn: HTMLButtonElement;
    playerLevel: HTMLElement;
    playerXp: HTMLElement;
    playerXpNext: HTMLElement;
    playerHp: HTMLElement;
    playerMaxHp: HTMLElement;
    playerDmg: HTMLElement;
    playerDmgFormula: HTMLElement;
    playerArmor: HTMLElement;
    playerDodge: HTMLElement;
    playerDodgeFormula: HTMLElement;
    playerWeapon: HTMLElement;
    playerGold: HTMLElement;
    skillPoints: HTMLElement;
    statVitality: HTMLElement;
    statToughness: HTMLElement;
    statStrength: HTMLElement;
    statAgility: HTMLElement;
    addVitalityBtn: HTMLButtonElement;
    addToughnessBtn: HTMLButtonElement;
    addStrengthBtn: HTMLButtonElement;
    addAgilityBtn: HTMLButtonElement;
    inventoryCount: HTMLElement;
    inventoryCapacity: HTMLElement;
    inventoryGrid: HTMLElement;
    weaponSlotMain: HTMLButtonElement;
    weaponSlotOff: HTMLButtonElement;
    armorSlot: HTMLButtonElement;
};

export type BattleUI = {
    sidebar: HTMLElement;
    enemyName: HTMLElement;
    enemyHp: HTMLElement;
    enemyMaxHp: HTMLElement;
    attackBtn: HTMLButtonElement;
    fleeBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    usePotionBtn: HTMLButtonElement;
    log: HTMLElement;
    attackRangeText: HTMLElement;
};

export type VillageUI = {
    sidebar: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    log: HTMLElement;
    enterBtn: HTMLButtonElement;
    skipBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    buyBtn: HTMLButtonElement;
    sellBtn: HTMLButtonElement;
    buyPotionBtn: HTMLButtonElement;
    sellPotionBtn: HTMLButtonElement;
    leaveBtn: HTMLButtonElement;
};

export type DeveloperUI = {
    modal: HTMLElement;
    closeBtn: HTMLButtonElement;
    eventType: HTMLSelectElement;
    queueList: HTMLElement;
    addBtn: HTMLButtonElement;
    clearBtn: HTMLButtonElement;
};

export type GameUiBundle = {
    hudElements: HudElements;
    battleUI: BattleUI;
    villageUI: VillageUI;
    developerUI: DeveloperUI;
};
