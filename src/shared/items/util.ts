import { ReplicatedStorage } from "@rbxts/services";
import { ItemDef, ItemInstance } from ".";
import { itemRepository } from "./repository";

export const EQUIPPABLE_SLOTS = [ "hotbar_0", "hotbar_1", "hotbar_2", "hotbar_3", "hotbar_4", "hotbar_5", "hotbar_6", "hotbar_7", "hotbar_8", "hotbar_9" ]

export function getItemTool(item: ItemDef | ItemInstance) {
    let itemType = ""
    
    if ("type" in item) {
        itemType = item.type   
    } else {
        itemType = itemRepository.get(item.id)?.type || ""
    }

    if (itemType === "") {
        return
    }

    return ReplicatedStorage.WaitForChild("Instances").WaitForChild("Items").WaitForChild(itemType).WaitForChild(item.id)
}

// Returns a boolean indicating whether or not a given slot can be equipped to the players hand.
export function isSlotEquippable(slot: string | undefined) {
    return slot === undefined || EQUIPPABLE_SLOTS.includes(slot)
}