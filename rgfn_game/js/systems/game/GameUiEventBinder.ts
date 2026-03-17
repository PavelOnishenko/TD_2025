import VillageActionsController from '../village/VillageActionsController.js';
import DeveloperEventController from '../encounter/DeveloperEventController.js';
import { BattleUI, DeveloperUI, HudElements, VillageUI } from './GameUiTypes.js';
import { BaseSpellId } from '../magic/MagicSystem.js';

type GameUiEventCallbacks = {
    onAttack: () => void;
    onFlee: () => void;
    onWait: () => void;
    onUsePotionFromBattle: () => void;
    onUseManaPotionFromBattle: () => void;
    onUsePotionFromHud: () => void;
    onUseManaPotionFromHud: () => void;
    onNewCharacter: () => void;
    onAddStat: (stat: 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence') => void;
    onRemoveStat: (stat: 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence') => void;
    onSaveSkillChanges: () => void;
    onCastSpell: (spellId: BaseSpellId) => void;
    onUpgradeSpell: (spellId: BaseSpellId) => void;
    onCanvasClick: (event: MouseEvent) => void;
    onTogglePanel: (panel: 'stats' | 'skills' | 'inventory' | 'magic') => void;
};

export default class GameUiEventBinder {
    private canvas: HTMLCanvasElement;
    private hudElements: HudElements;
    private battleUI: BattleUI;
    private villageUI: VillageUI;
    private developerUI: DeveloperUI;
    private villageActionsController: VillageActionsController;
    private developerEventController: DeveloperEventController;
    private callbacks: GameUiEventCallbacks;

    constructor(
        canvas: HTMLCanvasElement,
        hudElements: HudElements,
        battleUI: BattleUI,
        villageUI: VillageUI,
        developerUI: DeveloperUI,
        villageActionsController: VillageActionsController,
        developerEventController: DeveloperEventController,
        callbacks: GameUiEventCallbacks,
    ) {
        this.canvas = canvas;
        this.hudElements = hudElements;
        this.battleUI = battleUI;
        this.villageUI = villageUI;
        this.developerUI = developerUI;
        this.villageActionsController = villageActionsController;
        this.developerEventController = developerEventController;
        this.callbacks = callbacks;
    }

    public bind(villageNameProvider: () => string): void {
        this.bindBattleEvents();
        this.bindVillageEvents(villageNameProvider);
        this.bindDeveloperEvents();
        this.bindStatEvents();

        this.canvas.addEventListener('click', (event: MouseEvent) => this.callbacks.onCanvasClick(event));
    }

    private bindBattleEvents(): void {
        this.battleUI.attackBtn.addEventListener('click', () => this.callbacks.onAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.callbacks.onFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.callbacks.onWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromBattle());
        this.battleUI.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromBattle());
        this.battleUI.spellFireballBtn.addEventListener('click', () => this.callbacks.onCastSpell('fireball'));
        this.battleUI.spellCurseBtn.addEventListener('click', () => this.callbacks.onCastSpell('curse'));
        this.battleUI.spellSlowBtn.addEventListener('click', () => this.callbacks.onCastSpell('slow'));
        this.battleUI.spellRageBtn.addEventListener('click', () => this.callbacks.onCastSpell('rage'));
        this.battleUI.spellArcaneLanceBtn.addEventListener('click', () => this.callbacks.onCastSpell('arcane-lance'));
        this.hudElements.usePotionBtn.addEventListener('click', () => this.callbacks.onUsePotionFromHud());
        this.hudElements.useManaPotionBtn.addEventListener('click', () => this.callbacks.onUseManaPotionFromHud());
        this.hudElements.newCharacterBtn.addEventListener('click', () => this.callbacks.onNewCharacter());
        this.hudElements.toggleStatsPanelBtn.addEventListener('click', () => this.callbacks.onTogglePanel('stats'));
        this.hudElements.toggleSkillsPanelBtn.addEventListener('click', () => this.callbacks.onTogglePanel('skills'));
        this.hudElements.toggleInventoryPanelBtn.addEventListener('click', () => this.callbacks.onTogglePanel('inventory'));
        this.hudElements.toggleMagicPanelBtn.addEventListener('click', () => this.callbacks.onTogglePanel('magic'));
    }

    private bindVillageEvents(villageNameProvider: () => string): void {
        this.villageUI.enterBtn.addEventListener('click', () => this.villageActionsController.handleEnter(villageNameProvider()));
        this.villageUI.skipBtn.addEventListener('click', () => this.villageActionsController.handleSkip());
        this.villageUI.waitBtn.addEventListener('click', () => this.villageActionsController.handleWait());
        this.villageUI.buyOffer1Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(0));
        this.villageUI.buyOffer2Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(1));
        this.villageUI.buyOffer3Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(2));
        this.villageUI.buyOffer4Btn.addEventListener('click', () => this.villageActionsController.handleBuyOffer(3));
        this.villageUI.sellSelect.addEventListener('change', () => this.villageActionsController.updateButtons());
        this.villageUI.sellSelectedBtn.addEventListener('click', () => this.villageActionsController.handleSellSelected());
        this.villageUI.leaveBtn.addEventListener('click', () => this.villageActionsController.handleLeave());
    }

    private bindDeveloperEvents(): void {
        this.developerUI.addBtn.addEventListener('click', () => this.developerEventController.handleQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.developerEventController.handleQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.developerEventController.toggleModal(false));
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.modal) {
                this.developerEventController.toggleModal(false);
            }
        });
    }

    private bindStatEvents(): void {
        this.hudElements.addVitalityBtn.addEventListener('click', () => this.callbacks.onAddStat('vitality'));
        this.hudElements.addToughnessBtn.addEventListener('click', () => this.callbacks.onAddStat('toughness'));
        this.hudElements.addStrengthBtn.addEventListener('click', () => this.callbacks.onAddStat('strength'));
        this.hudElements.addAgilityBtn.addEventListener('click', () => this.callbacks.onAddStat('agility'));
        this.hudElements.addConnectionBtn.addEventListener('click', () => this.callbacks.onAddStat('connection'));
        this.hudElements.addIntelligenceBtn.addEventListener('click', () => this.callbacks.onAddStat('intelligence'));
        this.hudElements.subVitalityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('vitality'));
        this.hudElements.subToughnessBtn.addEventListener('click', () => this.callbacks.onRemoveStat('toughness'));
        this.hudElements.subStrengthBtn.addEventListener('click', () => this.callbacks.onRemoveStat('strength'));
        this.hudElements.subAgilityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('agility'));
        this.hudElements.subConnectionBtn.addEventListener('click', () => this.callbacks.onRemoveStat('connection'));
        this.hudElements.subIntelligenceBtn.addEventListener('click', () => this.callbacks.onRemoveStat('intelligence'));
        this.hudElements.saveSkillsBtn.addEventListener('click', () => this.callbacks.onSaveSkillChanges());
        this.hudElements.upgradeFireballBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('fireball'));
        this.hudElements.upgradeCurseBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('curse'));
        this.hudElements.upgradeSlowBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('slow'));
        this.hudElements.upgradeRageBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('rage'));
        this.hudElements.upgradeArcaneLanceBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('arcane-lance'));
    }
}
