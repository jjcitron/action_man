export class StateMachine {
    constructor() {
        this.states = {};
        this.currentState = null;
    }

    addState(name, state) {
        this.states[name] = state;
    }

    setState(name) {
        if (this.currentState === this.states[name]) return;

        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }

        this.currentState = this.states[name];

        if (this.currentState && this.currentState.enter) {
            this.currentState.enter();
        }
    }

    update(input, dt) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(input, dt);
        }
    }
}

export class State {
    constructor(parent) {
        this.parent = parent;
    }
    enter() { }
    update(input) { }
    exit() { }
}
