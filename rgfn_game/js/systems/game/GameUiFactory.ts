import { BattleUI, DeveloperUI, GameLogUI, GameUiBundle, HudElements, VillageUI } from './GameUiTypes.js';
import { balanceConfig } from '../../config/balanceConfig.js';

export default class GameUiFactory {
    public create(): GameUiBundle {
        return {
            hudElements: this.createHudElements(),
            battleUI: this.createBattleUi(),
            villageUI: this.createVillageUi(),
            gameLogUI: this.createGameLogUi(),
            developerUI: this.createDeveloperUi(),
        };
    }

    private createHudElements(): HudElements {
        return {
            modeIndicator: document.getElementById('mode-indicator')!,
            usePotionBtn: document.getElementById('use-potion-btn')! as HTMLButtonElement,
            useManaPotionBtn: document.getElementById('use-mana-potion-btn')! as HTMLButtonElement,
            newCharacterBtn: document.getElementById('new-character-btn')! as HTMLButtonElement,
            playerLevel: document.getElementById('player-level')!,
            playerXp: document.getElementById('player-xp')!,
            playerXpNext: document.getElementById('player-xp-next')!,
            playerHp: document.getElementById('player-hp')!,
            playerMaxHp: document.getElementById('player-max-hp')!,
            playerMana: document.getElementById('player-mana')!,
            playerMaxMana: document.getElementById('player-max-mana')!,
            playerDmg: document.getElementById('player-dmg')!,
            playerDmgFormula: document.getElementById('player-dmg-formula')!,
            playerArmor: document.getElementById('player-armor')!,
            playerDodge: document.getElementById('player-dodge')!,
            playerDodgeFormula: document.getElementById('player-dodge-formula')!,
            playerWeapon: document.getElementById('player-weapon')!,
            playerGold: document.getElementById('player-gold')!,
            skillPoints: document.getElementById('skill-points')!,
            magicPoints: document.getElementById('magic-points')!,
            statVitality: document.getElementById('stat-vitality')!,
            statToughness: document.getElementById('stat-toughness')!,
            statStrength: document.getElementById('stat-strength')!,
            statAgility: document.getElementById('stat-agility')!,
            statConnection: document.getElementById('stat-connection')!,
            statIntelligence: document.getElementById('stat-intelligence')!,
            addVitalityBtn: document.getElementById('add-vitality-btn')! as HTMLButtonElement,
            addToughnessBtn: document.getElementById('add-toughness-btn')! as HTMLButtonElement,
            addStrengthBtn: document.getElementById('add-strength-btn')! as HTMLButtonElement,
            addAgilityBtn: document.getElementById('add-agility-btn')! as HTMLButtonElement,
            addConnectionBtn: document.getElementById('add-connection-btn')! as HTMLButtonElement,
            addIntelligenceBtn: document.getElementById('add-intelligence-btn')! as HTMLButtonElement,
            upgradeFireballBtn: document.getElementById('upgrade-fireball-btn')! as HTMLButtonElement,
            upgradeCurseBtn: document.getElementById('upgrade-curse-btn')! as HTMLButtonElement,
            upgradeSlowBtn: document.getElementById('upgrade-slow-btn')! as HTMLButtonElement,
            upgradeRageBtn: document.getElementById('upgrade-rage-btn')! as HTMLButtonElement,
            upgradeArcaneLanceBtn: document.getElementById('upgrade-arcane-lance-btn')! as HTMLButtonElement,
            spellLevelFireball: document.getElementById('spell-level-fireball')!,
            spellLevelCurse: document.getElementById('spell-level-curse')!,
            spellLevelSlow: document.getElementById('spell-level-slow')!,
            spellLevelRage: document.getElementById('spell-level-rage')!,
            spellLevelArcaneLance: document.getElementById('spell-level-arcane-lance')!,
            spellDetailsFireball: document.getElementById('spell-details-fireball')!,
            spellDetailsCurse: document.getElementById('spell-details-curse')!,
            spellDetailsSlow: document.getElementById('spell-details-slow')!,
            spellDetailsRage: document.getElementById('spell-details-rage')!,
            spellDetailsArcaneLance: document.getElementById('spell-details-arcane-lance')!,
            inventoryCount: document.getElementById('inventory-count')!,
            inventoryCapacity: document.getElementById('inventory-capacity')!,
            inventoryGrid: document.getElementById('inventory-grid')!,
            weaponSlotMain: document.getElementById('weapon-slot-main')! as HTMLButtonElement,
            weaponSlotOff: document.getElementById('weapon-slot-off')! as HTMLButtonElement,
            armorSlot: document.getElementById('armor-slot')! as HTMLButtonElement,
            statsPanel: document.getElementById('stats-panel')!,
            skillsPanel: document.getElementById('skills-panel')!,
            inventoryPanel: document.getElementById('inventory-panel')!,
            magicPanel: document.getElementById('magic-panel')!,
            toggleStatsPanelBtn: document.getElementById('toggle-stats-panel-btn')! as HTMLButtonElement,
            toggleSkillsPanelBtn: document.getElementById('toggle-skills-panel-btn')! as HTMLButtonElement,
            toggleInventoryPanelBtn: document.getElementById('toggle-inventory-panel-btn')! as HTMLButtonElement,
            toggleMagicPanelBtn: document.getElementById('toggle-magic-panel-btn')! as HTMLButtonElement,
        };
    }

    private createBattleUi(): BattleUI {
        const fleeBtn = document.getElementById('flee-btn')! as HTMLButtonElement;
        const fleePercent = Math.round(balanceConfig.combat.fleeChance * 100);
        fleeBtn.textContent = `Flee (${fleePercent}%)`;

        return {
            sidebar: document.getElementById('battle-sidebar')!,
            enemyName: document.getElementById('enemy-name')!,
            enemyHp: document.getElementById('enemy-hp')!,
            enemyMaxHp: document.getElementById('enemy-max-hp')!,
            attackBtn: document.getElementById('attack-btn')! as HTMLButtonElement,
            fleeBtn,
            waitBtn: document.getElementById('wait-btn')! as HTMLButtonElement,
            usePotionBtn: document.getElementById('battle-use-potion-btn')! as HTMLButtonElement,
            useManaPotionBtn: document.getElementById('battle-use-mana-potion-btn')! as HTMLButtonElement,
            spellFireballBtn: document.getElementById('spell-fireball-btn')! as HTMLButtonElement,
            spellCurseBtn: document.getElementById('spell-curse-btn')! as HTMLButtonElement,
            spellSlowBtn: document.getElementById('spell-slow-btn')! as HTMLButtonElement,
            spellRageBtn: document.getElementById('spell-rage-btn')! as HTMLButtonElement,
            spellArcaneLanceBtn: document.getElementById('spell-arcane-lance-btn')! as HTMLButtonElement,
            attackRangeText: document.getElementById('attack-range-text')!,
        };
    }

    private createVillageUi(): VillageUI {
        return {
            sidebar: document.getElementById('village-sidebar')!,
            prompt: document.getElementById('village-prompt')!,
            actions: document.getElementById('village-actions')!,
            enterBtn: document.getElementById('village-enter-btn')! as HTMLButtonElement,
            skipBtn: document.getElementById('village-skip-btn')! as HTMLButtonElement,
            waitBtn: document.getElementById('village-wait-btn')! as HTMLButtonElement,
            buyBtn: document.getElementById('village-buy-btn')! as HTMLButtonElement,
            sellBtn: document.getElementById('village-sell-btn')! as HTMLButtonElement,
            buyPotionBtn: document.getElementById('village-buy-potion-btn')! as HTMLButtonElement,
            sellPotionBtn: document.getElementById('village-sell-potion-btn')! as HTMLButtonElement,
            buyManaPotionBtn: document.getElementById('village-buy-mana-potion-btn')! as HTMLButtonElement,
            sellManaPotionBtn: document.getElementById('village-sell-mana-potion-btn')! as HTMLButtonElement,
            leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
        };
    }


    private createGameLogUi(): GameLogUI {
        return {
            log: document.getElementById('game-log')!,
        };
    }
    private createDeveloperUi(): DeveloperUI {
        return {
            modal: document.getElementById('dev-events-modal')!,
            closeBtn: document.getElementById('dev-events-close-btn')! as HTMLButtonElement,
            eventType: document.getElementById('dev-event-type')! as HTMLSelectElement,
            queueList: document.getElementById('dev-events-queue')!,
            addBtn: document.getElementById('dev-event-add-btn')! as HTMLButtonElement,
            clearBtn: document.getElementById('dev-event-clear-btn')! as HTMLButtonElement,
        };
    }
}
