import { EquipItemPacket, InventorySnapshot, MoveItemRequest, MoveItemsPacket } from "../../shared/network";
import { ItemInstance } from "../../shared/items";
import { BiMap } from "../../shared/utils/bimap";
import { Signal } from "../../shared/utils/signal";
import { isSlotEquippable } from "../../shared/items/util";
import { ClientNet } from "../network";
import { HttpService } from "@rbxts/services";

function cloneItem(item: ItemInstance): ItemInstance {
    return {
        uuid: item.uuid,
        id: item.id,
        stack: item.stack,
        attr: item.attr.map((attr) => ({ ...attr })),
    };
}

export class InventoryManager {
    private _version = 0;
    readonly changed = new Signal<[number]>();

    private slots = new BiMap<string, string>(); // slot_id -> item_uuid
    private items = new Map<string, ItemInstance>();

    private equippedSlot: string | undefined // id of equipped slot,

    applySnapshot(snapshot: InventorySnapshot) {
        this.items.clear();
        this.slots.clear();

        for (const [uuid, item] of pairs(snapshot.items)) {
            this.items.set(uuid, cloneItem(item));
        }

        for (const [slot, itemUuid] of pairs(snapshot.slots)) {
            if (itemUuid !== undefined) {
                this.slots.set(slot, itemUuid);
            }
        }

        this._version = snapshot.version;
        this.changed.Fire(this._version);

        if (this.equippedSlot) this.equipSlot(this.equippedSlot)

        this.moveStrandedItems()
    }

    // Moves any items without a slot to a new inventory slot
    private moveStrandedItems() {
        const moves: MoveItemRequest = []
        
        this.items.forEach(item => {
            if (!this.getSlotOfItem(item)) {
                moves.push({
                    slot: this.getNewInventorySlot(),
                    itemUuid: item.uuid
                })
            }
        })

        if (moves.size() > 0) {
            ClientNet.requestServer(
                MoveItemsPacket,
                moves
            )
        }
    }

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

    getVersion() {
        return this._version;
    }

    equipSlot(slot: string | undefined) {
        if (!isSlotEquippable(slot)) return

        this.equippedSlot = slot;

        task.spawn(() => {
            if (this.getVersion() === 0) {
                warn(`[C] Equip request for ${slot} skipped: inventory not ready`);
                return;
            }

            const item = slot ? this.getItemInSlot(slot) : undefined;

            const [success, response] = pcall(() =>
                ClientNet.requestServer(
                    EquipItemPacket,
                    {
                        itemUuid: item ? item.uuid : "",
                    },
                ),
            );

            if (!success) {
                warn(`[C] Equip request for ${slot} failed: ${response}`);
                return;
            }

            if (!response.ok && response.error) {
                warn(`[C] Equip request for ${slot} rejected: ${response.error}`);
            }
        });
    }

    getEquippedSlot() {
        return this.equippedSlot
    }
}

export const inventoryManager = new InventoryManager();
