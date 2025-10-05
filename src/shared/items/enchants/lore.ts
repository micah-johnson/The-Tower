import type { ItemEnchantConfig } from "..";

export interface EnchantLore {
	readonly name: string;
	readonly description: string;
	readonly tier: number;
}

type LoreResolver = (tier: number) => EnchantLore;

const loreResolvers = new Map<keyof ItemEnchantConfig, LoreResolver>();

export function registerEnchantLore(key: keyof ItemEnchantConfig, resolver: LoreResolver) {
	loreResolvers.set(key, resolver);
}

export function getEnchantLoreEntries(enchant: ItemEnchantConfig | undefined) {
	if (!enchant) {
		return [] as EnchantLore[];
	}

	const entries = new Array<EnchantLore>();
	for (const [rawKey, rawValue] of pairs(enchant as Record<string, unknown>)) {
		if (!typeIs(rawKey, "string")) {
			continue;
		}
		const key = rawKey as keyof ItemEnchantConfig;
		if (!typeIs(rawValue, "number")) {
			continue;
		}
		const resolver = loreResolvers.get(key);
		if (!resolver) {
			continue;
		}
		const lore = resolver(rawValue);
		if (lore) {
			entries.push(lore);
		}
	}

	entries.sort((left, right) => left.name < right.name);
	return entries;
}
