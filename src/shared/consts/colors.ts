import { ItemRarity } from "../items";

export const RARITY_COLORS = {
    [ItemRarity.COMMON]: Color3.fromHex("#F5F5F5"),
    [ItemRarity.RARE]: Color3.fromHex("#4287f5"),
    [ItemRarity.EPIC]: Color3.fromHex("#cb42f5"),
    [ItemRarity.LEGENDARY]: Color3.fromHex("#f5bc42"),
    [ItemRarity.MYTHICAL]: Color3.fromHex("#f54242")
}