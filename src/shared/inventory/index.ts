import { InventorySnapshot } from "../../shared/network";
import { ItemInstance } from "../../shared/items";
import { BiMap } from "../../shared/utils/bimap";
import { Signal } from "../../shared/utils/signal";
import { HttpService } from "@rbxts/services";
import { State } from "../state";

export abstract class InventoryState extends State {
    protected slots = new BiMap<string, string>(); // slot_id -> item_uuid
    protected items = new Map<string, ItemInstance>();

    protected equippedSlot: string | undefined // id of equipped slot,

    getNewInventorySlot() {
        return `inventory_${HttpService.GenerateGUID(false)}`
    }

    getInventorySlots() {
        const slots: string[] = []

        this.slots.forEach((_, k) => {
            if (k.sub(1, "inventory".size()) === "inventory") {
                slots.push(k)
            }
        })

        return slots
    }

    getItems() {
        const items: ItemInstance[] = []

        this.items.forEach((item) => {
            items.push(item)
        })

        return items
    }

    getStrandedItems() {
        const items: ItemInstance[] = []

        this.items.forEach((item) => {
            if (!this.getSlotOfItem(item)) items.push(item)
        })

        return items
    }

    getItem(uuid: string) {
        return this.items.get(uuid);
    }

    getItemInSlot(slot: string) {
        const uuid = this.slots.getByKey(slot);
        return uuid ? this.items.get(uuid) : undefined;
    }

    getSlotOfItem(item: ItemInstance) {
        return this.slots.getByValue(item.uuid);
    }

    getEquippedSlot() {
        return this.equippedSlot
    }

    getEquippedItem() {
        return this.equippedSlot ? this.getItemInSlot(this.equippedSlot) : undefined
    }
}