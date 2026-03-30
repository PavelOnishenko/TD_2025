import { Spell, SpellContext, SpellEffect, SpellTargetType } from './MagicTypes.js';

class BuiltSpell implements Spell {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly targetType: SpellTargetType;
    public readonly level: number;
    public readonly manaCost: number;
    private readonly effects: SpellEffect[];

    constructor(config: {
        id: string;
        name: string;
        description: string;
        targetType: SpellTargetType;
        level: number;
        manaCost: number;
        effects: SpellEffect[];
    }) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.targetType = config.targetType;
        this.level = config.level;
        this.manaCost = config.manaCost;
        this.effects = config.effects;
    }

    public cast = (context: SpellContext) => this.effects.map((effect) => effect.apply(context));
}

export class SpellBuilder {
    private id = '';
    private name = '';
    private description = '';
    private targetType: SpellTargetType = 'enemy';
    private level = 1;
    private manaCost = 0;
    private effects: SpellEffect[] = [];

    public withId(id: string): this {
        this.id = id;
        return this;
    }

    public withName(name: string): this {
        this.name = name;
        return this;
    }

    public withDescription(description: string): this {
        this.description = description;
        return this;
    }

    public withTargetType(targetType: SpellTargetType): this {
        this.targetType = targetType;
        return this;
    }

    public withLevel(level: number): this {
        this.level = level;
        return this;
    }

    public withManaCost(manaCost: number): this {
        this.manaCost = manaCost;
        return this;
    }

    public withEffect(effect: SpellEffect): this {
        this.effects.push(effect);
        return this;
    }

    public build(): Spell {
        if (!this.id || !this.name) {
            throw new Error('Spell must define id and name.');
        }

        return new BuiltSpell({
            id: this.id,
            name: this.name,
            description: this.description,
            targetType: this.targetType,
            level: this.level,
            manaCost: this.manaCost,
            effects: [...this.effects],
        });
    }
}
