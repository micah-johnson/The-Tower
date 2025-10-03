import { PipelineContext } from "./types";

export interface PipelineModifier<T extends PipelineContext> {
    priority: number;
    apply(context: T): T | void;
}

export type PipelineDisposer = () => void;

export class Pipeline<T extends PipelineContext> {
    private modifiers = new Array<PipelineModifier<T>>();

	register(modifier: PipelineModifier<T>): PipelineDisposer {
		this.modifiers.push(modifier);
		this.sortModifiers();
		return () => this.unregister(modifier);
	}

	private unregister(modifier: PipelineModifier<T>) {
		this.modifiers = this.modifiers.filter((entry) => entry !== modifier);
	}

    private sortModifiers() {
        this.modifiers.sort((a, b) => a.priority < b.priority);
    }

    run(context: T): T {
        let current = context;
        for (const modifier of this.modifiers) {
            const result = modifier.apply(current);
            if (result !== undefined) {
                current = result;
			}
			if (current.cancelled) {
				break;
			}
		}
		return current;
	}
}
