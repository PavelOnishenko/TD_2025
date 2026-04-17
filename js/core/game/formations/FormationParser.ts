import { FormationDefinition, FormationDefaults } from './FormationTypes.js';
import {
    createIdState,
    parseHeader,
    parseShipLine,
} from './FormationParserUtils.js';
import { finalizeFormation } from './FormationNormalization.js';

export default class FormationParser {
    private readonly idState = createIdState();

    public parseFormationText(definitions: string, defaults: FormationDefaults): FormationDefinition[] {
        if (!definitions || typeof definitions !== 'string') {
            return [];
        }
        return this.collectFormations(definitions.split(/\r?\n/), defaults);
    }

    public normalizeFormations(formations: FormationDefinition[], defaults: FormationDefaults): FormationDefinition[] {
        if (!Array.isArray(formations)) {
            return [];
        }
        return formations
            .map((formation) => finalizeFormation(formation as FormationDefinition & { probability?: string }, defaults))
            .filter((formation): formation is FormationDefinition => Boolean(formation));
    }

    private collectFormations(lines: string[], defaults: FormationDefaults): FormationDefinition[] {
        const formations: FormationDefinition[] = [];
        let current: (FormationDefinition & { probability?: string }) | null = null;
        for (const rawLine of lines) {
            current = this.processLine(rawLine.trim(), defaults, formations, current);
        }
        this.pushCurrent(formations, current, defaults);
        return formations;
    }

    private processLine(
        line: string,
        defaults: FormationDefaults,
        formations: FormationDefinition[],
        current: (FormationDefinition & { probability?: string }) | null,
    ): (FormationDefinition & { probability?: string }) | null {
        const next = this.handleBoundary(line, defaults, formations, current);
        if (next !== current || !line || line.startsWith('#')) {
            return next;
        }
        return this.appendShip(next, line);
    }

    private handleBoundary(
        line: string,
        defaults: FormationDefaults,
        formations: FormationDefinition[],
        current: (FormationDefinition & { probability?: string }) | null,
    ): (FormationDefinition & { probability?: string }) | null {
        if (!line) {return current;}
        if (line === '---') {
            this.pushCurrent(formations, current, defaults);
            return null;
        }
        if (!line.startsWith('#')) {return current;}
        this.pushCurrent(formations, current, defaults);
        return { ...parseHeader(line, this.idState), ships: [] };
    }

    private appendShip(current: (FormationDefinition & { probability?: string }) | null, line: string): (FormationDefinition & { probability?: string }) | null {
        if (!current) {return current;}
        const ship = parseShipLine(line);
        if (ship) {current.ships.push(ship);}
        return current;
    }

    private pushCurrent(formations: FormationDefinition[], current: (FormationDefinition & { probability?: string }) | null, defaults: FormationDefaults): void {
        const finalized = finalizeFormation(current, defaults);
        if (finalized) {
            formations.push(finalized);
        }
    }
}
