import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { cloneBaseStats, deriveCreatureStats, normalizeCreatureSkills } from '../config/creatureStats.js';
import { CreatureBaseStats, CreatureSkill, CreatureSkills } from '../config/creatureTypes.js';
import { CombatBuffSnapshot, CombatStatusState } from '../systems/combat/DirectionalCombat.js';
import { MonsterMutationEngine } from './monster/MonsterMutationEngine.js';
import { MonsterStatusEffects } from './monster/MonsterStatusEffects.js';
import { MonsterVisualRenderer } from './monster/MonsterVisualRenderer.js';

export interface EnemyBehavior {
    avoidHitChance?: number;
    doubleDamageChance?: number;
    passEncounterChance?: number;
}

export type MonsterMutationTrait =
    | 'feral strength'
    | 'void armor'
    | 'acid blood'
    | 'blink speed'
    | 'barbed hide'
    | 'grave intellect';

export interface EnemyConfig {
    archetypeId?: keyof typeof balanceConfig.creatureArchetypes;
    xpValue: number;
    name: string;
    width: number;
    height: number;
    behavior?: EnemyBehavior;
    baseStats?: Partial<CreatureBaseStats>;
    skills?: Partial<Record<CreatureSkill, number>>;
    mutations?: MonsterMutationTrait[];
}

const DamageableEntity = withDamageable(Entity);

export default class Skeleton extends DamageableEntity {
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
    public name: string;
    public xpValue: number;
    public behavior: EnemyBehavior;
    public gridCol?: number;
    public gridRow?: number;
    public readonly archetypeId: keyof typeof balanceConfig.creatureArchetypes;
    public readonly baseStats: CreatureBaseStats;
    public readonly skills: CreatureSkills;
    public armor: number;
    public avoidChance: number;
    public maxMana: number;
    public magicPoints: number;
    public mana: number;
    public readonly mutations: MonsterMutationTrait[];

    private readonly monsterStatusEffects: MonsterStatusEffects;
    private readonly monsterVisualRenderer: MonsterVisualRenderer;

    constructor(x: number, y: number, enemyConfig?: EnemyConfig) {
        super(x, y);
        const config: EnemyConfig = enemyConfig ?? balanceConfig.enemies.skeleton;
        const archetypeId = config.archetypeId ?? 'skeleton';
        const archetype = balanceConfig.creatureArchetypes[archetypeId] ?? balanceConfig.creatureArchetypes.skeleton;
        const baseStats = { ...cloneBaseStats(archetype.baseStats), ...(config.baseStats ?? {}) };
        const skills = normalizeCreatureSkills({ ...archetype.skills, ...(config.skills ?? {}) });
        const derivedStats = deriveCreatureStats(baseStats, skills);
        this.width = config.width;
        this.height = config.height;
        this.name = config.name;
        this.xpValue = config.xpValue;
        this.behavior = config.behavior ?? {};
        this.archetypeId = archetypeId;
        this.baseStats = baseStats;
        this.skills = skills;
        this.damage = derivedStats.physicalDamage;
        this.armor = derivedStats.armor;
        this.avoidChance = derivedStats.avoidChance;
        this.maxMana = derivedStats.maxMana;
        this.magicPoints = derivedStats.magicPoints;
        this.mana = derivedStats.maxMana;
        this.mutations = [...(config.mutations ?? [])];
        MonsterMutationEngine.applyMutations(this);
        this.monsterStatusEffects = new MonsterStatusEffects();
        this.monsterVisualRenderer = new MonsterVisualRenderer();
        const hpMultiplier = Math.max(0, balanceConfig.enemies.hpMultiplier ?? 1);
        (this as any).initDamageable(Math.round(derivedStats.maxHp * hpMultiplier));
    }

    public takeDamage(amount: number): boolean {
        const damageAfterArmor = this.monsterStatusEffects.calculatePhysicalDamage(amount, this.armor);
        return this.applyIncomingDamage(damageAfterArmor);
    }

    public takeMagicDamage(amount: number): boolean {
        return this.applyIncomingDamage(Math.max(0, amount));
    }

    public applyCurse(armorReduction: number, duration: number): void {
        this.monsterStatusEffects.applyCurse(armorReduction, duration);
    }

    public applySlow(duration: number): void {
        this.monsterStatusEffects.applySlow(duration);
    }

    public shouldSkipTurnFromSlow(): boolean {
        return this.monsterStatusEffects.shouldSkipTurnFromSlow();
    }

    public getDirectionalCombatBuffSnapshot(): CombatBuffSnapshot {
        return this.monsterStatusEffects.getDirectionalCombatBuffSnapshot();
    }

    public applyDirectionalCombatRewards(rewards: CombatStatusState): string[] {
        return this.monsterStatusEffects.applyDirectionalCombatRewards(rewards, this.name);
    }

    public consumeDirectionalAttackBonuses(): string[] {
        return this.monsterStatusEffects.consumeDirectionalAttackBonuses(this.name);
    }

    public expireDirectionalBonusesWithoutAttack(): string[] {
        return this.monsterStatusEffects.expireDirectionalBonusesWithoutAttack(this.name);
    }

    public consumeTurnEffects(): string[] {
        return this.monsterStatusEffects.consumeTurnEffects(this.name);
    }

    public getSkillRecord(): CreatureSkills {
        return normalizeCreatureSkills(this.skills);
    }

    public getBaseStatsRecord(): CreatureBaseStats {
        return cloneBaseStats(this.baseStats);
    }

    public draw(ctx: CanvasRenderingContext2D, _viewport?: any): void {
        this.monsterVisualRenderer.drawEntity(ctx, this.name, this.x, this.y, this.width, this.height);
        this.monsterVisualRenderer.drawHealthBar(ctx, this.x, this.y, this.width, this.height, this.hp, this.maxHp);
    }

    public shouldAvoidHit(): boolean {
        const behaviorChance = this.behavior.avoidHitChance ?? 0;
        return MonsterMutationEngine.shouldAvoidHit(behaviorChance, this.avoidChance);
    }

    public getAttackDamage(): number {
        return MonsterMutationEngine.getAttackDamage(this.damage, this.behavior.doubleDamageChance ?? 0);
    }

    public shouldPassEncounter(): boolean {
        return MonsterMutationEngine.shouldPassEncounter(this.behavior.passEncounterChance ?? 0);
    }

    public onDamagedByPlayer(isMelee: boolean): { retaliationDamage: number; logs: string[] } {
        return MonsterMutationEngine.onDamagedByPlayer(this.name, this.mutations, isMelee);
    }

    private applyIncomingDamage(amount: number): boolean {
        const died = super.takeDamage(amount);
        if (died) {
            this.active = false;
        }
        return died;
    }
}
