import Item from './Item.js';

type PlayerInventoryHooks = {
    onEquipmentChanged: () => void;
    onHealingPotionUsed: () => void;
    onManaPotionUsed: () => void;
    canEquip: (item: Item) => boolean;
    getInventoryCapacity: () => number;
};

export default class PlayerInventory {
    private readonly hooks: PlayerInventoryHooks;
    private readonly inventory: Item[] = [];
    private equippedMainWeapon: Item | null = null;
    private equippedOffhandWeapon: Item | null = null;
    private equippedArmor: Item | null = null;

    constructor(hooks: PlayerInventoryHooks) {
        this.hooks = hooks;
    }

    public addItem(item: Item): boolean {
        if (this.inventory.length >= this.hooks.getInventoryCapacity()) {
            return false;
        }

        this.inventory.push(item);
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

        if (this.equippedMainWeapon === removedItem) {
            this.equippedMainWeapon = null;
            this.hooks.onEquipmentChanged();
        }

        if (this.equippedOffhandWeapon === removedItem) {
            this.equippedOffhandWeapon = null;
            this.hooks.onEquipmentChanged();
        }

        if (this.equippedArmor === removedItem) {
            this.equippedArmor = null;
            this.hooks.onEquipmentChanged();
        }

        return removedItem;
    }

    public unequipWeapon(): Item | null {
        const weapon = this.equippedMainWeapon;
        if (!weapon || !this.moveItemToInventory(weapon)) {
            return null;
        }

        this.equippedMainWeapon = null;
        if (weapon?.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }
        this.hooks.onEquipmentChanged();
        return weapon;
    }

    public unequipOffhandWeapon(): Item | null {
        const weapon = this.equippedOffhandWeapon;
        if (!weapon || !this.moveItemToInventory(weapon)) {
            return null;
        }

        this.equippedOffhandWeapon = null;
        this.hooks.onEquipmentChanged();
        return weapon;
    }

    public unequipArmor(): Item | null {
        const armor = this.equippedArmor;
        if (!armor || !this.moveItemToInventory(armor)) {
            return null;
        }

        this.equippedArmor = null;
        this.hooks.onEquipmentChanged();
        return armor;
    }

    public getAttackRange(): number {
        return Math.max(this.equippedMainWeapon?.attackRange ?? 1, this.equippedOffhandWeapon?.attackRange ?? 1);
    }

    public hasWeapon(): boolean {
        return this.equippedMainWeapon !== null || this.equippedOffhandWeapon !== null;
    }

    public getEquippedWeapon(): Item | null {
        return this.equippedMainWeapon;
    }

    public getEquippedMainWeapon(): Item | null {
        return this.equippedMainWeapon;
    }

    public getEquippedOffhandWeapon(): Item | null {
        return this.equippedOffhandWeapon;
    }

    public getEquippedArmor(): Item | null {
        return this.equippedArmor;
    }

    public setEquippedWeapon(weapon: Item | null): void {
        this.moveEquippedItemsToInventory([this.equippedMainWeapon, this.equippedOffhandWeapon], [weapon]);
        this.removeItemFromInventory(weapon);
        this.equippedMainWeapon = weapon;
        if (weapon?.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }
        this.hooks.onEquipmentChanged();
    }

    public setEquippedOffhandWeapon(weapon: Item | null): void {
        this.moveEquippedItemsToInventory([this.equippedOffhandWeapon], [this.equippedMainWeapon, weapon]);
        this.removeItemFromInventory(weapon);
        this.equippedOffhandWeapon = weapon;
        this.hooks.onEquipmentChanged();
    }

    public equipWeaponToSlot(weapon: Item, slot: 'main' | 'offhand'): void {
        const previousMainWeapon = this.equippedMainWeapon;
        const previousOffhandWeapon = this.equippedOffhandWeapon;

        this.removeItemFromInventory(weapon);

        if (weapon.handsRequired === 2) {
            this.equippedMainWeapon = weapon;
            this.equippedOffhandWeapon = null;
            this.moveEquippedItemsToInventory([previousMainWeapon, previousOffhandWeapon], [this.equippedMainWeapon, this.equippedOffhandWeapon]);
            this.hooks.onEquipmentChanged();
            return;
        }

        if (slot === 'main') {
            this.equippedMainWeapon = weapon;
            if (this.equippedOffhandWeapon === weapon) {
                this.equippedOffhandWeapon = null;
            }
        } else {
            this.equippedOffhandWeapon = weapon;
            if (this.equippedMainWeapon?.handsRequired === 2 || this.equippedMainWeapon === weapon) {
                this.equippedMainWeapon = null;
            }
        }

        this.moveEquippedItemsToInventory([previousMainWeapon, previousOffhandWeapon], [this.equippedMainWeapon, this.equippedOffhandWeapon]);
        this.hooks.onEquipmentChanged();
    }

    public setEquippedArmor(armor: Item | null): void {
        this.moveEquippedItemsToInventory([this.equippedArmor], [armor]);
        this.removeItemFromInventory(armor);
        this.equippedArmor = armor;
        this.hooks.onEquipmentChanged();
    }

    public restoreState(itemIds: string[], equippedWeaponId: string | null, equippedArmorId: string | null, itemFactory: (id: string) => Item | null, equippedOffhandWeaponId?: string | null): void {
        this.inventory.length = 0;
        for (const itemId of itemIds) {
            const item = itemFactory(itemId);
            if (item) {
                this.inventory.push(item);
            }
        }

        this.equippedMainWeapon = equippedWeaponId ? itemFactory(equippedWeaponId) : null;
        this.equippedOffhandWeapon = equippedOffhandWeaponId ? itemFactory(equippedOffhandWeaponId) : null;
        if (this.equippedMainWeapon?.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }
        this.equippedArmor = equippedArmorId ? itemFactory(equippedArmorId) : null;
        this.hooks.onEquipmentChanged();
    }

    public getState(): { inventoryItemIds: string[]; equippedWeaponId: string | null; equippedOffhandWeaponId: string | null; equippedArmorId: string | null } {
        return {
            inventoryItemIds: this.inventory.map((item) => item.id),
            equippedWeaponId: this.equippedMainWeapon?.id ?? null,
            equippedOffhandWeaponId: this.equippedOffhandWeapon?.id ?? null,
            equippedArmorId: this.equippedArmor?.id ?? null,
        };
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

    private removeItemFromInventory(item: Item | null): void {
        if (!item) {
            return;
        }

        const index = this.inventory.indexOf(item);
        if (index !== -1) {
            this.inventory.splice(index, 1);
        }
    }

    private moveItemToInventory(item: Item): boolean {
        if (this.inventory.includes(item)) {
            return true;
        }

        if (this.inventory.length >= this.hooks.getInventoryCapacity()) {
            return false;
        }

        this.inventory.push(item);
        return true;
    }

    private moveEquippedItemsToInventory(previousItems: Array<Item | null>, nextItems: Array<Item | null>): void {
        const nextItemsSet = new Set(nextItems.filter((item): item is Item => item !== null));

        for (const item of previousItems) {
            if (!item || nextItemsSet.has(item)) {
                continue;
            }

            this.moveItemToInventory(item);
        }
    }
}
