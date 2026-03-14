import InputManager from '../../../../engine/systems/InputManager.js';
import { registerBackquoteToggle } from '../../../../engine/systems/developerHotkeys.js';

type GameInputSetupOptions = {
    onToggleDeveloperModal: () => void;
};

export default class GameInputSetup {
    private input: InputManager;
    private options: GameInputSetupOptions;

    constructor(input: InputManager, options: GameInputSetupOptions) {
        this.input = input;
        this.options = options;
    }

    public configure(): void {
        this.input.mapAction('moveUp', ['ArrowUp', 'KeyW']);
        this.input.mapAction('moveDown', ['ArrowDown', 'KeyS']);
        this.input.mapAction('moveLeft', ['ArrowLeft', 'KeyA']);
        this.input.mapAction('moveRight', ['ArrowRight', 'KeyD']);

        document.addEventListener('keydown', (event: KeyboardEvent) => this.input.handleKeyDown(event));
        document.addEventListener('keyup', (event: KeyboardEvent) => this.input.handleKeyUp(event));

        registerBackquoteToggle(() => {
            this.options.onToggleDeveloperModal();
        }, { target: document });
    }
}
