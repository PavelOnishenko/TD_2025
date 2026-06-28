export const UI_ASSET_PATHS = {
    mainIcon: 'assets/images/UI/neon_void_icon.png',
    nextLevelButton: 'assets/images/UI/button_next_level.png',
    settingsButton: 'assets/images/UI/button_settings.png',
    pauseButton: 'assets/images/UI/button_pause.png',
    restartButton: 'assets/images/UI/button_restart.png',
    mergeTowersButton: 'assets/images/UI/button_merge_towers.png',
    upgradeTowersButton: 'assets/images/UI/button_upgrade_towers.png',
    speedUpBattleButton: 'assets/images/UI/button_speed_up_battle.png',
    energyIcon: 'assets/images/UI/icon_energy_lightning.png',
    heart: 'assets/images/UI/icon_heart.png',
    preparationButtonBackground: 'assets/images/UI/button_preparation_panel.png',
} as const;

export type UiAssetKey = keyof typeof UI_ASSET_PATHS;
