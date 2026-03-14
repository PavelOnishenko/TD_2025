import { BattleUI, DeveloperUI, GameUiBundle, HudElements, VillageUI } from './GameUiTypes.js';
import { balanceConfig } from '../../config/balanceConfig.js';

export default class GameUiFactory {
    public create(): GameUiBundle {
        return {
            hudElements: this.createHudElements(),
            battleUI: this.createBattleUi(),
            villageUI: this.createVillageUi(),
            developerUI: this.createDeveloperUi(),
        };
    }

    private createHudElements(): HudElements {
        return {
            modeIndicator: document.getElementById('mode-indicator')!,
            usePotionBtn: document.getElementById('use-potion-btn')! as HTMLButtonElement,
            playerLevel: document.getElementById('player-level')!,
            playerXp: document.getElementById('player-xp')!,
            playerXpNext: document.getElementById('player-xp-next')!,
            playerHp: document.getElementById('player-hp')!,
            playerMaxHp: document.getElementById('player-max-hp')!,
            playerDmg: document.getElementById('player-dmg')!,
            playerDmgFormula: document.getElementById('player-dmg-formula')!,
            playerArmor: document.getElementById('player-armor')!,
            playerDodge: document.getElementById('player-dodge')!,
            playerDodgeFormula: document.getElementById('player-dodge-formula')!,
            playerWeapon: document.getElementById('player-weapon')!,
            playerGold: document.getElementById('player-gold')!,
            skillPoints: document.getElementById('skill-points')!,
            statVitality: document.getElementById('stat-vitality')!,
            statToughness: document.getElementById('stat-toughness')!,
            statStrength: document.getElementById('stat-strength')!,
            statAgility: document.getElementById('stat-agility')!,
            addVitalityBtn: document.getElementById('add-vitality-btn')! as HTMLButtonElement,
            addToughnessBtn: document.getElementById('add-toughness-btn')! as HTMLButtonElement,
            addStrengthBtn: document.getElementById('add-strength-btn')! as HTMLButtonElement,
            addAgilityBtn: document.getElementById('add-agility-btn')! as HTMLButtonElement,
            inventoryCount: document.getElementById('inventory-count')!,
            inventoryCapacity: document.getElementById('inventory-capacity')!,
            inventoryGrid: document.getElementById('inventory-grid')!,
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
            log: document.getElementById('battle-log')!,
            attackRangeText: document.getElementById('attack-range-text')!,
        };
    }

    private createVillageUi(): VillageUI {
        return {
            sidebar: document.getElementById('village-sidebar')!,
            prompt: document.getElementById('village-prompt')!,
            actions: document.getElementById('village-actions')!,
            log: document.getElementById('village-log')!,
            enterBtn: document.getElementById('village-enter-btn')! as HTMLButtonElement,
            skipBtn: document.getElementById('village-skip-btn')! as HTMLButtonElement,
            waitBtn: document.getElementById('village-wait-btn')! as HTMLButtonElement,
            buyBtn: document.getElementById('village-buy-btn')! as HTMLButtonElement,
            sellBtn: document.getElementById('village-sell-btn')! as HTMLButtonElement,
            buyPotionBtn: document.getElementById('village-buy-potion-btn')! as HTMLButtonElement,
            sellPotionBtn: document.getElementById('village-sell-potion-btn')! as HTMLButtonElement,
            leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
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
