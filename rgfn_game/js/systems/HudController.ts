import Player from '../entities/Player.js';
import Item from '../entities/Item.js';
import { balanceConfig } from '../config/balanceConfig.js';
import MagicSystem from './magic/MagicSystem.js';

type HudElements = {
    usePotionBtn: HTMLButtonElement;
    useManaPotionBtn: HTMLButtonElement;
    playerLevel: HTMLElement;
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
    inventoryCount: HTMLElement;
    inventoryCapacity: HTMLElement;
    inventoryGrid: HTMLElement;
};

type BattleUiHudElements = {
    usePotionBtn: HTMLButtonElement;
    useManaPotionBtn: HTMLButtonElement;
    attackRangeText: HTMLElement;
    spellFireballBtn: HTMLButtonElement;
    spellCurseBtn: HTMLButtonElement;
    spellSlowBtn: HTMLButtonElement;
    spellRageBtn: HTMLButtonElement;
    spellArcaneLanceBtn: HTMLButtonElement;
};

export default class HudController {
    private player: Player;
    private hudElements: HudElements;
    private battleUI: BattleUiHudElements;
    private magicSystem: MagicSystem;

    constructor(player: Player, hudElements: HudElements, battleUI: BattleUiHudElements, magicSystem: MagicSystem) {
        this.player = player;
        this.hudElements = hudElements;
        this.battleUI = battleUI;
        this.magicSystem = magicSystem;
    }

    public updateHUD(): void {
        this.hudElements.playerLevel.textContent = String(this.player.level);
        this.hudElements.playerXp.textContent = String(this.player.xp);
        this.hudElements.playerXpNext.textContent = String(this.player.xpToNextLevel);
        this.hudElements.playerHp.textContent = String(this.player.hp);
        this.hudElements.playerMaxHp.textContent = String(this.player.maxHp);
        this.hudElements.playerMana.textContent = String(this.player.mana);
        this.hudElements.playerMaxMana.textContent = String(this.player.maxMana);
        this.hudElements.playerDmg.textContent = String(this.player.getPhysicalDamageWithBuff());
        this.hudElements.playerDmgFormula.textContent = this.player.getDamageFormulaText();
        this.hudElements.playerArmor.textContent = String(this.player.armor);
        this.hudElements.playerDodge.textContent = `${(this.player.avoidChance * 100).toFixed(1)}%`;
        this.hudElements.playerDodgeFormula.textContent = this.player.getAvoidFormulaText();
        this.hudElements.skillPoints.textContent = String(this.player.skillPoints);
        this.hudElements.magicPoints.textContent = String(this.player.magicPoints);
        this.hudElements.statVitality.textContent = String(this.player.vitality);
        this.hudElements.statToughness.textContent = String(this.player.toughness);
        this.hudElements.statStrength.textContent = String(this.player.strength);
        this.hudElements.statAgility.textContent = String(this.player.agility);
        this.hudElements.statConnection.textContent = String(this.player.connection);
        this.hudElements.statIntelligence.textContent = String(this.player.intelligence);

        const spellLevels = this.magicSystem.getSpellLevels();
        this.hudElements.spellLevelFireball.textContent = String(spellLevels.fireball);
        this.hudElements.spellLevelCurse.textContent = String(spellLevels.curse);
        this.hudElements.spellLevelSlow.textContent = String(spellLevels.slow);
        this.hudElements.spellLevelRage.textContent = String(spellLevels.rage);
        this.hudElements.spellLevelArcaneLance.textContent = String(spellLevels['arcane-lance']);

        this.hudElements.playerWeapon.textContent = this.player.equippedWeapon ? this.player.equippedWeapon.name : 'None';
        this.hudElements.playerGold.textContent = String(this.player.gold);

        const inventory = this.player.getInventory();
        this.hudElements.inventoryCount.textContent = String(inventory.length);
        this.hudElements.inventoryCapacity.textContent = String(balanceConfig.player.inventorySize);
        this.renderInventory(inventory);

        const hasHpPotion = this.player.getHealingPotionCount() > 0;
        const hasManaPotion = this.player.getManaPotionCount() > 0;
        this.hudElements.usePotionBtn.disabled = !hasHpPotion;
        this.battleUI.usePotionBtn.disabled = !hasHpPotion;
        this.hudElements.useManaPotionBtn.disabled = !hasManaPotion;
        this.battleUI.useManaPotionBtn.disabled = !hasManaPotion;

        const attackRange = this.player.getAttackRange();
        this.battleUI.attackRangeText.textContent = attackRange === 1 ? 'Attack when adjacent (1 tile)' : `Attack from ${attackRange} tiles away`;

        this.updateStatButtons();
        this.updateSpellButtons();
    }

    private renderInventory(inventory: Item[]): void {
        this.hudElements.inventoryGrid.innerHTML = '';

        for (let index = 0; index < balanceConfig.player.inventorySize; index++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';

            const item = inventory[index];
            if (item) {
                slot.title = item.name;

                const sprite = document.createElement('div');
                if (item.id === 'bow') {
                    sprite.className = 'item-sprite bow-sprite';
                } else if (item.id === 'manaPotion') {
                    sprite.className = 'item-sprite mana-potion-sprite';
                } else {
                    sprite.className = 'item-sprite potion-sprite';
                }
                slot.appendChild(sprite);
            } else {
                slot.classList.add('empty');
            }

            this.hudElements.inventoryGrid.appendChild(slot);
        }
    }

    private updateStatButtons(): void {
        const hasSkillPoints = this.player.skillPoints > 0;
        this.hudElements.addVitalityBtn.disabled = !hasSkillPoints;
        this.hudElements.addToughnessBtn.disabled = !hasSkillPoints;
        this.hudElements.addStrengthBtn.disabled = !hasSkillPoints;
        this.hudElements.addAgilityBtn.disabled = !hasSkillPoints;
        this.hudElements.addConnectionBtn.disabled = !hasSkillPoints;
        this.hudElements.addIntelligenceBtn.disabled = !hasSkillPoints;

        const hasMagicPoints = this.player.magicPoints > 0;
        this.hudElements.upgradeFireballBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeCurseBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeSlowBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeRageBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeArcaneLanceBtn.disabled = !hasMagicPoints;
    }

    private updateSpellButtons(): void {
        const availableSpells = this.magicSystem.getAvailableSpells();
        const manaBySpell = new Map(availableSpells.map((spell) => [spell.id.split('-lvl-')[0], spell.manaCost]));
        this.battleUI.spellFireballBtn.disabled = !this.player.canSpendMana(manaBySpell.get('fireball') ?? 999);
        this.battleUI.spellCurseBtn.disabled = !this.player.canSpendMana(manaBySpell.get('curse') ?? 999);
        this.battleUI.spellSlowBtn.disabled = !this.player.canSpendMana(manaBySpell.get('slow') ?? 999);
        this.battleUI.spellRageBtn.disabled = !this.player.canSpendMana(manaBySpell.get('rage') ?? 999);
        this.battleUI.spellArcaneLanceBtn.disabled = !this.player.canSpendMana(manaBySpell.get('arcane-lance') ?? 999);
    }
}
