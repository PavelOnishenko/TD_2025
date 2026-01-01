/**
 * StateMachine - Simple state management
 * (Built for RGFN, might extract to engine if another game needs it)
 */
export default class StateMachine {
    constructor(initialState = null) {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;

        if (initialState) {
            this.currentState = initialState;
        }
    }

    addState(name, callbacks = {}) {
        this.states.set(name, {
            enter: callbacks.enter ?? null,
            update: callbacks.update ?? null,
            exit: callbacks.exit ?? null,
        });
        return this;
    }

    transition(newState, data = null) {
        if (!this.states.has(newState)) {
            console.warn(`State "${newState}" does not exist`);
            return false;
        }

        if (this.currentState === newState) {
            return false;
        }

        // Exit current state
        if (this.currentState) {
            const currentStateObj = this.states.get(this.currentState);
            if (currentStateObj?.exit) {
                currentStateObj.exit(data);
            }
        }

        // Update state tracking
        this.previousState = this.currentState;
        this.currentState = newState;

        // Enter new state
        const newStateObj = this.states.get(newState);
        if (newStateObj?.enter) {
            newStateObj.enter(data);
        }

        return true;
    }

    update(deltaTime, data = null) {
        if (!this.currentState) {
            return;
        }

        const state = this.states.get(this.currentState);
        if (state?.update) {
            state.update(deltaTime, data);
        }
    }

    getCurrentState() {
        return this.currentState;
    }

    isInState(stateName) {
        return this.currentState === stateName;
    }
}
