export type HudElements = {
    modeIndicator: HTMLElement;
    usePotionBtn: HTMLButtonElement;
    useManaPotionBtn: HTMLButtonElement;
    newCharacterBtn: HTMLButtonElement;
    playerLevel: HTMLElement;
    playerName: HTMLElement;
    playerXp: HTMLElement;
    playerXpNext: HTMLElement;
    playerHp: HTMLElement;
    playerMaxHp: HTMLElement;
    playerMana: HTMLElement;
    playerMaxMana: HTMLElement;
    playerDmg: HTMLElement;
    playerDmgFormula: HTMLElement;
    playerArmor: HTMLElement;
    playerDodge: HTMLElement;
    playerDodgeFormula: HTMLElement;
    playerWeapon: HTMLElement;
    playerGold: HTMLElement;
    skillPoints: HTMLElement;
    magicPoints: HTMLElement;
    statVitality: HTMLElement;
    statToughness: HTMLElement;
    statStrength: HTMLElement;
    statAgility: HTMLElement;
    statConnection: HTMLElement;
    statIntelligence: HTMLElement;
    addVitalityBtn: HTMLButtonElement;
    addToughnessBtn: HTMLButtonElement;
    addStrengthBtn: HTMLButtonElement;
    addAgilityBtn: HTMLButtonElement;
    addConnectionBtn: HTMLButtonElement;
    addIntelligenceBtn: HTMLButtonElement;
    upgradeFireballBtn: HTMLButtonElement;
    upgradeCurseBtn: HTMLButtonElement;
    upgradeSlowBtn: HTMLButtonElement;
    upgradeRageBtn: HTMLButtonElement;
    upgradeArcaneLanceBtn: HTMLButtonElement;
    spellLevelFireball: HTMLElement;
    spellLevelCurse: HTMLElement;
    spellLevelSlow: HTMLElement;
    spellLevelRage: HTMLElement;
    spellLevelArcaneLance: HTMLElement;
    spellDetailsFireball: HTMLElement;
    spellDetailsCurse: HTMLElement;
    spellDetailsSlow: HTMLElement;
    spellDetailsRage: HTMLElement;
    spellDetailsArcaneLance: HTMLElement;
    inventoryCount: HTMLElement;
    inventoryCapacity: HTMLElement;
    inventoryGrid: HTMLElement;
    weaponSlotMain: HTMLButtonElement;
    weaponSlotOff: HTMLButtonElement;
    armorSlot: HTMLButtonElement;
    statsPanel: HTMLElement;
    skillsPanel: HTMLElement;
    inventoryPanel: HTMLElement;
    magicPanel: HTMLElement;
    toggleStatsPanelBtn: HTMLButtonElement;
    toggleSkillsPanelBtn: HTMLButtonElement;
    toggleInventoryPanelBtn: HTMLButtonElement;
    toggleMagicPanelBtn: HTMLButtonElement;
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
    useManaPotionBtn: HTMLButtonElement;
    spellFireballBtn: HTMLButtonElement;
    spellCurseBtn: HTMLButtonElement;
    spellSlowBtn: HTMLButtonElement;
    spellRageBtn: HTMLButtonElement;
    spellArcaneLanceBtn: HTMLButtonElement;
    attackRangeText: HTMLElement;
};

export type VillageUI = {
    sidebar: HTMLElement;
    prompt: HTMLElement;
    actions: HTMLElement;
    enterBtn: HTMLButtonElement;
    skipBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    buyOffer1Btn: HTMLButtonElement;
    buyOffer2Btn: HTMLButtonElement;
    buyOffer3Btn: HTMLButtonElement;
    buyOffer4Btn: HTMLButtonElement;
    sellSelect: HTMLSelectElement;
    sellSelectedBtn: HTMLButtonElement;
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

export type GameLogUI = {
    log: HTMLElement;
};

export type GameUiBundle = {
    hudElements: HudElements;
    battleUI: BattleUI;
    villageUI: VillageUI;
    gameLogUI: GameLogUI;
    developerUI: DeveloperUI;
};
