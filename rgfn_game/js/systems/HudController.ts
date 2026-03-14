import Player from '../entities/Player.js';
import Item from '../entities/Item.js';
import { balanceConfig } from '../config/balanceConfig.js';

type HudElements = {
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
};

type BattleUiHudElements = {
    usePotionBtn: HTMLButtonElement;
    attackRangeText: HTMLElement;
};

export default class HudController {
    private player: Player;
    private hudElements: HudElements;
    private battleUI: BattleUiHudElements;

    constructor(player: Player, hudElements: HudElements, battleUI: BattleUiHudElements) {
        this.player = player;
        this.hudElements = hudElements;
        this.battleUI = battleUI;
    }

    public updateHUD(): void {
        this.hudElements.playerLevel.textContent = String(this.player.level);
        this.hudElements.playerXp.textContent = String(this.player.xp);
        this.hudElements.playerXpNext.textContent = String(this.player.xpToNextLevel);
        this.hudElements.playerHp.textContent = String(this.player.hp);
        this.hudElements.playerMaxHp.textContent = String(this.player.maxHp);
        this.hudElements.playerDmg.textContent = String(this.player.damage);
        this.hudElements.playerDmgFormula.textContent = this.player.getDamageFormulaText();
        this.hudElements.playerArmor.textContent = String(this.player.armor);
        this.hudElements.playerDodge.textContent = `${(this.player.avoidChance * 100).toFixed(1)}%`;
        this.hudElements.playerDodgeFormula.textContent = this.player.getAvoidFormulaText();
        this.hudElements.skillPoints.textContent = String(this.player.skillPoints);
        this.hudElements.statVitality.textContent = String(this.player.vitality);
        this.hudElements.statToughness.textContent = String(this.player.toughness);
        this.hudElements.statStrength.textContent = String(this.player.strength);
        this.hudElements.statAgility.textContent = String(this.player.agility);

        this.hudElements.playerWeapon.textContent = this.player.equippedWeapon
            ? this.player.equippedWeapon.name
            : 'None';
        this.hudElements.playerGold.textContent = String(this.player.gold);

        const inventory = this.player.getInventory();
        this.hudElements.inventoryCount.textContent = String(inventory.length);
        this.hudElements.inventoryCapacity.textContent = String(balanceConfig.player.inventorySize);
        this.renderInventory(inventory);

        const hasPotion = this.player.getHealingPotionCount() > 0;
        this.hudElements.usePotionBtn.disabled = !hasPotion;
        this.battleUI.usePotionBtn.disabled = !hasPotion;

        const attackRange = this.player.getAttackRange();
        this.battleUI.attackRangeText.textContent = attackRange === 1
            ? 'Attack when adjacent (1 tile)'
            : `Attack from ${attackRange} tiles away`;

        this.updateStatButtons();
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
                sprite.className = item.id === 'bow'
                    ? 'item-sprite bow-sprite'
                    : 'item-sprite potion-sprite';
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
    }
}
