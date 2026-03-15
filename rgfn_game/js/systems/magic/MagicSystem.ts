import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { Spell } from './MagicTypes.js';
import { createSpellBook } from './SpellBook.js';

const BASE_SPELL_IDS = ['fireball', 'curse', 'slow', 'rage', 'arcane-lance'] as const;
type BaseSpellId = typeof BASE_SPELL_IDS[number];

export default class MagicSystem {
    private readonly player: Player;
    private readonly spellLevels: Record<BaseSpellId, number>;

    constructor(player: Player) {
        this.player = player;
        this.spellLevels = {
            fireball: 0,
            curse: 0,
            slow: 0,
            rage: 0,
            'arcane-lance': 0,
        };
    }

    public getSpellLevels(): Record<BaseSpellId, number> {
        return { ...this.spellLevels };
    }

    public getAvailableSpells(): Spell[] {
        const spellBook = createSpellBook();
        return spellBook.filter((spell) => {
            const [baseId, levelToken] = spell.id.split('-lvl-');
            const level = Number(levelToken);
            return this.spellLevels[baseId as BaseSpellId] === level;
        });
    }

    public investSpellPoint(baseId: BaseSpellId): boolean {
        if (this.player.magicPoints <= 0) {
            return false;
        }

        this.player.magicPoints -= 1;
        this.spellLevels[baseId] += 1;
        return true;
    }

    public castSpell(baseId: BaseSpellId, target: Skeleton | Player): { ok: boolean; message: string } {
        const level = this.spellLevels[baseId];
        if (level <= 0) {
            return { ok: false, message: `Learn ${baseId} first (current level 0).` };
        }

        const spell = createSpellBook().find((item) => item.id === `${baseId}-lvl-${level}`);
        if (!spell) {
            return { ok: false, message: 'Spell level data not found.' };
        }

        if (!this.player.canSpendMana(spell.manaCost)) {
            return { ok: false, message: `Not enough mana for ${spell.name}.` };
        }

        this.player.spendMana(spell.manaCost);
        const results = spell.cast({ caster: this.player, target, level });

        const pieces: string[] = [`${spell.name} cast (-${spell.manaCost} mana).`];
        for (const result of results) {
            if (result.type === 'magicDamage') {
                pieces.push(`Magic damage ${result.amount} (ignores armor).`);
            }
            if (result.type === 'curseArmorBreak') {
                pieces.push(`Curse: armor reduction ${result.amount} for ${result.duration} turns.`);
            }
            if (result.type === 'slow') {
                pieces.push(`Slow: target skips ${result.duration} turn(s).`);
            }
            if (result.type === 'rage') {
                pieces.push(`Rage: x${result.multiplier?.toFixed(2)} power for ${result.duration} turns.`);
            }
        }

        return { ok: true, message: pieces.join(' ') };
    }
}

export type { BaseSpellId };
