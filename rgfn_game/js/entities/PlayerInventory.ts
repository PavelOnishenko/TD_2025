import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';

type PlayerInventoryHooks = {
    onEquipmentChanged: () => void;
    onHealingPotionUsed: () => void;
    canEquip: (item: Item) => boolean;
};

export default class PlayerInventory {
    private readonly hooks: PlayerInventoryHooks;
    private readonly inventory: Item[] = [];
    private equippedWeapon: Item | null = null;
    private equippedArmor: Item | null = null;

    constructor(hooks: PlayerInventoryHooks) {
        this.hooks = hooks;
    }

    public addItem(item: Item): boolean {
        if (this.inventory.length >= balanceConfig.player.inventorySize) {
            return false;
        }

        this.inventory.push(item);
        if ((item.type === 'weapon' || item.type === 'armor') && this.hooks.canEquip(item)) {
            this.equipItem(item);
        }
        return true;
    }

    public useHealingPotion(): boolean {
        const potionIndex = this.findHealingPotionIndex();
        if (potionIndex === -1) {
            return false;
        }

        this.inventory.splice(potionIndex, 1);
        this.hooks.onHealingPotionUsed();
        return true;
    }

    public getItems(): Item[] {
        return [...this.inventory];
    }

    public getHealingPotionCount(): number {
        return this.inventory.filter((item) => item.id === 'healingPotion').length;
    }

    public removeHealingPotion(): boolean {
        const potionIndex = this.findHealingPotionIndex();
        if (potionIndex === -1) {
            return false;
        }

        this.inventory.splice(potionIndex, 1);
        return true;
    }

    public unequipWeapon(): Item | null {
        const weapon = this.equippedWeapon;
        this.equippedWeapon = null;
        this.hooks.onEquipmentChanged();
        return weapon;
    }

    public getAttackRange(): number {
        return this.equippedWeapon ? this.equippedWeapon.attackRange : 1;
    }

    public hasWeapon(): boolean {
        return this.equippedWeapon !== null;
    }

    public getEquippedWeapon(): Item | null {
        return this.equippedWeapon;
    }

    public getEquippedArmor(): Item | null {
        return this.equippedArmor;
    }

    public setEquippedWeapon(weapon: Item | null): void {
        this.equippedWeapon = weapon;
        this.hooks.onEquipmentChanged();
    }

    public setEquippedArmor(armor: Item | null): void {
        this.equippedArmor = armor;
        this.hooks.onEquipmentChanged();
    }

    private equipItem(item: Item): void {
        if (item.type === 'weapon') {
            this.equippedWeapon = item;
        }

        if (item.type === 'armor') {
            this.equippedArmor = item;
        }

        this.hooks.onEquipmentChanged();
    }

    private findHealingPotionIndex(): number {
        return this.inventory.findIndex((item) => item.id === 'healingPotion');
    }
}
