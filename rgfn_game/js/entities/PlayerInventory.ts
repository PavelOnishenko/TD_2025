import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';

type PlayerInventoryHooks = {
    onEquipmentChanged: () => void;
    onHealingPotionUsed: () => void;
    onManaPotionUsed: () => void;
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

    public removeItemAt(index: number): Item | null {
        if (index < 0 || index >= this.inventory.length) {
            return null;
        }

        const [removedItem] = this.inventory.splice(index, 1);

        if (this.equippedWeapon === removedItem) {
            this.equippedWeapon = null;
            this.hooks.onEquipmentChanged();
        }

        if (this.equippedArmor === removedItem) {
            this.equippedArmor = null;
            this.hooks.onEquipmentChanged();
        }

        return removedItem;
    }

    public unequipWeapon(): Item | null {
        const weapon = this.equippedWeapon;
        this.equippedWeapon = null;
        this.hooks.onEquipmentChanged();
        return weapon;
    }


    public unequipArmor(): Item | null {
        const armor = this.equippedArmor;
        this.equippedArmor = null;
        this.hooks.onEquipmentChanged();
        return armor;
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

    public restoreState(itemIds: string[], equippedWeaponId: string | null, equippedArmorId: string | null, itemFactory: (id: string) => Item | null): void {
        this.inventory.length = 0;
        for (const itemId of itemIds) {
            const item = itemFactory(itemId);
            if (item) {
                this.inventory.push(item);
            }
        }

        this.equippedWeapon = equippedWeaponId ? itemFactory(equippedWeaponId) : null;
        this.equippedArmor = equippedArmorId ? itemFactory(equippedArmorId) : null;
        this.hooks.onEquipmentChanged();
    }

    public getState(): { inventoryItemIds: string[]; equippedWeaponId: string | null; equippedArmorId: string | null } {
        return {
            inventoryItemIds: this.inventory.map((item) => item.id),
            equippedWeaponId: this.equippedWeapon?.id ?? null,
            equippedArmorId: this.equippedArmor?.id ?? null,
        };
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
