import { ItemInstance, ItemType } from "../../shared/items"
import { itemRepository } from "../../shared/items/repository"
import { getItemTool } from "../../shared/items/util"
import { combatHandler } from "../combat/handler"

class ToolRegistry {
    private items = new Map<string, ItemInstance>()
    
    get(uuid: string) {
        return this.items.get(uuid)
    }
    
    add(item: ItemInstance) {
        this.items.set(item.uuid, item)
    }
    
    remove(uuid: string) {
        this.items.delete(uuid)
    }
}

// Handles state of all items present within the workspace (equipped by player, dropped on ground, in chest)
export function createItemToolInstance(item: ItemInstance) {
    const tool = getItemTool(item)

    if (!tool) return

    toolRegistry.add(item)

    const clone = tool.Clone() as Tool

    clone.Name = item.uuid
    clone.SetAttribute("uuid", item.uuid);
    
    clone.CanBeDropped = false

    clone.Destroying.Once(() => {
        toolRegistry.remove(item.uuid)
    })

    if (itemRepository.get(item.id)?.type === ItemType.WEAPON) combatHandler.register(clone)

    return clone
}

export const toolRegistry = new ToolRegistry();