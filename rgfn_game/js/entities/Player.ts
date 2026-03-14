import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import {
    getXpForLevel,
    calculateMaxHp,
    calculateMeleeDamageBonus,
    calculateBowDamageBonus,
    calculateTotalMeleeDamage,
    calculateTotalBowDamage,
    calculateAvoidChance,
    calculateArmor,
    calculateMana,
    levelConfig
} from '../config/levelConfig.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';
import PlayerInventory from './PlayerInventory.js';
import PlayerRenderer from './PlayerRenderer.js';

const DamageableEntity = withDamageable(Entity);

type PlayerStat = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export default class Player extends DamageableEntity {
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;

    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    declare hp: number;
    declare maxHp: number;

    declare initDamageable: (maxHp: number) => void;
    declare heal: (amount: number) => void;
    declare isDead: () => boolean;
    declare getHealthPercent: () => number;
    declare healToFull: () => void;

    public damage: number;
    public armor: number = 0;
    public avoidChance: number = 0;
    public gridCol?: number;
    public gridRow?: number;

    public level: number = 1;
    public xp: number = 0;
    public xpToNextLevel: number;

    public vitality: number = 0;
    public toughness: number = 0;
    public strength: number = 0;
    public agility: number = 0;
    public connection: number = 0;
    public intelligence: number = 0;
    public skillPoints: number = 0;
    public magicPoints: number = 0;
    public mana: number = 0;
    public maxMana: number = 0;
    public gold: number = 20;

    private rageTurns: number = 0;
    private rageMultiplier: number = 1;

    private readonly inventorySystem: PlayerInventory;
    private readonly renderer: PlayerRenderer;

    public get equippedWeapon(): Item | null {
        return this.inventorySystem.getEquippedWeapon();
    }

    public set equippedWeapon(weapon: Item | null) {
        this.inventorySystem.setEquippedWeapon(weapon);
    }

    constructor(x: number, y: number) {
        super(x, y);
        this.width = balanceConfig.player.width;
        this.height = balanceConfig.player.height;

        this.vitality = balanceConfig.player.initialVitality;
        this.toughness = balanceConfig.player.initialToughness;
        this.strength = balanceConfig.player.initialStrength;
        this.agility = balanceConfig.player.initialAgility;
        this.connection = balanceConfig.player.initialConnection;
        this.intelligence = balanceConfig.player.initialIntelligence;
        this.skillPoints = 0;

        this.inventorySystem = new PlayerInventory({
            onWeaponChanged: () => this.updateStats(),
            onHealingPotionUsed: () => this.heal(5),
            onManaPotionUsed: () => this.restoreMana(balanceConfig.combat.manaPotionRestore)
        });
        this.renderer = new PlayerRenderer();

        this.updateStats();
        this.mana = this.maxMana;
        this.xpToNextLevel = getXpForLevel(2);

        this.initDamageable(this.maxHp);
    }

    public takeDamage(amount: number): boolean {
        if (amount <= 0) {
            return super.takeDamage(0);
        }

        const damageAfterArmor = Math.max(
            balanceConfig.combat.minDamageAfterArmor,
            amount - this.armor
        );

        return super.takeDamage(damageAfterArmor);
    }

    public takeMagicDamage(amount: number): boolean {
        return super.takeDamage(Math.max(0, amount));
    }

    public updateStats(): void {
        const previousMaxMana = this.maxMana;
        const previousMana = this.mana;
        const hadFullMana = previousMaxMana > 0 && previousMana === previousMaxMana;

        this.maxHp = calculateMaxHp(this.vitality);
        this.maxMana = calculateMana(this.connection, this.intelligence);
        this.armor = calculateArmor(this.toughness);
        this.avoidChance = calculateAvoidChance(this.agility);

        if (this.getAttackRange() > 1) {
            this.damage = calculateTotalBowDamage(this.strength, this.agility);
        } else {
            this.damage = calculateTotalMeleeDamage(this.strength, this.agility);
        }

        if (previousMaxMana === 0 || hadFullMana) {
            this.mana = this.maxMana;
            return;
        }

        this.mana = Math.min(this.maxMana, previousMana);
    }

    public addXp(amount: number): boolean {
        if (this.level >= levelConfig.maxLevel) {
            return false;
        }

        this.xp += amount;

        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
            return true;
        }

        return false;
    }

    private levelUp(): void {
        if (this.level >= levelConfig.maxLevel) {
            return;
        }

        this.level++;
        this.xp -= this.xpToNextLevel;
        this.skillPoints += levelConfig.skillPointsPerLevel;
        this.xpToNextLevel = getXpForLevel(this.level + 1);

        this.updateStats();

        this.healToFull();
        this.mana = this.maxMana;
    }

    public addStat(stat: PlayerStat, amount: number = 1): boolean {
        if (this.skillPoints < amount) {
            return false;
        }

        const previousIntelligence = this.intelligence;

        switch (stat) {
            case 'vitality':
                this.vitality += amount;
                break;
            case 'toughness':
                this.toughness += amount;
                break;
            case 'strength':
                this.strength += amount;
                break;
            case 'agility':
                this.agility += amount;
                break;
            case 'connection':
                this.connection += amount;
                break;
            case 'intelligence':
                this.intelligence += amount;
                break;
            default:
                return false;
        }

        this.skillPoints -= amount;

        this.updateStats();
        this.hp = Math.min(this.hp, this.maxHp);

        if (stat === 'intelligence') {
            const gainedMagicPoints = Math.floor(this.intelligence / 3) - Math.floor(previousIntelligence / 3);
            if (gainedMagicPoints > 0) {
                this.magicPoints += gainedMagicPoints;
            }
        }

        return true;
    }


    public restoreMana(amount: number): void {
        if (amount <= 0) {
            return;
        }

        this.mana = Math.min(this.maxMana, this.mana + amount);
    }

    public spendMana(amount: number): boolean {
        if (amount <= 0) {
            return true;
        }

        if (this.mana < amount) {
            return false;
        }

        this.mana -= amount;
        return true;
    }

    public canSpendMana(amount: number): boolean {
        return this.mana >= amount;
    }

    public getPhysicalDamageWithBuff(): number {
        return Math.round(this.damage * this.rageMultiplier);
    }

    public getMagicPowerMultiplier(): number {
        return this.rageMultiplier;
    }

    public applyRage(turns: number, multiplier: number): void {
        this.rageTurns = Math.max(this.rageTurns, turns);
        this.rageMultiplier = Math.max(this.rageMultiplier, multiplier);
    }

    public consumePlayerTurnEffects(): string[] {
        const events: string[] = [];

        if (this.rageTurns > 0) {
            this.rageTurns -= 1;
            if (this.rageTurns === 0) {
                this.rageMultiplier = 1;
                events.push('Rage fades.');
            }
        }

        return events;
    }

    public getArmorReduction(): number {
        return this.armor;
    }

    public addItemToInventory(item: Item): boolean {
        return this.inventorySystem.addItem(item);
    }

    public useHealingPotion(): boolean {
        return this.inventorySystem.useHealingPotion();
    }

    public getInventory(): Item[] {
        return this.inventorySystem.getItems();
    }

    public getHealingPotionCount(): number {
        return this.inventorySystem.getHealingPotionCount();
    }

    public getManaPotionCount(): number {
        return this.inventorySystem.getManaPotionCount();
    }

    public useManaPotion(): boolean {
        return this.inventorySystem.useManaPotion();
    }

    public removeHealingPotionFromInventory(): boolean {
        return this.inventorySystem.removeHealingPotion();
    }

    public removeManaPotionFromInventory(): boolean {
        return this.inventorySystem.removeManaPotion();
    }

    public unequipWeapon(): Item | null {
        return this.inventorySystem.unequipWeapon();
    }

    public getAttackRange(): number {
        return this.inventorySystem.getAttackRange();
    }

    public hasWeapon(): boolean {
        return this.inventorySystem.hasWeapon();
    }

    public getAvoidFormulaText(): string {
        const scale = balanceConfig.stats.avoidChanceScale;
        const capPercent = Math.round(balanceConfig.stats.avoidChanceCap * 100);
        const scaledAgility = this.agility * scale;
        const rawChance = 1 - (1 / (1 + scaledAgility));
        const finalChance = Math.min(balanceConfig.stats.avoidChanceCap, rawChance);
        const finalPercent = (finalChance * 100).toFixed(1);

        return `min(${capPercent}%, (1 - 1/(1 + AGI×${scale.toFixed(3)}))×100) = ${finalPercent}%`;
    }

    public getDamageFormulaText(): string {
        const isBowAttack = this.getAttackRange() > 1;
        const baseDamage = balanceConfig.player.baseDamage;

        if (isBowAttack) {
            const strengthBonus = Math.floor(this.strength / balanceConfig.stats.strengthToBowDamage);
            const agilityBonus = Math.floor(this.agility / balanceConfig.stats.agilityToBowDamage);
            const total = baseDamage + calculateBowDamageBonus(this.strength, this.agility);

            return `Bow: ${baseDamage} + ⌊STR/${balanceConfig.stats.strengthToBowDamage}⌋ (${strengthBonus}) + ⌊AGI/${balanceConfig.stats.agilityToBowDamage}⌋ (${agilityBonus}) = ${total}`;
        }

        const strengthBonus = Math.floor(this.strength / balanceConfig.stats.strengthToMeleeDamage);
        const agilityBonus = Math.floor(this.agility / balanceConfig.stats.agilityToMeleeDamage);
        const total = baseDamage + calculateMeleeDamageBonus(this.strength, this.agility);

        return `Melee: ${baseDamage} + ⌊STR/${balanceConfig.stats.strengthToMeleeDamage}⌋ (${strengthBonus}) + ⌊AGI/${balanceConfig.stats.agilityToMeleeDamage}⌋ (${agilityBonus}) = ${total}`;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        this.renderer.draw(ctx, this);
    }
}
