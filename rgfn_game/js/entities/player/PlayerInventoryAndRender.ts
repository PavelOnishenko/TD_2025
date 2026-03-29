import { calculateBowDamageBonus, calculateMeleeDamageBonus } from '../../config/levelConfig.js';
import { normalizeCreatureSkills } from '../../config/creatureStats.js';
import { CreatureSkills } from '../../config/creatureTypes.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import Item from '../Item.js';
import PlayerCombatState from './PlayerCombatState.js';

export default class PlayerInventoryAndRender extends PlayerCombatState {
    public get equippedWeapon(): Item | null { return this.inventorySystem.getEquippedWeapon(); }
    public set equippedWeapon(weapon: Item | null) { this.inventorySystem.setEquippedWeapon(weapon); }
    public set equippedOffhandWeapon(weapon: Item | null) { this.inventorySystem.setEquippedOffhandWeapon(weapon); }

    public addItemToInventory(item: Item): boolean { return this.inventorySystem.addItem(item); }
    public useHealingPotion(): boolean { return this.inventorySystem.useHealingPotion(); }
    public getInventory(): Item[] { return this.inventorySystem.getItems(); }
    public getHealingPotionCount(): number { return this.inventorySystem.getHealingPotionCount(); }
    public getManaPotionCount(): number { return this.inventorySystem.getManaPotionCount(); }
    public useManaPotion(): boolean { return this.inventorySystem.useManaPotion(); }
    public removeHealingPotionFromInventory(): boolean { return this.inventorySystem.removeHealingPotion(); }
    public removeManaPotionFromInventory(): boolean { return this.inventorySystem.removeManaPotion(); }
    public removeInventoryItemAt(index: number): Item | null { return this.inventorySystem.removeItemAt(index); }
    public unequipWeapon(): Item | null { return this.inventorySystem.unequipWeapon(); }
    public unequipOffhandWeapon(): Item | null { return this.inventorySystem.unequipOffhandWeapon(); }
    public equipWeaponToSlot(weapon: Item, slot: 'main' | 'offhand'): void { this.inventorySystem.equipWeaponToSlot(weapon, slot); }
    public unequipArmor(): Item | null { return this.inventorySystem.unequipArmor(); }
    public getAttackRange(): number { return this.inventorySystem.getAttackRange(); }
    public hasWeapon(): boolean { return this.inventorySystem.hasWeapon(); }

    public getAvoidFormulaText(): string {
        const scale = balanceConfig.stats.avoidChanceScale;
        const capPercent = Math.round(balanceConfig.stats.avoidChanceCap * 100);
        const rawChance = 1 - (1 / (1 + (this.agility * scale)));
        const finalChance = Math.min(balanceConfig.stats.avoidChanceCap, rawChance);
        return `min(${capPercent}%, (1 - 1/(1 + AGI×${scale.toFixed(3)}))×100) = ${(finalChance * 100).toFixed(1)}%`;
    }

    public getDamageFormulaText(): string {
        const fist = balanceConfig.combat.fistDamagePerHand;
        const main = this.equippedMainWeapon;
        const off = this.equippedOffhandWeapon;
        const meleeBonus = calculateMeleeDamageBonus(this.strength, this.agility);
        if (!main && !off) {return `Unarmed: (${fist} + ${meleeBonus}) + (${fist} + ${meleeBonus}) = ${this.damage}`;}
        if (main?.handsRequired === 2) {
            const statBonus = main.isRanged ? calculateBowDamageBonus(this.strength, this.agility) : meleeBonus;
            return `${main.isRanged ? 'Ranged' : 'Melee'} (2H): weapon ${main.damageBonus} + stat bonus ${statBonus} = ${this.damage}`;
        }
        const rangedBonus = calculateBowDamageBonus(this.strength, this.agility);
        const mainText = main ? `${main.name} (${main.damageBonus} + ${main.isRanged ? rangedBonus : meleeBonus})` : `Fist (${fist} + ${meleeBonus})`;
        const offText = off ? `${off.name} (${off.damageBonus} + ${off.isRanged ? rangedBonus : meleeBonus})` : `Fist (${fist} + ${meleeBonus})`;
        return `Dual hand: main ${mainText} + off ${offText} = ${this.damage}`;
    }

    public draw(ctx: CanvasRenderingContext2D, _viewport?: any): void { this.renderer.draw(ctx, this); }

    public getSkillRecord(): CreatureSkills {
        return normalizeCreatureSkills({
            vitality: this.vitality,
            toughness: this.toughness,
            strength: this.strength,
            agility: this.agility,
            connection: this.connection,
            intelligence: this.intelligence,
        });
    }
}