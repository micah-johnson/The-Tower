import { Attribute, ItemDef, ItemEffectType, ItemRarity, ItemSubType, ItemType, tItemDef } from ".";
import { RARITY_COLORS } from "../consts/colors";
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
export const itemRepository = new ItemRepository([{
    id: "rape_sword",
    name: "Sword of Raping",
    type: ItemType.WEAPON,
    subtype: ItemSubType[ItemType.WEAPON].SWORD,
    description: `A <font color="#${RARITY_COLORS.Mythical.ToHex()}">Mythical</font> sword, <font color="#ff7aca">rape</font> your opponents!`,
    rarity: ItemRarity.MYTHICAL,
    attr: [{
        attribute: Attribute.HEALTH,
        type: "additive",
        value: 69
    }, {
        attribute: Attribute.DAMAGE,
        type: "additive",
        value: 20
    }, {
        attribute: Attribute.ATTACK_SPEED,
        type: "additive",
        value: 1000
    }],
    effects: [{
        type: ItemEffectType.LIFESTEAL,
        amount: 0.1,
    }],
    maxStack: 1,
    transferable: false,
    durability: -1,
}, {
    id: "sword",
    name: "Sword",
    type: ItemType.WEAPON,
    subtype: ItemSubType[ItemType.WEAPON].SWORD,
    description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
    rarity: ItemRarity.COMMON,
    attr: [{
        attribute: Attribute.DAMAGE,
        type: "additive",
        value: 5
    }, {
        attribute: Attribute.ATTACK_SPEED,
        type: "additive",
        value: 1000
    }],
    maxStack: 1,
    transferable: false,
    durability: -1,
    effects: [],
}, {
    id: "rare_sword",
    name: "Sword",
    type: ItemType.WEAPON,
    subtype: ItemSubType[ItemType.WEAPON].SWORD,
    description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
    rarity: ItemRarity.RARE,
    attr: [{
        attribute: Attribute.DAMAGE,
        type: "additive",
        value: 5
    }, {
        attribute: Attribute.ATTACK_SPEED,
        type: "additive",
        value: 1000
    }],
    maxStack: 1,
    transferable: false,
    durability: -1,
    effects: [],
}, {
    id: "epic_sword",
    name: "Sword",
    type: ItemType.WEAPON,
    subtype: ItemSubType[ItemType.WEAPON].SWORD,
    description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
    rarity: ItemRarity.EPIC,
    attr: [{
        attribute: Attribute.DAMAGE,
        type: "additive",
        value: 5
    }, {
        attribute: Attribute.ATTACK_SPEED,
        type: "additive",
        value: 1000
    }],
    maxStack: 1,
    transferable: false,
    durability: -1,
    effects: [],
}, {
    id: "legendary_sword",
    name: "Sword",
    type: ItemType.WEAPON,
    subtype: ItemSubType[ItemType.WEAPON].SWORD,
    description: `A boring ahh sword sword, does <font color="#ff2b1c">not</font> rape your opponents...`,
    rarity: ItemRarity.LEGENDARY,
    attr: [{
        attribute: Attribute.DAMAGE,
        type: "additive",
        value: 5
    }, {
        attribute: Attribute.ATTACK_SPEED,
        type: "additive",
        value: 1000
    }],
    maxStack: 1,
    transferable: false,
    durability: -1,
    effects: [],
}]);
