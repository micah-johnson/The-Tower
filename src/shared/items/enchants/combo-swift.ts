import { DamageContext } from "../../combat";
import { ItemSubType, ItemType } from "..";
import {
	AbstractEnchant,
	allOf,
	createEnumProperty,
	Enchant,
	EnchantBinding,
	EnchantPhase,
	matchItemSubTypes,
	matchItemTypes,
} from ".";
import { MovementContextToken, PlayerContextToken } from "./contextTokens";
import { registerEnchantLore } from "./lore";

import type { ServerMovementState, MovementModifier } from "../../../server/movement";

type ComboSwiftTier = 1 | 2 | 3;

interface ComboSwiftConfig {
	readonly cadence: number;
	readonly speedMultiplier: number;
	readonly duration: number;
	readonly tier: ComboSwiftTier;
}

const COMBO_SWIFT_CONFIG: Record<ComboSwiftTier, ComboSwiftConfig> = {
	1: { cadence: 3, speedMultiplier: 1.2, duration: 1.4, tier: 1 },
	2: { cadence: 2, speedMultiplier: 1.25, duration: 1.4, tier: 2 },
	3: { cadence: 2, speedMultiplier: 1.35, duration: 1.3, tier: 3 },
};

function ordinal(n: number) {
	const remainder = n % 100;
	if (remainder >= 11 && remainder <= 13) {
		return `${n}th`;
	}
	switch (n % 10) {
		case 1:
			return `${n}st`;
		case 2:
			return `${n}nd`;
		case 3:
			return `${n}rd`;
		default:
			return `${n}th`;
	}
}

export const ComboSwiftProperty = createEnumProperty<ComboSwiftConfig>(
	[COMBO_SWIFT_CONFIG[1], COMBO_SWIFT_CONFIG[2], COMBO_SWIFT_CONFIG[3]],
	(binding) => {
		const enchant = binding.definition.enchant;
		if (!enchant) {
			return undefined;
		}
		const tier: ComboSwiftTier | undefined = enchant.swiftComboTier ?? enchant.comboTier;
		if (!tier) {
			return undefined;
		}
		return COMBO_SWIFT_CONFIG[tier];
	},
);

export function getComboSwiftLore(tier: ComboSwiftTier) {
	const config = COMBO_SWIFT_CONFIG[tier];
	const bonusPercent = math.floor((config.speedMultiplier - 1) * 100 + 0.5);
	const roundedDuration = math.round(config.duration * 10) / 10;
	return {
		tier,
		name: "Combo: Swift",
		description: `Every ${ordinal(config.cadence)} hit increases Speed by ${bonusPercent}% for ${roundedDuration}s.`,
	};
}

registerEnchantLore("swiftComboTier", (tier) => getComboSwiftLore(tier as ComboSwiftTier));

@Enchant({
	phase: EnchantPhase.PostHit,
	matcher: allOf(
		matchItemTypes(ItemType.WEAPON),
		matchItemSubTypes(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD),
	),
	priority: 110,
})
export class ComboSwiftEnchant extends AbstractEnchant<DamageContext, typeof EnchantPhase.PostHit> {
	private hitCounter = 0;
	private removalTask?: thread;
	private readonly modifierId: string;

	constructor(
		binding: EnchantBinding,
		priority: number,
		phase: typeof EnchantPhase.PostHit,
	) {
		super(binding, priority, phase);
		this.modifierId = `combo-swift-${binding.instance.uuid}`;
	}

	dispose() {
		this.clearModifier();
	}

	apply(context: DamageContext) {
		const config = this.binding.get(ComboSwiftProperty);
		if (!config) {
			return context;
		}

		if (!context.applied) {
			return context;
		}

		const attacker = this.binding.getContext(PlayerContextToken);
		if (!attacker || context.attacker !== attacker) {
			return context;
		}

		this.hitCounter += 1;
		const shouldProc = this.hitCounter >= config.cadence;
		if (!shouldProc) {
			return context;
		}

		this.hitCounter = 0;

		const movement = this.binding.getContext(MovementContextToken) as ServerMovementState | undefined;
		if (!movement) {
			return context;
		}

		this.applyModifier(movement, config);
		return context;
	}

	private applyModifier(movement: ServerMovementState, config: ComboSwiftConfig) {
		const modifier: MovementModifier = {
			id: this.modifierId,
			priority: 150,
			compute(base) {
				return base * config.speedMultiplier;
			},
		};

		movement.setModifier(modifier);

		if (this.removalTask) {
			task.cancel(this.removalTask);
		}

		const tier = config.tier;
		const bonusPercent = math.floor((config.speedMultiplier - 1) * 100 + 0.5);
		print(
			`[Enchant][ComboSwift] tier ${tier} proc for ${this.binding.instance.id} (${this.binding.instance.uuid}) => +${bonusPercent}% for ${config.duration}s`,
		);

		this.removalTask = task.delay(config.duration, () => {
			movement.removeModifier(this.modifierId);
			this.removalTask = undefined;
		});
	}

	private clearModifier() {
		const movement = this.binding.getContext(MovementContextToken) as ServerMovementState | undefined;
		if (movement) {
			movement.removeModifier(this.modifierId);
		}
		if (this.removalTask) {
			task.cancel(this.removalTask);
			this.removalTask = undefined;
		}
	}
}
