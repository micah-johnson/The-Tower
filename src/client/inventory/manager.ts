import { ItemInstance } from "../../shared/items";
import { BiMap } from "../../shared/utils/bimap";
import { Signal } from "../../shared/utils/signal";

export class InventoryManager {
    private _version = 0; // bump on every mutation
    readonly changed = new Signal<[number]>();
    
    slots: BiMap<string, string> = new BiMap() // slot_id -> item.uuid
    items: Map<string, ItemInstance> = new Map() // item.uuid -> item

    // Add item to inventory, returns passed item
    addItem(item: ItemInstance): ItemInstance {
        this.items.set(item.uuid, item)

        this.bump()

        return item
    }

    getItem(uuid: string) {
        return this.items.get(uuid)
    }

    setSlot(slot: string, item: ItemInstance) {
        this.slots.set(slot, item.uuid)

        this.bump()
    }

    getSlotOfItem(item: ItemInstance) {
        this.slots.getByValue(item.uuid)
    }

    getItemInSlot(slot: string) {
        const uuid = this.slots.getByKey(slot)
        
        return uuid ? this.getItem(uuid) : undefined
    }

    private bump() {
        this._version++
        this.changed.Fire(this._version)
    }

    /** For React: stable snapshot primitive */
    getVersion() {
        return this._version
    }
}

export const inventoryManager = new InventoryManager()

const item = inventoryManager.addItem({
    uuid: "efa360f3-8e56-4c68-9117-0c9189fd8d99",
    id: "rape_sword",
    attr: [],
    stack: 1
})

inventoryManager.setSlot("hotbar_1", item)

const sword = inventoryManager.addItem({
    uuid: "0604bf61-97e5-4c65-ab34-f140da0f844a",
    id: "sword",
    attr: [],
    stack: 500
})

inventoryManager.setSlot("hotbar_2", sword)