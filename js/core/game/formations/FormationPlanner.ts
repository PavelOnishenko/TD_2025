import { FormationDefaults, FormationDefinition, FormationEvent, FormationPlan, PlanWaveOptions } from './FormationTypes.js';

type WeightedChoice<T> = { items: T[]; weights: number[]; random?: () => number };

type SelectionResult = { selections: FormationDefinition[]; remaining: number };

export default class FormationPlanner {
    public planWave(
        wave: number,
        formations: FormationDefinition[],
        defaults: FormationDefaults,
        totalDifficulty: number,
        options: PlanWaveOptions = {},
    ): FormationPlan | null {
        if (!Number.isFinite(totalDifficulty) || totalDifficulty <= 0) {return null;}
        const result = this.selectFormations(wave, formations, totalDifficulty, options);
        if (!result.selections.length) {return null;}
        const events = this.buildEventsTimeline(result.selections, defaults);
        const spent = result.selections.reduce((sum, formation) => sum + formation.difficulty, 0);
        return { wave, totalDifficulty: spent, remainingDifficulty: Math.max(0, result.remaining), totalEnemies: events.length, events, selections: result.selections };
    }

    private selectFormations(wave: number, formations: FormationDefinition[], totalDifficulty: number, options: PlanWaveOptions): SelectionResult {
        const randomFn = typeof options.random === 'function' ? options.random : undefined;
        const selections: FormationDefinition[] = [];
        const safetyLimit = Math.max(1, options.iterationLimit ?? 200);
        let remaining = Math.max(0, Math.floor(totalDifficulty));
        let iterations = 0;
        while (remaining > 0 && iterations < safetyLimit) {
            iterations += 1;
            const chosen = this.chooseFormation(wave, formations, remaining, randomFn);
            if (!chosen) {break;}
            selections.push(chosen);
            remaining -= chosen.difficulty;
        }
        return { selections, remaining };
    }

    private chooseFormation(wave: number, formations: FormationDefinition[], remaining: number, random?: () => number): FormationDefinition | null {
        const candidates = formations.filter((formation) => formation.difficulty <= remaining && wave >= (formation.minWave ?? 1));
        if (!candidates.length) {return null;}
        const weights = candidates.map((candidate) => candidate.probabilityFn?.(wave, candidate) ?? 0);
        return this.weightedRandomChoice({ items: candidates, weights, random });
    }

    private buildEventsTimeline(selections: FormationDefinition[], defaults: FormationDefaults): FormationEvent[] {
        const events: FormationEvent[] = [];
        let cursorTime = 0;
        for (const selection of selections) {
            cursorTime = this.appendSelectionEvents(events, selection, cursorTime, defaults);
        }
        events.sort((a, b) => a.time - b.time || a.formationId.localeCompare(b.formationId));
        return events;
    }

    private appendSelectionEvents(events: FormationEvent[], selection: FormationDefinition, cursorTime: number, defaults: FormationDefaults): number {
        let localMax = 0;
        for (const ship of selection.ships) {
            localMax = Math.max(localMax, ship.time ?? 0);
            events.push(this.toEvent(selection, ship, cursorTime));
        }
        const gap = Number.isFinite(selection.gap) ? (selection.gap as number) : defaults.formationGap;
        return cursorTime + localMax + Math.max(0, gap);
    }

    private readonly toEvent = (selection: FormationDefinition, ship: FormationDefinition['ships'][number], cursorTime: number): FormationEvent => ({
        time: cursorTime + Math.max(0, ship.time ?? 0),
        type: ship.type,
        color: ship.color,
        x: ship.x,
        y: ship.y,
        groupSize: ship.groupSize,
        spacing: ship.spacing,
        offsets: Array.isArray(ship.offsets) ? ship.offsets.slice() : undefined,
        colors: Array.isArray(ship.colors) ? ship.colors.slice() : undefined,
        formationId: selection.id,
    });

    private weightedRandomChoice<T>({ items, weights, random }: WeightedChoice<T>): T | null {
        if (!items.length) {return null;}
        const total = weights.reduce((sum, weight) => sum + (Number.isFinite(weight) ? Math.max(0, weight) : 0), 0);
        if (total <= 0) {return this.fallbackChoice(items, random);}
        let roll = (random?.() ?? Math.random()) * total;
        for (let i = 0; i < items.length; i += 1) {
            roll -= Number.isFinite(weights[i]) ? Math.max(0, weights[i]) : 0;
            if (roll <= 0) {return items[i];}
        }
        return items.length ? items[items.length - 1] : null;
    }

    private fallbackChoice<T>(items: T[], random?: () => number): T {
        const index = Math.floor((random?.() ?? Math.random()) * items.length);
        return items[Math.min(items.length - 1, Math.max(0, index))];
    }
}
