import { Pipeline } from "../../shared/combat/pipeline";
import { DamageContext } from "../../shared/combat/types";
import type { ServerPlayerState } from "../player";

export interface ServerDamageContext extends DamageContext<ServerPlayerState, ServerPlayerState> {}

export class ServerDamageCoordinator {
	readonly attacker = new Pipeline<ServerDamageContext>();
	readonly defender = new Pipeline<ServerDamageContext>();
	readonly postHit = new Pipeline<ServerDamageContext>();

	apply(initial: ServerDamageContext) {
		const queue = new Array<ServerDamageContext>();
		queue.push(initial);

		let result = initial;

		while (queue.size() > 0) {
			const context = queue.shift()!;
			context.cancelled = context.cancelled ?? false;
			context.applied = context.applied ?? false;

			context.queueHit = (queuedContext) => {
				const clone: ServerDamageContext = {
					attacker: queuedContext.attacker,
					victim: queuedContext.victim,
					baseDamage: queuedContext.baseDamage,
					finalDamage: queuedContext.finalDamage ?? queuedContext.baseDamage,
					applied: queuedContext.applied ?? false,
					cancelled: queuedContext.cancelled ?? false,
				};
				queue.push(clone);
			};

			const processed = this.runPhases(context);

			if (context === initial) {
				result = processed;
			}

			context.queueHit = undefined;
		}

		return result;
	}

	private runPhases(context: ServerDamageContext) {
		let current = this.attacker.run(context);
		if (current.cancelled) {
			return current;
		}

		current = this.defender.run(current);
		if (current.cancelled) {
			return current;
		}

		const humanoid = current.victim.player.Character?.FindFirstChildOfClass("Humanoid");
		if (!humanoid) {
			current.cancelled = true;
			return current;
		}

		const damage = math.max(current.finalDamage, 0);
		humanoid.Health = math.max(humanoid.Health - damage, 0);
		current.applied = true;

		this.postHit.run(current);

		return current;
	}
}
