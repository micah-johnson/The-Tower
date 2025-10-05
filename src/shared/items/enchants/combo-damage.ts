import { DamageContext } from "../../combat";
import { ItemSubType, ItemType } from "..";
import { allOf, AbstractEnchant, createEnumProperty, Enchant, EnchantBinding, EnchantPhase, matchItemSubTypes, matchItemTypes } from ".";
import { registerEnchantLore } from "./lore";

interface ComboStrikeConfig {
	readonly cadence: number;
	readonly multiplier: number;
    readonly tier: 1 | 2 | 3;
}

const COMBO_CONFIG: Record<number, ComboStrikeConfig> = {
	1: { cadence: 4, multiplier: 1.2, tier: 1 },
	2: { cadence: 3, multiplier: 1.35, tier: 2 },
	3: { cadence: 3, multiplier: 1.45, tier: 3 },
};

export const ComboStrikeProperty = createEnumProperty<ComboStrikeConfig>(
	[COMBO_CONFIG[1], COMBO_CONFIG[2], COMBO_CONFIG[3]],
	(binding) => {
		const tier = binding.definition.enchant?.comboTier;
		if (!tier) {
			return undefined;
		}
		return COMBO_CONFIG[tier];
	},
);

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

export function getComboStrikeLore(tier: 1 | 2 | 3) {
	const config = COMBO_CONFIG[tier];
	const bonusPercent = math.floor((config.multiplier - 1) * 100 + 0.5);
	return {
		tier,
		name: "Combo Strike",
		description: `Every ${ordinal(config.cadence)} hit deals +${bonusPercent}% damage.`,
	};
}

registerEnchantLore("comboTier", (tier) => getComboStrikeLore(tier as 1 | 2 | 3));

@Enchant({
	phase: EnchantPhase.Attacker,
	matcher: allOf(
		matchItemTypes(ItemType.WEAPON),
		matchItemSubTypes(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD),
	),
	priority: 120,
})
export class ComboDamageEnchant extends AbstractEnchant<DamageContext, typeof EnchantPhase.Attacker> {
	private hitCounter = 0;

	constructor(
		binding: EnchantBinding,
		priority: number,
		phase: typeof EnchantPhase.Attacker,
	) {
		super(binding, priority, phase);
	}

	apply(context: DamageContext) {
		const config = this.binding.get(ComboStrikeProperty);
		if (!config) {
			return context;
		}

		const base = context.finalDamage ?? context.baseDamage;
		const nextCount = (this.hitCounter ?? 0) + 1;
		const shouldProc = nextCount % config.cadence === 0;
		if (shouldProc) {
			const boosted = base * config.multiplier;
			const tier = this.binding.definition.enchant?.comboTier ?? config.tier;
			const bonusPercent = math.floor((config.multiplier - 1) * 100 + 0.5);
			print(`[Enchant][ComboStrike] tier ${tier} proc for ${this.binding.instance.id} (${this.binding.instance.uuid}) => +${bonusPercent}% (${boosted})`);
			context.finalDamage = boosted;
			this.hitCounter = 0;
		} else {
			this.hitCounter = nextCount;
		}
		return context;
	}
}
