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
import { PlayerContextToken } from "./contextTokens";
import { registerEnchantLore } from "./lore";

type RealityBreakTier = 1 | 2 | 3;

interface RealityBreakConfig {
	readonly cadence: number;
	readonly speedMultiplier: number;
	readonly tier: RealityBreakTier;
}

const REALITY_BREAK_CONFIG: Record<RealityBreakTier, RealityBreakConfig> = {
	1: { cadence: 5, speedMultiplier: 2.7, tier: 1 },
	2: { cadence: 5, speedMultiplier: 3.6, tier: 2 },
	3: { cadence: 4, speedMultiplier: 3.8, tier: 3 },
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

export const RealityBreakProperty = createEnumProperty<RealityBreakConfig>(
	[REALITY_BREAK_CONFIG[1], REALITY_BREAK_CONFIG[2], REALITY_BREAK_CONFIG[3]],
	(binding) => {
		const enchant = binding.definition.enchant;
		if (!enchant) {
			return undefined;
		}
		const tier: RealityBreakTier | undefined = enchant.realityBreakTier ?? enchant.comboTier;
		if (!tier) {
			return undefined;
		}
		return REALITY_BREAK_CONFIG[tier];
	},
);

export function getRealityBreakLore(tier: RealityBreakTier) {
	const config = REALITY_BREAK_CONFIG[tier];
	const boostPercent = math.floor((config.speedMultiplier - 1) * 100 + 0.5);
	return {
		tier,
		name: "Combo: Reality Break",
		description: `Every ${ordinal(config.cadence)} hit makes the next swing ${boostPercent}% faster.`,
	};
}

registerEnchantLore("realityBreakTier", (tier) => getRealityBreakLore(tier as RealityBreakTier));

@Enchant({
	phase: EnchantPhase.PostHit,
	matcher: allOf(
		matchItemTypes(ItemType.WEAPON),
		matchItemSubTypes(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD),
	),
	priority: 105,
})
export class ComboRealityBreakEnchant extends AbstractEnchant<DamageContext, typeof EnchantPhase.PostHit> {
	private hitCounter = 0;

	constructor(
		binding: EnchantBinding,
		priority: number,
		phase: typeof EnchantPhase.PostHit,
	) {
		super(binding, priority, phase);
	}

	apply(context: DamageContext) {
		const config = this.binding.get(RealityBreakProperty);
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

		attacker.combatState.setNextSwingSpeedMultiplier(config.speedMultiplier);
		const boostPercent = math.floor((config.speedMultiplier - 1) * 100 + 0.5);
		print(
			`[Enchant][RealityBreak] tier ${config.tier} proc for ${this.binding.instance.id} (${this.binding.instance.uuid}) => +${boostPercent}% next swing`,
		);

		return context;
	}
}
