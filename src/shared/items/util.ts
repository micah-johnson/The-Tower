import { ReplicatedStorage } from "@rbxts/services";
import { ItemDef, ItemInstance } from ".";
import { itemRepository } from "./repository";

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