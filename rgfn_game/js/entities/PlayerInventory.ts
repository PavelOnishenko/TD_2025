import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';

type PlayerInventoryHooks = {
    onWeaponChanged: () => void;
    onHealingPotionUsed: () => void;
    onManaPotionUsed: () => void;
};

export default class PlayerInventory {
    private readonly hooks: PlayerInventoryHooks;
    private readonly inventory: Item[] = [];
    private equippedWeapon: Item | null = null;

    constructor(hooks: PlayerInventoryHooks) {
        this.hooks = hooks;
    }

    public addItem(item: Item): boolean {
        if (this.inventory.length >= balanceConfig.player.inventorySize) {
            return false;
        }

        this.inventory.push(item);
        if (item.type === 'weapon') {
            this.setEquippedWeapon(item);
        }
        return true;
    }

    public useHealingPotion(): boolean {
        const potionIndex = this.findPotionIndex('healingPotion');
        if (potionIndex === -1) {
            return false;
        }

        this.inventory.splice(potionIndex, 1);
        this.hooks.onHealingPotionUsed();
        return true;
    }

    public useManaPotion(): boolean {
        const potionIndex = this.findPotionIndex('manaPotion');
        if (potionIndex === -1) {
            return false;
        }

        this.inventory.splice(potionIndex, 1);
        this.hooks.onManaPotionUsed();
        return true;
    }

    public getItems(): Item[] {
        return [...this.inventory];
    }

    public getHealingPotionCount(): number {
        return this.inventory.filter((item) => item.id === 'healingPotion').length;
    }

    public getManaPotionCount(): number {
        return this.inventory.filter((item) => item.id === 'manaPotion').length;
    }

    public removeHealingPotion(): boolean {
        return this.removePotionById('healingPotion');
    }

    public removeManaPotion(): boolean {
        return this.removePotionById('manaPotion');
    }

    public unequipWeapon(): Item | null {
        const weapon = this.equippedWeapon;
        this.setEquippedWeapon(null);
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

    public setEquippedWeapon(weapon: Item | null): void {
        this.equippedWeapon = weapon;
        this.hooks.onWeaponChanged();
    }

    private removePotionById(id: 'healingPotion' | 'manaPotion'): boolean {
        const potionIndex = this.findPotionIndex(id);
        if (potionIndex === -1) {
            return false;
        }

        this.inventory.splice(potionIndex, 1);
        return true;
    }

    private findPotionIndex(id: 'healingPotion' | 'manaPotion'): number {
        return this.inventory.findIndex((item) => item.id === id);
    }
}
