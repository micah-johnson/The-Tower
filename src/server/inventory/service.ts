import { HttpService, RunService } from "@rbxts/services";
import { ItemInstance } from "../../shared/items";
import { itemRepository } from "../../shared/items/repository";
import {
    MoveItemRequest as MoveItemsRequest,
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
import { getItemTool } from "../../shared/items/util";
import { PlayerInventory } from "../../shared/inventory";

const ALLOWED_SLOTS = ["hotbar_1", "hotbar_2", "hotbar_3", "hotbar_4", "hotbar_5", "hotbar_6", "hotbar_7", "hotbar_8", "hotbar_9", "hotbar_0"] as const;
const ALLOWED_SLOT_SET = new Set<string>(ALLOWED_SLOTS);

interface HeartbeatState {
    clientTimestamp: number;
    serverTimestamp: number;
    roundTripMs: number;
}

const playerInventories = new Map<number, ServerPlayerInventory>();
const heartbeatState = new Map<number, HeartbeatState>();

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
        // Start with modifiers defined on the item definition; copy so clients can't mutate server state
        attr: def.attr.map((attr) => ({ ...attr })),
    };
}

function createDefaultInventory(): InventorySnapshot {
    const items: Record<string, ItemInstance> = {};
    const slots: Record<string, string | undefined> = {};

    for (const slot of ALLOWED_SLOTS) {
        slots[slot] = undefined;
    }

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

class ServerPlayerInventory extends PlayerInventory {
    constructor(private readonly player: Player, private readonly profile: PlayerProfile) {
        super()

        const stored = profile.Data.inventory ?? createDefaultInventory();
        if (!stored || isEmptyRecord(stored.items)) {
            this.loadSnapshot(createDefaultInventory());
        } else {
            this.loadSnapshot(stored);
        }

        this.ensureDebugItems();
        this.syncToClient();
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

    syncEquippedItem() {
        if (!this.player.Character) {
            return {
                ok: false,
                error: "Player character does not exist."
            }
        }

        const slot = this.getEquippedSlot()

        if (slot === undefined) { // Equipped no slot
            // Unequip all tools
            for (const child of this.player.Character.GetChildren()) {
                if (child.IsA("Tool")) {
                    child.Destroy()
                }
            }

            return {
                ok: true
            }
        }

        const item = this.getItemInSlot(slot)

        if (!item) {
            // Unequip all tools
            for (const child of this.player.Character.GetChildren()) {
                if (child.IsA("Tool")) {
                    child.Destroy()
                }
            }

            return {
                ok: true
            }
        }

        const tool = getItemTool(item)

        if (!tool) {
            return {
                ok: false,
                error: "Unable to find tool instance."
            }
        }

        // Handle equipped tools
        for (const child of this.player.Character.GetChildren()) {
            if (child.IsA("Tool")) {
                if (child.Name === item.id) { // If tool already equipped, return
                    return {
                        ok: true
                    }
                }

                child.Destroy() // Otherwise destroy equipped tool
            }
        }

        const clone = tool.Clone()

        clone.Parent = this.player.Character

        return {
            ok: true
        }
    }

    equip(slot: string | undefined): EquipItemResponse {
        this.equippedSlot = slot
        this.bumpAndSync()

        return this.syncEquippedItem()
    }

    private loadSnapshot(snapshot: InventorySnapshot) {
        this.items.clear();
        this.slots.clear();
        this.slots.clear();

        this._version = snapshot._version ?? 0;

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
                this.move(this.getNewInventorySlot(), item.uuid)
            }
        })
    }

    bumpAndSync() {
        this._version += 1;
        this.moveStrandedItems()
        this.syncEquippedItem()
        this.syncToClient();
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
            _version: this._version,
            slots,
            items,
            equippedSlot: this.equippedSlot
        };
    }
}

export function bindPlayerInventory(player: Player, profile: PlayerProfile) {
    const existing = playerInventories.get(player.UserId);
    if (existing) {
        existing.dispose();
    }

    const inventory = new ServerPlayerInventory(player, profile);
    playerInventories.set(player.UserId, inventory);
}

export function unbindPlayerInventory(player: Player) {
    const inventory = playerInventories.get(player.UserId);
    if (!inventory) {
        return;
    }

    inventory.dispose();
    playerInventories.delete(player.UserId);
    heartbeatState.delete(player.UserId);
}

export function handleMoveRequest(player: Player, payload: MoveItemsRequest): MoveItemResponse {
    const inventory = playerInventories.get(player.UserId);
    if (!inventory) {
        return {
            ok: false,
            error: "Inventory not ready",
        };
    }

    for (const move of payload) {
        const response = inventory.move(move.slot, move.itemUuid, true)

        if (!response.ok) {
            inventory.bumpAndSync()
            return response
        }
    }

    inventory.bumpAndSync()

    return {
        ok: true
    };
}

export function handleEquipRequest(player: Player, payload: EquipItemRequest): EquipItemResponse {
    const inventory = playerInventories.get(player.UserId);
    if (!inventory) {
        return {
            ok: false,
            error: "Inventory not ready",
        };
    }

    return inventory.equip(payload.slot)
}

export function updateHeartbeat(player: Player, state: HeartbeatState) {
    heartbeatState.set(player.UserId, state);
}

export function getHeartbeat(player: Player) {
    return heartbeatState.get(player.UserId);
}

export {}
