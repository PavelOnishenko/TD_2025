import { GameFacade } from './GameFacade.js';
import { buildGameRuntime } from './GameRuntimeAssembly.js';

export function createGameRuntime(
    game: GameFacade,
    canvas: HTMLCanvasElement,
    hasSavedGame: boolean,
    worldColumns: number,
    worldRows: number,
    worldCellSize: number,
): void {
    buildGameRuntime(game, canvas, hasSavedGame, worldColumns, worldRows, worldCellSize);
}
