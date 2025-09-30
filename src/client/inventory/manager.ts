import { InventorySnapshot } from "../../shared/network";
import { ItemInstance } from "../../shared/items";
import { BiMap } from "../../shared/utils/bimap";
import { Signal } from "../../shared/utils/signal";

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

    private slots = new BiMap<string, string>();
    private items = new Map<string, ItemInstance>();
    private knownSlots = new Set<string>();

    applySnapshot(snapshot: InventorySnapshot) {
        this.items.clear();
        this.slots.clear();
        this.knownSlots.clear();

        for (const [uuid, item] of pairs(snapshot.items)) {
            this.items.set(uuid, cloneItem(item));
        }

        for (const [slot, itemUuid] of pairs(snapshot.slots)) {
            this.knownSlots.add(slot);
            if (itemUuid !== undefined) {
                this.slots.set(slot, itemUuid);
            }
        }

        this._version = snapshot.version;
        this.changed.Fire(this._version);
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
}

export const inventoryManager = new InventoryManager();
