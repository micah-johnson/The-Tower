import { Signal } from "../utils/signal";

export abstract class State {
    private _version = 0;
    readonly Changed = new Signal<[number]>()

    protected bump() {
        this._version++;

        this.Changed.Fire(this._version)
    }

    getVersion() {
        return this._version
    }

    protected setVersion(version: number) {
        this._version = version

        this.Changed.Fire(this._version)
    }

    protected addDependency(state: State) {
        state.Changed.Connect(() => this.bump())   
    }

    protected addDependencies(states: State[]) {
        states.forEach(s => this.addDependency(s))
    }

    dispose() {
        this.Changed.DisconnectAll()
    }
}
