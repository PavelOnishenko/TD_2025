import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { deriveArchetypeStats, formatCreatureSkills } from '../../config/creatureStats.js';
import { CreatureBaseStats, CreatureSkills } from '../../config/creatureTypes.js';
import Player from '../../entities/Player.js';
import Wanderer from '../../entities/Wanderer.js';
import WorldMap from '../world/WorldMap.js';

type LoreBookElements = {
    loreBody: HTMLElement;
};

type KnownTravelerEntry = {
    id: string;
    name: string;
    level: number;
    disposition: 'hostile' | 'peaceful';
    baseStats: CreatureBaseStats;
    skills: CreatureSkills;
    maxHp: number;
    damage: number;
    armor: number;
    maxMana: number;
    magicPoints: number;
    encounterDescription: string;
};

export default class LoreBookController {
    private readonly elements: LoreBookElements;
    private readonly player: Player;
    private readonly worldMap: WorldMap;
    private readonly knownTravelers = new Map<string, KnownTravelerEntry>();

    constructor(elements: LoreBookElements, player: Player, worldMap: WorldMap) {
        this.elements = elements;
        this.player = player;
        this.worldMap = worldMap;
    }

    public rememberTraveler(traveler: Wanderer, disposition: 'hostile' | 'peaceful'): void {
        const id = `${traveler.name}-${traveler.level}`;
        this.knownTravelers.set(id, {
            id,
            name: traveler.name,
            level: traveler.level,
            disposition,
            baseStats: traveler.getBaseStatsRecord(),
            skills: traveler.getSkillRecord(),
            maxHp: traveler.maxHp,
            damage: traveler.damage,
            armor: traveler.armor,
            maxMana: traveler.maxMana,
            magicPoints: traveler.magicPoints,
            encounterDescription: traveler.getEncounterDescription(),
        });
    }

    public render(): void {
        const playerSkills = this.player.getSkillRecord();
        const playerBaseStats = this.player.getBaseStatsRecord();
        const villages = this.worldMap.getKnownVillages();
        const archetypeMarkup = Object.values(balanceConfig.creatureArchetypes)
            .map((archetype) => {
                const derived = deriveArchetypeStats(archetype);
                return `
                    <article class="lore-entry">
                        <h4>${this.escapeHtml(archetype.name)} <span class="lore-tag">${this.escapeHtml(archetype.category)}</span></h4>
                        <p>${this.escapeHtml(archetype.description)}</p>
                        <p><strong>Base stats:</strong> HP ${archetype.baseStats.hp}, DMG ${archetype.baseStats.damage}, ARM ${archetype.baseStats.armor}, Mana ${archetype.baseStats.mana}</p>
                        <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(archetype.skills))}</p>
                        <p><strong>Resulting stats:</strong> HP ${derived.maxHp}, DMG ${derived.physicalDamage}, ARM ${derived.armor}, Dodge ${(derived.avoidChance * 100).toFixed(1)}%, Mana ${derived.maxMana}, Magic ${derived.magicPoints}</p>
                        ${archetype.notes?.length ? `<ul>${archetype.notes.map((note) => `<li>${this.escapeHtml(note)}</li>`).join('')}</ul>` : ''}
                    </article>
                `;
            })
            .join('');

        const travelerMarkup = Array.from(this.knownTravelers.values())
            .sort((left, right) => left.name.localeCompare(right.name) || left.level - right.level)
            .map((traveler) => `
                <article class="lore-entry">
                    <h4>${this.escapeHtml(traveler.name)} <span class="lore-tag">wanderer Lv.${traveler.level}</span></h4>
                    <p><strong>Disposition:</strong> ${this.escapeHtml(traveler.disposition)}</p>
                    <p><strong>Base stats:</strong> HP ${traveler.baseStats.hp}, DMG ${traveler.baseStats.damage}, ARM ${traveler.baseStats.armor}, Mana ${traveler.baseStats.mana}</p>
                    <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(traveler.skills))}</p>
                    <p><strong>Resulting stats:</strong> HP ${traveler.maxHp}, DMG ${traveler.damage}, ARM ${traveler.armor}, Mana ${traveler.maxMana}, Magic ${traveler.magicPoints}</p>
                    <p>${this.escapeHtml(traveler.encounterDescription)}</p>
                </article>
            `)
            .join('') || '<p class="lore-empty">No wanderers recorded yet.</p>';

        const villageMarkup = villages.length > 0
            ? villages.map((village) => `
                <article class="lore-entry">
                    <h4>${this.escapeHtml(village.name)}</h4>
                    <p><strong>Location:</strong> (${village.col}, ${village.row})</p>
                    <p><strong>Terrain:</strong> ${this.escapeHtml(village.terrain)}</p>
                    <p><strong>Status:</strong> ${this.escapeHtml(village.status)}</p>
                </article>
            `).join('')
            : '<p class="lore-empty">No villages discovered yet.</p>';

        this.elements.loreBody.innerHTML = `
            <section class="lore-section">
                <h3>Current hero</h3>
                <article class="lore-entry">
                    <h4>${this.escapeHtml(this.player.name)}</h4>
                    <p><strong>Base stats:</strong> HP ${playerBaseStats.hp}, DMG ${playerBaseStats.damage}, ARM ${playerBaseStats.armor}, Mana ${playerBaseStats.mana}</p>
                    <p><strong>Skills:</strong> ${this.escapeHtml(formatCreatureSkills(playerSkills))}</p>
                    <p><strong>Resulting stats:</strong> HP ${this.player.maxHp}, DMG ${this.player.getPhysicalDamageWithBuff()}, ARM ${this.player.armor}, Dodge ${(this.player.avoidChance * 100).toFixed(1)}%, Mana ${this.player.maxMana}, Magic ${this.player.magicPoints}</p>
                    <p><strong>Level:</strong> ${this.player.level} &middot; <strong>Skill points:</strong> ${this.player.skillPoints}</p>
                </article>
            </section>
            <section class="lore-section">
                <h3>Known characters</h3>
                ${travelerMarkup}
            </section>
            <section class="lore-section">
                <h3>Known villages</h3>
                ${villageMarkup}
            </section>
            <section class="lore-section">
                <h3>Creature compendium</h3>
                ${archetypeMarkup}
            </section>
        `;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
