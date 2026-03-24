import { BattleUI, DeveloperUI, GameLogUI, GameUiBundle, HudElements, VillageUI, WorldUI } from './GameUiTypes.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import { CombatMove } from '../combat/DirectionalCombat.js';

export default class GameUiFactory {
    public create(): GameUiBundle {
        return {
            hudElements: this.createHudElements(),
            worldUI: this.createWorldUi(),
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
            worldMapZoomInBtn: document.getElementById('world-map-zoom-in-btn')! as HTMLButtonElement,
            worldMapZoomOutBtn: document.getElementById('world-map-zoom-out-btn')! as HTMLButtonElement,
            worldMapPanUpBtn: document.getElementById('world-map-pan-up-btn')! as HTMLButtonElement,
            worldMapPanDownBtn: document.getElementById('world-map-pan-down-btn')! as HTMLButtonElement,
            worldMapPanLeftBtn: document.getElementById('world-map-pan-left-btn')! as HTMLButtonElement,
            worldMapPanRightBtn: document.getElementById('world-map-pan-right-btn')! as HTMLButtonElement,
            playerLevel: document.getElementById('player-level')!,
            playerName: document.getElementById('player-name')!,
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
            magicPanelPoints: document.getElementById('magic-panel-points')!,
            statVitality: document.getElementById('stat-vitality')!,
            statToughness: document.getElementById('stat-toughness')!,
            statStrength: document.getElementById('stat-strength')!,
            statAgility: document.getElementById('stat-agility')!,
            statConnection: document.getElementById('stat-connection')!,
            statIntelligence: document.getElementById('stat-intelligence')!,
            addVitalityBtn: document.getElementById('add-vitality-btn')! as HTMLButtonElement,
            subVitalityBtn: document.getElementById('sub-vitality-btn')! as HTMLButtonElement,
            addToughnessBtn: document.getElementById('add-toughness-btn')! as HTMLButtonElement,
            subToughnessBtn: document.getElementById('sub-toughness-btn')! as HTMLButtonElement,
            addStrengthBtn: document.getElementById('add-strength-btn')! as HTMLButtonElement,
            subStrengthBtn: document.getElementById('sub-strength-btn')! as HTMLButtonElement,
            addAgilityBtn: document.getElementById('add-agility-btn')! as HTMLButtonElement,
            subAgilityBtn: document.getElementById('sub-agility-btn')! as HTMLButtonElement,
            addConnectionBtn: document.getElementById('add-connection-btn')! as HTMLButtonElement,
            subConnectionBtn: document.getElementById('sub-connection-btn')! as HTMLButtonElement,
            addIntelligenceBtn: document.getElementById('add-intelligence-btn')! as HTMLButtonElement,
            subIntelligenceBtn: document.getElementById('sub-intelligence-btn')! as HTMLButtonElement,
            saveSkillsBtn: document.getElementById('save-skills-btn')! as HTMLButtonElement,
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
            inventoryCapacityHint: document.getElementById('inventory-capacity-hint')!,
            inventoryGrid: document.getElementById('inventory-grid')!,
            weaponSlotMain: document.getElementById('weapon-slot-main')! as HTMLButtonElement,
            weaponSlotOff: document.getElementById('weapon-slot-off')! as HTMLButtonElement,
            armorSlot: document.getElementById('armor-slot')! as HTMLButtonElement,
            statsPanel: document.getElementById('stats-panel')!,
            skillsPanel: document.getElementById('skills-panel')!,
            inventoryPanel: document.getElementById('inventory-panel')!,
            magicPanel: document.getElementById('magic-panel')!,
            questsPanel: document.getElementById('quests-panel')!,
            selectedPanel: document.getElementById('selected-panel')!,
            lorePanel: document.getElementById('lore-panel')!,
            worldMapPanel: document.getElementById('world-sidebar')!,
            logPanel: document.getElementById('game-log-container')!,
            questsTitle: document.getElementById('quests-title')!,
            questsBody: document.getElementById('quests-body')!,
            loreBody: document.getElementById('lore-body')!,
            selectedCellEmpty: document.getElementById('selected-cell-empty')!,
            selectedCellDetails: document.getElementById('selected-cell-details')!,
            selectedCellCoords: document.getElementById('selected-cell-coords')!,
            selectedCellTerrain: document.getElementById('selected-cell-terrain')!,
            selectedCellVisibility: document.getElementById('selected-cell-visibility')!,
            selectedCellTraversable: document.getElementById('selected-cell-traversable')!,
            selectedCellVillage: document.getElementById('selected-cell-village')!,
            selectedCellVillageName: document.getElementById('selected-cell-village-name')!,
            selectedCellVillageStatus: document.getElementById('selected-cell-village-status')!,
            toggleStatsPanelBtn: document.getElementById('toggle-stats-panel-btn')! as HTMLButtonElement,
            toggleSkillsPanelBtn: document.getElementById('toggle-skills-panel-btn')! as HTMLButtonElement,
            toggleInventoryPanelBtn: document.getElementById('toggle-inventory-panel-btn')! as HTMLButtonElement,
            toggleMagicPanelBtn: document.getElementById('toggle-magic-panel-btn')! as HTMLButtonElement,
            toggleQuestsPanelBtn: document.getElementById('toggle-quests-panel-btn')! as HTMLButtonElement,
            toggleLorePanelBtn: document.getElementById('toggle-lore-panel-btn')! as HTMLButtonElement,
            toggleSelectedPanelBtn: document.getElementById('toggle-selected-panel-btn')! as HTMLButtonElement,
            toggleWorldMapPanelBtn: document.getElementById('toggle-world-map-panel-btn')! as HTMLButtonElement,
            toggleLogPanelBtn: document.getElementById('toggle-log-panel-btn')! as HTMLButtonElement,
            questIntroModal: document.getElementById('quest-intro-modal')!,
            questIntroBody: document.getElementById('quest-intro-body')!,
            questIntroCloseBtn: document.getElementById('quest-intro-close-btn')! as HTMLButtonElement,
        };
    }

    private createBattleUi(): BattleUI {
        const fleeBtn = document.getElementById('flee-btn')! as HTMLButtonElement;
        const fleePercent = Math.round(balanceConfig.combat.fleeChance * 100);
        fleeBtn.textContent = `Flee (${fleePercent}%)`;
        const directionalButtons = {
            AttackLeft: document.getElementById('attack-left-btn')! as HTMLButtonElement,
            AttackCenter: document.getElementById('attack-center-btn')! as HTMLButtonElement,
            AttackRight: document.getElementById('attack-right-btn')! as HTMLButtonElement,
            Block: document.getElementById('block-btn')! as HTMLButtonElement,
            DodgeLeft: document.getElementById('dodge-left-btn')! as HTMLButtonElement,
            DodgeRight: document.getElementById('dodge-right-btn')! as HTMLButtonElement,
        } satisfies Record<CombatMove, HTMLButtonElement>;

        return {
            sidebar: document.getElementById('battle-sidebar')!,
            enemyName: document.getElementById('enemy-name')!,
            enemyHp: document.getElementById('enemy-hp')!,
            enemyMaxHp: document.getElementById('enemy-max-hp')!,
            attackBtn: document.getElementById('attack-btn')! as HTMLButtonElement,
            directionalButtons,
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

    private createWorldUi(): WorldUI {
        return {
            sidebar: document.getElementById('world-sidebar')!,
            usePotionBtn: document.getElementById('world-use-potion-btn')! as HTMLButtonElement,
            centerOnCharacterBtn: document.getElementById('world-center-on-character-btn')! as HTMLButtonElement,
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
            buyOffer1Btn: document.getElementById('village-buy-offer-1-btn')! as HTMLButtonElement,
            buyOffer2Btn: document.getElementById('village-buy-offer-2-btn')! as HTMLButtonElement,
            buyOffer3Btn: document.getElementById('village-buy-offer-3-btn')! as HTMLButtonElement,
            buyOffer4Btn: document.getElementById('village-buy-offer-4-btn')! as HTMLButtonElement,
            sellSelect: document.getElementById('village-sell-select')! as HTMLSelectElement,
            sellSelectedBtn: document.getElementById('village-sell-selected-btn')! as HTMLButtonElement,
            leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
        };
    }

    private createGameLogUi(): GameLogUI {
        const logElement = document.getElementById('game-log')!;
        this.setupAutoScrollingGameLog(logElement);

        return {
            log: logElement,
        };
    }

    private setupAutoScrollingGameLog(logElement: HTMLElement): void {
        const scrollToLatest = (): void => {
            logElement.scrollTop = logElement.scrollHeight;
        };

        const observer = new MutationObserver((mutations): void => {
            const hasAddedNodes = mutations.some((mutation) => mutation.addedNodes.length > 0);
            if (!hasAddedNodes) {
                return;
            }

            scrollToLatest();
        });

        observer.observe(logElement, { childList: true });
        scrollToLatest();
    }

    private createDeveloperUi(): DeveloperUI {
        return {
            modal: document.getElementById('dev-events-modal')!,
            closeBtn: document.getElementById('dev-events-close-btn')! as HTMLButtonElement,
            eventType: document.getElementById('dev-event-type')! as HTMLSelectElement,
            queueList: document.getElementById('dev-events-queue')!,
            addBtn: document.getElementById('dev-event-add-btn')! as HTMLButtonElement,
            clearBtn: document.getElementById('dev-event-clear-btn')! as HTMLButtonElement,
            encounterTypeSummary: document.getElementById('dev-encounter-types-summary')!,
            enableAllEncountersBtn: document.getElementById('dev-encounter-types-enable-all-btn')! as HTMLButtonElement,
            disableAllEncountersBtn: document.getElementById('dev-encounter-types-disable-all-btn')! as HTMLButtonElement,
            encounterTypeToggles: {
                monster: document.getElementById('dev-encounter-type-monster')! as HTMLInputElement,
                item: document.getElementById('dev-encounter-type-item')! as HTMLInputElement,
                village: document.getElementById('dev-encounter-type-village')! as HTMLInputElement,
                traveler: document.getElementById('dev-encounter-type-traveler')! as HTMLInputElement,
            },
            nextRollOpenBtn: document.getElementById('dev-next-roll-open-btn')! as HTMLButtonElement,
            nextRollSummary: document.getElementById('dev-next-roll-summary')!,
            nextRollModal: document.getElementById('dev-next-roll-modal')!,
            nextRollCloseBtn: document.getElementById('dev-next-roll-close-btn')! as HTMLButtonElement,
            nextRollTotal: document.getElementById('dev-next-roll-total')!,
            nextRollStatus: document.getElementById('dev-next-roll-status')!,
            nextRollSaveBtn: document.getElementById('dev-next-roll-save-btn')! as HTMLButtonElement,
            nextRollClearBtn: document.getElementById('dev-next-roll-clear-btn')! as HTMLButtonElement,
            nextRollInputs: {
                vitality: document.getElementById('dev-next-roll-vitality')! as HTMLInputElement,
                toughness: document.getElementById('dev-next-roll-toughness')! as HTMLInputElement,
                strength: document.getElementById('dev-next-roll-strength')! as HTMLInputElement,
                agility: document.getElementById('dev-next-roll-agility')! as HTMLInputElement,
                connection: document.getElementById('dev-next-roll-connection')! as HTMLInputElement,
                intelligence: document.getElementById('dev-next-roll-intelligence')! as HTMLInputElement,
            },
            randomModeSelect: document.getElementById('dev-random-mode')! as HTMLSelectElement,
            randomSeedInput: document.getElementById('dev-random-seed')! as HTMLInputElement,
            randomSummary: document.getElementById('dev-random-summary')!,
            randomStatus: document.getElementById('dev-random-status')!,
            randomApplyBtn: document.getElementById('dev-random-apply-btn')! as HTMLButtonElement,
            everythingDiscoveredToggle: document.getElementById('dev-map-display-everything-discovered')! as HTMLInputElement,
            fogOfWarToggle: document.getElementById('dev-map-display-fog-of-war')! as HTMLInputElement,
        };
    }
}
