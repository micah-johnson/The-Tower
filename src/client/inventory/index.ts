import { EquipItemPacket, InventorySnapshot, MoveItemsRequest, MoveItemsPacket } from "../../shared/network";
import { ItemInstance } from "../../shared/items";
import { BiMap } from "../../shared/utils/bimap";
import { Signal } from "../../shared/utils/signal";
import { isSlotEquippable } from "../../shared/items/util";
import { ClientNet } from "../network";
import { HttpService } from "@rbxts/services";
import { InventoryState } from "../../shared/inventory";

function cloneItem(item: ItemInstance): ItemInstance {
    return {
        uuid: item.uuid,
        id: item.id,
        stack: item.stack,
        attr: item.attr.map((attr) => ({ ...attr })),
        effects: item.effects?.map(effect => ({ ...effect })),
    };
}

export class ClientPlayerInventory extends InventoryState {
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

        this.equippedSlot = snapshot.equippedSlot
        this.setVersion(snapshot._version)
    }
}

export const playerInventory = new ClientPlayerInventory();
