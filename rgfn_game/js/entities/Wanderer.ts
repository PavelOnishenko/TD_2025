import { randomInt } from '../../../engine/utils/MathUtils.js';
import { balanceConfig } from '../config/balanceConfig.js';
import { calculateArmor, calculateAvoidChance, calculateMana, calculateMeleeDamageBonus, calculateBowDamageBonus, calculateMaxHp } from '../config/levelConfig.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY } from './Item.js';
import Skeleton from './Skeleton.js';

const ITEM_ROLLS_BY_LEVEL = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];

export default class Wanderer extends Skeleton {
    public level: number;
    public vitality: number;
    public toughness: number;
    public strength: number;
    public agility: number;
    public connection: number;
    public intelligence: number;
    public magicPoints: number;
    public mana: number;
    public avoidChance: number;
    private armorValue: number;
    private armorAbsorbedHp: number;
    private inventory: Item[];
    private equippedWeapon: Item | null;
    private equippedArmor: Item | null;

    constructor(level: number, inventory: Item[]) {
        super(0, 0, { hp: 1, damage: 1, xpValue: 3 * level, name: `Wanderer Lv.${level}`, width: 30, height: 30 });
        this.level = level;
        this.vitality = 0;
        this.toughness = 0;
        this.strength = 0;
        this.agility = 0;
        this.connection = 0;
        this.intelligence = 0;
        this.magicPoints = 0;
        this.mana = 0;
        this.avoidChance = 0;
        this.armorValue = 0;
        this.armorAbsorbedHp = 0;
        this.inventory = inventory;
        this.equippedWeapon = null;
        this.equippedArmor = null;
        this.rollStats();
        this.chooseBestEquipment();
        this.refreshDerivedStats();
    }

    public static createRandom(): Wanderer {
        const level = this.rollLevel();
        return new Wanderer(level, this.rollInventory(level));
    }

    public canUseMagic(): boolean {
        return this.magicPoints > 0 && this.mana >= this.getMagicManaCost();
    }

    public getMagicDamage(): number {
        return 2 + this.magicPoints + Math.floor(this.intelligence / 4);
    }

    public spendMana(amount: number): void {
        this.mana = Math.max(0, this.mana - amount);
    }

    public getMagicManaCost(): number {
        return 2;
    }

    public getAttackRange(): number {
        return this.equippedWeapon?.attackRange ?? 1;
    }

    public getLootItems(): Item[] {
        return [...this.inventory];
    }

    public takeDamage(amount: number): boolean {
        if (amount <= 0) {
            return super.takeDamage(0);
        }

        const reduction = this.equippedArmor?.effects.damageReductionPercent ?? 0;
        const reduced = Math.floor(amount * (1 - reduction));
        const cap = this.equippedArmor?.effects.maxAbsorbHp;
        const depleted = typeof cap === 'number' && this.armorAbsorbedHp >= cap;
        const armor = depleted ? 0 : this.armorValue;
        const finalDamage = Math.max(balanceConfig.combat.minDamageAfterArmor, reduced - armor);
        const absorbed = Math.max(0, reduced - finalDamage);

        if (typeof cap === 'number' && absorbed > 0) {
            this.armorAbsorbedHp += absorbed;
        }

        return super.takeDamage(finalDamage);
    }

    private static rollLevel(): number {
        if (Math.random() < 0.9) {
            return randomInt(1, 9);
        }

        return randomInt(10, 20);
    }

    private static rollInventory(level: number): Item[] {
        const rolls = ITEM_ROLLS_BY_LEVEL[Math.min(ITEM_ROLLS_BY_LEVEL.length - 1, level - 1)] ?? 3;
        const inventory: Item[] = [];
        for (let i = 0; i < rolls; i++) {
            const randomIndex = randomInt(0, DISCOVERABLE_ITEM_LIBRARY.length - 1);
            inventory.push(new Item(DISCOVERABLE_ITEM_LIBRARY[randomIndex]));
        }
        return inventory;
    }

    private rollStats(): void {
        let points = this.level * 5;
        const keys: Array<'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence'> = [
            'vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence',
        ];

        while (points > 0) {
            const key = keys[randomInt(0, keys.length - 1)];
            this[key] += 1;
            points -= 1;
        }

        this.magicPoints = Math.floor(this.intelligence / 3);
    }

    private chooseBestEquipment(): void {
        const equippable = this.inventory.filter((item) => this.canEquip(item));
        const weapons = equippable.filter((item) => item.type === 'weapon');
        const armors = equippable.filter((item) => item.type === 'armor');
        this.equippedWeapon = this.pickBestWeapon(weapons);
        this.equippedArmor = this.pickBestArmor(armors);
    }

    private refreshDerivedStats(): void {
        this.armorValue = calculateArmor(this.toughness) + (this.equippedArmor?.effects.flatArmor ?? 0);
        this.avoidChance = calculateAvoidChance(this.agility);
        this.maxHp = calculateMaxHp(this.vitality);
        this.hp = this.maxHp;
        this.mana = calculateMana(this.connection, this.intelligence);
        this.damage = this.computeDamage();
    }

    private canEquip(item: Item): boolean {
        return this.agility >= (item.requirements.agility ?? 0) && this.strength >= (item.requirements.strength ?? 0);
    }

    private computeDamage(): number {
        const meleeBonus = calculateMeleeDamageBonus(this.strength, this.agility);
        const rangedBonus = calculateBowDamageBonus(this.strength, this.agility);
        const fistBase = balanceConfig.combat.fistDamagePerHand;
        if (!this.equippedWeapon) {
            return fistBase * 2 + meleeBonus;
        }

        const offhand = this.equippedWeapon.handsRequired === 1 ? fistBase : 0;
        const statBonus = this.equippedWeapon.isRanged ? rangedBonus : meleeBonus;
        return this.equippedWeapon.damageBonus + offhand + statBonus;
    }

    private pickBestWeapon(items: Item[]): Item | null {
        if (items.length === 0) {
            return null;
        }

        return items.reduce((best, current) => current.damageBonus > best.damageBonus ? current : best);
    }

    private pickBestArmor(items: Item[]): Item | null {
        if (items.length === 0) {
            return null;
        }

        return items.reduce((best, current) => this.getArmorScore(current) > this.getArmorScore(best) ? current : best);
    }

    private getArmorScore(item: Item): number {
        const flat = item.effects.flatArmor ?? 0;
        const reduction = (item.effects.damageReductionPercent ?? 0) * 10;
        const absorb = (item.effects.maxAbsorbHp ?? 0) / 10;
        return flat + reduction + absorb;
    }
}
