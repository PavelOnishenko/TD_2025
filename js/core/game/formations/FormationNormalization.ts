import { FormationDefinition, FormationDefaults, FormationShipDescriptor } from './FormationTypes.js';
import { createProbabilityFunction } from './FormationParserUtils.js';

type FormationDraft = FormationDefinition & { probability?: string };

const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeColor = (ship: FormationShipDescriptor): void => {
    const lowered = ship.color?.toLowerCase();
    if (lowered === 'auto' || lowered === 'random') {
        ship.color = undefined;
    }
};

export const normalizeShip = (descriptor: FormationShipDescriptor): FormationShipDescriptor => {
    const ship = { ...descriptor, time: toNumber(descriptor.time, 0) };
    normalizeColor(ship);
    if (Number.isFinite(ship.groupSize)) {
        ship.groupSize = Math.max(1, Math.floor(ship.groupSize as number));
    }
    if (Array.isArray(ship.offsets)) {
        ship.offsets = ship.offsets.map((value) => toNumber(value, 0));
    }
    return ship;
};

export const finalizeFormation = (draft: FormationDraft | null, defaults: FormationDefaults): FormationDefinition | null => {
    if (!draft || !draft.ships.length) {
        return null;
    }
    const ships = draft.ships.map((ship) => normalizeShip(ship));
    const difficulty = Number.isFinite(draft.difficulty) && draft.difficulty > 0 ? draft.difficulty : ships.length;
    const minWave = Number.isFinite(draft.minWave) ? Math.max(1, Math.floor(draft.minWave ?? 1)) : 1;
    const duration = ships.reduce((maxTime, ship) => Math.max(maxTime, ship.time ?? 0), 0);
    return {
        id: draft.id,
        label: draft.label,
        difficulty,
        probabilityFn: createProbabilityFunction(draft.probability, defaults),
        ships,
        duration,
        gap: Number.isFinite(draft.gap) ? draft.gap : undefined,
        minWave,
    };
};
