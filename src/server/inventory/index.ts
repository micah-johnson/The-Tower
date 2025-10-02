import { HttpService, RunService } from "@rbxts/services";
import { ItemInstance } from "../../shared/items";
import { itemRepository } from "../../shared/items/repository";
import {
    MoveItemsRequest as MoveItemsRequest,
    MoveItemResponse,
    InventorySnapshot,
    InventoryUpdatePacket,
    PacketClass,
    PacketDirection,
    EquipItemRequest,
    EquipItemResponse,
} from "../../shared/network";
import { ServerNet } from "../network";
import type { PlayerProfile } from "../profiles";
import { InventoryState } from "../../shared/inventory";
import { createItemToolInstance } from "../tools";

function cloneItem(item: ItemInstance): ItemInstance {
    return {
        uuid: item.uuid,
        id: item.id,
        stack: item.stack,
        attr: item.attr.map((attr) => ({ ...attr })),
    };
}

function createItemInstance(defId: string, stack = 1): ItemInstance | undefined {
    const def = itemRepository.get(defId);
    if (!def) {
        return undefined;
    }

    return {
        uuid: HttpService.GenerateGUID(false),
        id: def.id,
        stack,
        attr: []
    };
}

function createDefaultInventory(): InventorySnapshot {
    const items: Record<string, ItemInstance> = {};
    const slots: Record<string, string | undefined> = {};

    const starterWeapon = createItemInstance("sword", 1);
    const debugMythic = createItemInstance("rape_sword", 1);

    if (starterWeapon) {
        items[starterWeapon.uuid] = starterWeapon;
        slots.hotbar_1 = starterWeapon.uuid;
    }

    if (debugMythic) {
        items[debugMythic.uuid] = debugMythic;
        slots.hotbar_2 = debugMythic.uuid;
    }

    return {
        _version: 1,
        slots,
        items,
    };
}

function isEmptyRecord(record: Record<string, unknown>) {
    for (const _ of pairs(record)) {
        return false;
    }
    
    return true;
}

export class ServerInventoryState extends InventoryState {
    constructor(private readonly player: Player, private readonly profile: PlayerProfile) {
        super()

        const stored = profile.Data.inventory ?? createDefaultInventory();
        if (!stored || isEmptyRecord(stored.items)) {
            this.loadSnapshot(createDefaultInventory());
        } else {
            this.loadSnapshot(stored);
        }

        this.ensureDebugItems();
        this.bumpAndSync();
    }

    move(slot: string, itemUuid: string, skipSync?: boolean): MoveItemResponse {
        const normalizedItemUuid = itemUuid === "" ? undefined : itemUuid;

        if (normalizedItemUuid !== undefined && !this.items.has(normalizedItemUuid)) {
            return { ok: false, error: "Item does not belong to the player" };
        }

        const current = this.slots.getByKey(slot);

        if (normalizedItemUuid === undefined) {
            if (!current) {
                return { ok: true };
            }

            this.slots.deleteByKey(slot);
            if (!skipSync) this.bumpAndSync();
            return { ok: true };
        }

        if (current === normalizedItemUuid) {
            return { ok: true };
        }

        const displacedSlots: string[] = [];
        this.slots.forEach((uuid, slotId) => {
            if (uuid === normalizedItemUuid) {
                displacedSlots.push(slotId);
            }
        })

        for (const displaced of displacedSlots) {
            this.slots.deleteByKey(displaced);
        }

        this.slots.set(slot, normalizedItemUuid);
        if (!skipSync) this.bumpAndSync();
        return { ok: true };
    }

    syncToClient() {
        const snapshot = this.toSnapshot();
        this.profile.Data.inventory = snapshot;
        ServerNet.sendToClient(
            InventoryUpdatePacket as PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>,
            this.player,
            snapshot,
        );
    }

    dispose() {
        this.profile.Data.inventory = this.toSnapshot();
    }

    drop() {
        const equipped = this.getEquippedItem()

        if (!equipped) {
            return {
                ok: false,
                error: "Nothing equipped",
            } as const;
        }

        const tool = this.player.Character?.FindFirstChild(equipped.uuid)

        const slotId = this.getSlotOfItem(equipped)

        this.removeItem(equipped)

        if (slotId) {
            this.slots.deleteByKey(slotId)
        }

        if (this.equippedSlot === slotId) {
            this.equippedSlot = undefined
        }

        if (tool) {
            tool.Parent = game.Workspace
        }

        this.bumpAndSync()

        return {
            ok: true,
        } as const;
    }

    equip(slot: string | undefined): EquipItemResponse {
        this.equippedSlot = slot
        this.bumpAndSync()

        return {
            ok: true
        }
    }

    private loadSnapshot(snapshot: InventorySnapshot) {
        this.items.clear();
        this.slots.clear();

        this.setVersion(snapshot._version)

        for (const [uuid, item] of pairs(snapshot.items)) {
            this.items.set(uuid, cloneItem(item));
        }

        for (const [slot, uuid] of pairs(snapshot.slots)) {
            if (uuid !== undefined) {
                this.slots.set(slot, uuid);
            }
        }
    }

    private moveStrandedItems() {
        this.items.forEach(item => {
            if (!this.getSlotOfItem(item)) {
                this.move(this.getNewInventorySlot(), item.uuid, true)
            }
        })
    }

    bumpAndSync() {
        this.bump()

        this.moveStrandedItems()
        this.syncToClient();
    }

    addItem(item: ItemInstance) {
        this.items.set(item.uuid, item)

        this.bumpAndSync()
    }

    removeItem(item: ItemInstance) {
        this.items.delete(item.uuid);
    }

    private ensureDebugItems() {
        if (!RunService.IsStudio()) {
            return;
        }

        let dirty = false;

        const ensureItem = (defId: string) => {
            const existingUuid = this.findItemUuidByDef(defId);
            if (existingUuid) {
                return
            }

            const created = createItemInstance(defId, 1);
            if (!created) {
                warn(`[S] Failed to create debug item ${defId}`);
                return;
            }

            this.items.set(created.uuid, created);
            dirty = true;
        };

        ensureItem("rape_sword");
        ensureItem("sword")
        ensureItem("rare_sword")
        ensureItem("epic_sword")
        ensureItem("legendary_sword")

        if (dirty) {
            this.bumpAndSync();
        }
    }

    private findItemUuidByDef(defId: string) {
        for (const [uuid, item] of this.items) {
            if (item.id === defId) {
                return uuid;
            }
        }
        return undefined;
    }

    private toSnapshot(): InventorySnapshot {
        const items: Record<string, ItemInstance> = {};
        for (const [uuid, item] of this.items) {
            items[uuid] = cloneItem(item);
        }

        const slots: Record<string, string | undefined> = {};
        this.slots.forEach((_, slotId) => {
            slots[slotId] = this.slots.getByKey(slotId);
        })

        return {
            _version: this.getVersion(),
            slots,
            items,
            equippedSlot: this.equippedSlot
        };
    }
}
