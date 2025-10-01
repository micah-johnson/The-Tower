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

const ALLOWED_SLOTS = ["hotbar_1", "hotbar_2", "hotbar_3", "hotbar_4", "hotbar_5", "hotbar_6", "hotbar_7", "hotbar_8", "hotbar_9", "hotbar_0"] as const;
const ALLOWED_SLOT_SET = new Set<string>(ALLOWED_SLOTS);

interface HeartbeatState {
    clientTimestamp: number;
    serverTimestamp: number;
    roundTripMs: number;
}

const playerInventories = new Map<number, PlayerInventory>();
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
        version: 1,
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

class PlayerInventory {
    private readonly items = new Map<string, ItemInstance>();
    private readonly slotAssignments = new Map<string, string>();
    private readonly slotNames = new Set<string>();
    private version = 0;

    constructor(private readonly player: Player, private readonly profile: PlayerProfile) {
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
        // if (!isValidSlot(slot)) {
        //     return { ok: false, error: "Invalid slot" };
        // }

        const normalizedItemUuid = itemUuid === "" ? undefined : itemUuid;
        this.ensureSlotTracked(slot);

        if (normalizedItemUuid !== undefined && !this.items.has(normalizedItemUuid)) {
            return { ok: false, error: "Item does not belong to the player" };
        }

        const current = this.slotAssignments.get(slot);

        if (normalizedItemUuid === undefined) {
            if (!current) {
                return { ok: true };
            }

            this.slotAssignments.delete(slot);
            this.bumpAndSync();
            return { ok: true };
        }

        if (current === normalizedItemUuid) {
            return { ok: true };
        }

        const displacedSlots: string[] = [];
        for (const [slotName, uuid] of this.slotAssignments) {
            if (uuid === normalizedItemUuid) {
                displacedSlots.push(slotName);
            }
        }

        for (const displaced of displacedSlots) {
            this.slotAssignments.delete(displaced);
            this.ensureSlotTracked(displaced);
        }

        this.slotAssignments.set(slot, normalizedItemUuid);
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

    equip(itemUuid: string): EquipItemResponse {
        if (!this.player.Character) {
            return {
                ok: false,
                error: "Player character does not exist."
            }
        }

        if (itemUuid === "") { // Equipped null item
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


        const item = this.items.get(itemUuid)

        if (!item) {
            return {
                ok: false,
                error: "Item does not belong to player!"
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

    private loadSnapshot(snapshot: InventorySnapshot) {
        this.items.clear();
        this.slotAssignments.clear();
        this.slotNames.clear();

        this.version = snapshot.version ?? 0;

        for (const slot of ALLOWED_SLOTS) {
            this.slotNames.add(slot);
        }

        for (const [uuid, item] of pairs(snapshot.items)) {
            this.items.set(uuid, cloneItem(item));
        }

        for (const [slot, uuid] of pairs(snapshot.slots)) {
            this.slotNames.add(slot);
            if (uuid !== undefined) {
                this.slotAssignments.set(slot, uuid);
            }
        }
    }

    private ensureSlotTracked(slot: string) {
        if (!this.slotNames.has(slot)) {
            this.slotNames.add(slot);
        }
    }

    bumpAndSync() {
        this.version += 1;
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
        for (const slot of this.slotNames) {
            slots[slot] = this.slotAssignments.get(slot);
        }

        return {
            version: this.version,
            slots,
            items,
        };
    }
}

export function bindPlayerInventory(player: Player, profile: PlayerProfile) {
    const existing = playerInventories.get(player.UserId);
    if (existing) {
        existing.dispose();
    }

    const inventory = new PlayerInventory(player, profile);
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

    return inventory.equip(payload.itemUuid)
}

export function updateHeartbeat(player: Player, state: HeartbeatState) {
    heartbeatState.set(player.UserId, state);
}

export function getHeartbeat(player: Player) {
    return heartbeatState.get(player.UserId);
}

export {}
