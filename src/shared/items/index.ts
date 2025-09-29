import { t } from "@rbxts/t";
// Attributes
export const Attribute = {
  HEALTH: "Health",
  DAMAGE: "Damage",
  FORTITUDE: "Fortitude",
  AGILITY: "Agility",
  INTELLIGENCE: "Intelligence",
  LUCK: "Luck",
}

export const tAttribute = t.valueOf(Attribute);

export type Attribute = typeof Attribute

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

export type ItemType = typeof ItemType

// Item Attribute
export const tAttributeModifier = t.interface({
  attribute: tAttribute,
  type: t.union(t.literal("additive"), t.literal("multiplicative"), t.literal("absolute")),
  value: t.number
})

export type ItemAttribute = t.static<typeof tAttributeModifier>

// Item Definition
export const tItemDef = t.interface({
  id: t.string,
  type: tItemType,
  name: t.string,
  description: t.string,
  maxStack: t.number, // -1 = unlimited, 1 = non-stackable
  transferable: t.boolean,
  attr: t.array(tAttributeModifier),
  rarity: tItemRarity,
  durability: t.number, // -1 = unbreakable
//   allowedEnchants: []
})

export type ItemDef = t.static<typeof tItemDef>;

// Item Instance
export const tItemInstance = t.interface({
  uuid: t.string,
  id: t.string,
  stack: t.number,
  attr: t.array(tAttributeModifier)
})

export type ItemInstance = t.static<typeof tItemInstance>
