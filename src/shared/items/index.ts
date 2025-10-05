import { t } from "@rbxts/t";
// Attributes
export const Attribute = {
  HEALTH: "Health",
  DAMAGE: "Damage",
  SPEED: "Speed",
  ATTACK_SPEED: "Attack Speed",
  FORTITUDE: "Fortitude",
  AGILITY: "Agility",
  INTELLIGENCE: "Intelligence",
  LUCK: "Luck",
} as const

export const tAttribute = t.valueOf(Attribute);

export type Attribute = typeof Attribute[keyof typeof Attribute]

// Item Rarity
export const ItemRarity = {
    COMMON: "Common",
    RARE: "Rare",
    EPIC: "Epic",
    LEGENDARY: "Legendary",
    MYTHICAL: "Mythical",
} as const;

export type ItemRarity = typeof ItemRarity[keyof typeof ItemRarity];

export const tItemRarity = t.valueOf(ItemRarity)

// Item Type
export const ItemType = {
  WEAPON: "Weapon",
  RESOURCE: "Resource",
  TOOL: "Tool",
  ARMOR: "Armor",
} as const

export const tItemType = t.valueOf(ItemType);

export type ItemType = typeof ItemType[keyof typeof ItemType];

export const BlockReactionType = {
  NONE: "none",
  BREAK: "break",
  DISABLE: "disable",
} as const;

export type BlockReactionType = typeof BlockReactionType[keyof typeof BlockReactionType];

export const tBlockReaction = t.union(
  t.interface({ type: t.literal(BlockReactionType.NONE) }),
  t.interface({ type: t.literal(BlockReactionType.BREAK) }),
  t.interface({
    type: t.literal(BlockReactionType.DISABLE),
    duration: t.number,
    durabilityDamage: t.optional(t.number),
  }),
);

export type BlockReaction = t.static<typeof tBlockReaction>;

export const tBlockOutcome = t.interface({
  damageMultiplier: t.optional(t.number),
  counterDamage: t.optional(t.number),
  reaction: t.optional(tBlockReaction),
});

export type BlockOutcome = t.static<typeof tBlockOutcome>;

export const tBlockConfig = t.interface({
  enabled: t.boolean,
  parryWindowMs: t.number,
  defenderPriority: t.optional(t.number),
  parry: t.optional(tBlockOutcome),
  block: t.optional(tBlockOutcome),
});

export type BlockConfig = t.static<typeof tBlockConfig>;

// Item Sub Type
export const ItemSubType = {
  [ItemType.WEAPON]: {
    SWORD: "Sword",
    BOW: "Bow",
  },
  [ItemType.ARMOR]: {
    HELMET: "Helmet",
    CHESTPLATE: "Chestplate",
    LEGGINGS: "Leggings",
    BOOTS: "Boots",
  },
  [ItemType.RESOURCE]: {} as const,
  [ItemType.TOOL]: {} as const,
} as const;

type ItemSubTypeMap = typeof ItemSubType;

// For a given primary type T, this yields the union of subtype *values* (e.g. "Sword" | "Helmet" | ...)
export type SubTypeFor<T extends ItemType> =
  keyof ItemSubTypeMap[T] extends never
    ? never
    : ItemSubTypeMap[T][keyof ItemSubTypeMap[T]];

// Runtime validator for a given primary type
export const tSubTypeFor = <T extends ItemType>(itemType: T) =>
  t.valueOf(ItemSubType[itemType] as Record<string, string>);

// Item Attribute
export const tAttributeModifier = t.interface({
  attribute: tAttribute,
  type: t.union(t.literal("additive"), t.literal("multiplicative"), t.literal("absolute")),
  value: t.number
})

export type AttributeModifier = t.static<typeof tAttributeModifier>

export const ItemEffectType = {
  LIFESTEAL: "lifesteal",
} as const;

const tLifeStealEffect = t.interface({
  type: t.literal(ItemEffectType.LIFESTEAL),
  amount: t.number,
});

export type LifeStealEffect = t.static<typeof tLifeStealEffect>;

export type ItemEffect = LifeStealEffect;

export const tItemEffect = t.union(tLifeStealEffect);

// Item Definition
// Discriminated union at runtime: (type === X) ⇒ (subtype ∈ SubTypeFor<X>)
const tComboTier = t.union(t.literal(1), t.literal(2), t.literal(3));

export interface ItemEnchantConfig {
	comboTier?: 1 | 2 | 3;
}

const tItemEnchantConfig = t.interface({
	comboTier: t.optional(tComboTier),
});

// Common item fields (without type/subtype so we can intersect in discriminated union)
const tItemCommon = t.interface({
  id: t.string,
  name: t.string,
  description: t.string,
  maxStack: t.number,
  transferable: t.boolean,
  attr: t.array(tAttributeModifier),
  rarity: tItemRarity,
  durability: t.number,
  effects: t.optional(t.array(tItemEffect)),
  block: t.optional(tBlockConfig),
  enchant: t.optional(tItemEnchantConfig),
});

export const tItemDef = t.union(
  t.intersection(
    tItemCommon,
    t.interface({
      type: t.literal(ItemType.WEAPON),
      subtype: t.valueOf(ItemSubType[ItemType.WEAPON]),
    }),
  ),
  t.intersection(
    tItemCommon,
    t.interface({
      type: t.literal(ItemType.ARMOR),
      subtype: t.valueOf(ItemSubType[ItemType.ARMOR]),
    }),
  ),
  t.intersection(
    tItemCommon,
    t.interface({
      type: t.literal(ItemType.RESOURCE),
      // No subtypes allowed -> omit field or set to never via t.never() if you prefer explicit
    }),
  ),
  t.intersection(
    tItemCommon,
    t.interface({
      type: t.literal(ItemType.TOOL),
    }),
  )
);

export type ItemDef = t.static<typeof tItemDef>;

// Item Instance
export const tItemInstance = t.interface({
  uuid: t.string,
  id: t.string,
  stack: t.number,
  attr: t.array(tAttributeModifier),
  effects: t.optional(t.array(tItemEffect)),
  durability: t.optional(t.number),
  block: t.optional(tBlockConfig),
})

export type ItemInstance = t.static<typeof tItemInstance>
