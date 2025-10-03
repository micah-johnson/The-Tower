import { Attribute, ItemDef, ItemEffectType, ItemRarity, ItemSubType, ItemType, tItemDef, BlockReactionType } from ".";
import { RARITY_COLORS } from "../consts/colors";
import { buildBlockConfig } from "./blockDefaults";

export class ItemRepository {
    private readonly itemDefs = new Map<string, ItemDef>();

    constructor(seed?: ReadonlyArray<ItemDef>) {
        seed?.forEach(item => this.register(item));
    }

    register(itemDef: ItemDef) {
        if (!tItemDef(itemDef)) {
            throw "Invalid item payload";
        }

        this.itemDefs.set(itemDef.id, itemDef);
    }

    get(id: string) { return this.itemDefs.get(id); }

    all(): ReadonlyMap<string, ItemDef> { return this.itemDefs; }
}

// Default Item Repository
export const itemRepository = new ItemRepository([
    {
        id: "rape_sword",
        name: "Sword of Raping",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].SWORD,
        description: `A <font color="#${RARITY_COLORS.Mythical.ToHex()}">Mythical</font> sword, <font color="#ff7aca">rape</font> your opponents!`,
        rarity: ItemRarity.MYTHICAL,
        attr: [{
            attribute: Attribute.HEALTH,
            type: "additive",
            value: 69,
        }, {
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 20,
        }, {
            attribute: Attribute.ATTACK_SPEED,
            type: "additive",
            value: 1000,
        }],
        effects: [{
            type: ItemEffectType.LIFESTEAL,
            amount: 0.1,
        }],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD, {
            parry: {
                counterDamage: 50,
            },
            block: {
                damageMultiplier: 0.35,
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: -1,
    },
    {
        id: "sword",
        name: "Sword",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].SWORD,
        description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
        rarity: ItemRarity.COMMON,
        attr: [{
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 5,
        }, {
            attribute: Attribute.ATTACK_SPEED,
            type: "additive",
            value: 1000,
        }],
        effects: [],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD, {
            parry: {
                counterDamage: 25,
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: -1,
    },
    {
        id: "rare_sword",
        name: "Sword",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].SWORD,
        description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
        rarity: ItemRarity.RARE,
        attr: [{
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 5,
        }, {
            attribute: Attribute.ATTACK_SPEED,
            type: "additive",
            value: 1000,
        }],
        effects: [],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD, {
            parry: {
                counterDamage: 28,
            },
            block: {
                damageMultiplier: 0.45,
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: -1,
    },
    {
        id: "epic_sword",
        name: "Sword",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].SWORD,
        description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
        rarity: ItemRarity.EPIC,
        attr: [{
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 5,
        }, {
            attribute: Attribute.ATTACK_SPEED,
            type: "additive",
            value: 1000,
        }],
        effects: [],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD, {
            parry: {
                counterDamage: 30,
            },
            block: {
                damageMultiplier: 0.42,
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: -1,
    },
    {
        id: "legendary_sword",
        name: "Sword",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].SWORD,
        description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
        rarity: ItemRarity.LEGENDARY,
        attr: [{
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 5,
        }, {
            attribute: Attribute.ATTACK_SPEED,
            type: "additive",
            value: 1000,
        }],
        effects: [],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].SWORD, {
            parry: {
                counterDamage: 35,
            },
            block: {
                damageMultiplier: 0.4,
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: -1,
    },
    {
        id: "chair",
        name: "Wooden Chair",
        type: ItemType.TOOL,
        description: "Looks sturdy enough to block once or twice.",
        rarity: ItemRarity.COMMON,
        attr: [],
        effects: [],
        block: buildBlockConfig(ItemType.TOOL, undefined, {
            parryWindowMs: 120,
            block: {
                reaction: { type: BlockReactionType.BREAK },
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: 15,
    },
    {
        id: "raping_bow",
        name: "Raping Bow",
        type: ItemType.WEAPON,
        subtype: ItemSubType[ItemType.WEAPON].BOW,
        description: "Grape your opponent's butt and pierce them with an arrow",
        rarity: ItemRarity.RARE,
        attr: [{
            attribute: Attribute.DAMAGE,
            type: "additive",
            value: 3,
        }],
        effects: [],
        block: buildBlockConfig(ItemType.WEAPON, ItemSubType[ItemType.WEAPON].BOW, {
            block: {
                reaction: { type: BlockReactionType.DISABLE, duration: 3, durabilityDamage: 5 },
            },
        }),
        maxStack: 1,
        transferable: false,
        durability: 30,
    },
]);
