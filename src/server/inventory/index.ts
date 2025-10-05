import { HttpService, RunService } from "@rbxts/services";
import { ItemEffectType } from "../../shared/items";
import { itemRepository } from "../../shared/items/repository";
import type { ItemDef, ItemInstance } from "../../shared/items";
import { isSlotEquippable } from "../../shared/items/util";
import { cloneBlockConfig } from "../../shared/items/blockDefaults";
import {
    MoveItemsRequest as MoveItemsRequest,
    MoveItemResponse,
    InventorySnapshot,
    InventoryUpdatePacket,
    PacketClass,
    PacketDirection,
    EquipItemRequest,
    EquipItemResponse,
    DropItemResponse,
} from "../../shared/network";
import { ServerNet } from "../network";
import type { PlayerProfile } from "../profiles";
import type { ServerPlayerState } from "../player";
import { InventoryState } from "../../shared/inventory";
import type { ServerDamageCoordinator } from "../combat/damageCoordinator";
import { collectEnchantHooks, createBinding, EnchantPhase, EnchantPhaseId, createContextToken } from "../../shared/items/enchants";
import type { ServerDamageContext } from "../combat/damageCoordinator";
import type { ServerMovementState } from "../movement";

function cloneItem(item: ItemInstance): ItemInstance {
    return {
        uuid: item.uuid,
        id: item.id,
        stack: item.stack,
        attr: item.attr.map((attr) => ({ ...attr })),
        effects: item.effects?.map(effect => ({ ...effect })),
        block: item.block ? cloneBlockConfig(item.block) : undefined,
        durability: item.durability,
    };
}

export const MovementContextToken = createContextToken<ServerMovementState>("server.movementState");
export const InventoryContextToken = createContextToken<ServerInventoryState>("server.inventoryState");
export const PlayerContextToken = createContextToken<ServerPlayerState>("server.playerState");
export const DamageCoordinatorContextToken = createContextToken<ServerDamageCoordinator>("server.damageCoordinator");

function createItemInstance(defId: string, stack = 1): ItemInstance | undefined {
    const def = itemRepository.get(defId);
    if (!def) {
        return undefined;
    }

    return {
        uuid: HttpService.GenerateGUID(false),
        id: def.id,
        stack,
        attr: [],
        effects: def.effects?.map(effect => ({ ...effect })),
        block: def.block ? cloneBlockConfig(def.block) : undefined,
        durability: def.durability,
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
    private ownerState?: ServerPlayerState;
    private equippedModifierDisposers: (() => void)[] = [];

    constructor(
        private readonly player: Player,
        private readonly profile: PlayerProfile,
        private readonly damageCoordinator: ServerDamageCoordinator,
    ) {
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

    attachOwner(owner: ServerPlayerState) {
        this.ownerState = owner;
        this.refreshEquippedModifiers();
        owner.blockState.onEquippedChanged(this.getEquippedItem());
    }

    move(slot: string, itemUuid: string, skipSync?: boolean): MoveItemResponse {
        const normalizedItemUuid = itemUuid === "" ? undefined : itemUuid;

        if (normalizedItemUuid !== undefined && !this.items.has(normalizedItemUuid)) {
            return { ok: false, error: "Item does not belong to the player" };
        }

        const current = this.slots.getByKey(slot);
        const previousEquippedSlot = this.equippedSlot;

        if (normalizedItemUuid === undefined) {
            if (!current) {
                return { ok: true };
            }

            this.slots.deleteByKey(slot);
            if (previousEquippedSlot === slot) {
                this.equippedSlot = undefined;
                this.refreshEquippedModifiers();
            }

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
        });

        let equippedWasDisplaced = false;
        for (const displaced of displacedSlots) {
            this.slots.deleteByKey(displaced);
            if (displaced === previousEquippedSlot) {
                equippedWasDisplaced = true;
            }
        }

        this.slots.set(slot, normalizedItemUuid);

        let nextEquippedSlot = previousEquippedSlot;
        if (equippedWasDisplaced) {
            nextEquippedSlot = isSlotEquippable(slot) ? slot : undefined;
        }

        if (nextEquippedSlot !== previousEquippedSlot) {
            this.equippedSlot = nextEquippedSlot;
            this.refreshEquippedModifiers();
        }

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
        this.clearEquippedModifiers()
        this.profile.Data.inventory = this.toSnapshot();
        super.dispose()
    }

    drop(): DropItemResponse {
        const equipped = this.getEquippedItem()

        if (!equipped) {
            return {
                ok: false,
                error: "Nothing equipped",
            }
        }

        const tool = this.player.Character?.FindFirstChild(equipped.uuid)

        const slotId = this.getSlotOfItem(equipped)

        this.removeItem(equipped)

        if (slotId) {
            this.slots.deleteByKey(slotId)
        }

        if (this.equippedSlot === slotId) {
            this.equippedSlot = undefined
            this.refreshEquippedModifiers()
        }

        if (tool) {
            tool.Parent = game.Workspace
        }

        this.bumpAndSync()

        return {
            ok: true,
        }
    }

    equip(slot: string | undefined): EquipItemResponse {
        this.equippedSlot = slot
        this.refreshEquippedModifiers()
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

    destroyItem(item: ItemInstance) {
        const slot = this.getSlotOfItem(item);
        if (slot) {
            this.slots.deleteByKey(slot);
        }

        if (this.equippedSlot === slot) {
            this.equippedSlot = undefined;
            this.refreshEquippedModifiers();
        }

        this.removeItem(item);
        this.bumpAndSync();
    }

    damageItemDurability(item: ItemInstance, amount: number) {
        const record = this.items.get(item.uuid);
        if (!record) return;

        if (record.durability === undefined || record.durability < 0) {
            return; // infinite durability
        }

        record.durability = math.max(0, record.durability - amount);

        if (record.durability === 0) {
            this.destroyItem(record);
            return;
        }

        this.bumpAndSync();
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

    private clearEquippedModifiers() {
        for (const dispose of this.equippedModifierDisposers) {
            dispose();
        }
        this.equippedModifierDisposers = [];
    }

    private refreshEquippedModifiers() {
        this.clearEquippedModifiers();

        const owner = this.ownerState;
        if (!owner) {
            return;
        }

        const equipped = this.getEquippedItem();
        if (!equipped) {
            owner.blockState.onEquippedChanged(undefined);
            return;
        }

        const definition = itemRepository.get(equipped.id);
        const effects = equipped.effects ?? definition?.effects;
        if (effects) {
            for (const effect of effects) {
                if (effect.type === ItemEffectType.LIFESTEAL) {
                    const dispose = this.damageCoordinator.postHit.register({
                        priority: 100,
                        apply(ctx) {
                            if (!ctx.applied) {
                                return ctx;
                            }

                            if (ctx.attacker !== owner) {
                                return ctx;
                            }

                            const humanoid = owner.player.Character?.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
                            if (!humanoid) {
                                return ctx;
                            }

                            const heal = ctx.finalDamage * effect.amount;
                            humanoid.Health = math.clamp(humanoid.Health + heal, 0, humanoid.MaxHealth);

                            return ctx;
                        },
                    });

                    this.equippedModifierDisposers.push(dispose);
                }
            }
        }

        owner.blockState.onEquippedChanged(equipped);

        if (definition) {
            this.registerEnchantHooks(definition, equipped);
        }
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

    private registerEnchantHooks(definition: ItemDef, instance: ItemInstance) {
        const owner = this.ownerState;
        const binding = createBinding(definition, instance, (ctx) => {
            ctx.set(InventoryContextToken, this);
            ctx.set(DamageCoordinatorContextToken, this.damageCoordinator);
            if (owner) {
                ctx.set(PlayerContextToken, owner);
                ctx.set(MovementContextToken, owner.movementState);
            }
        });
        const hooks = collectEnchantHooks<ServerDamageContext>(binding);
        for (const hook of hooks) {
            const pipeline = this.getPipelineForPhase(hook.phase);
            const disposePipeline = pipeline.register({
                priority: hook.priority,
                apply(context) {
                    return hook.apply(context);
                },
            });
            this.equippedModifierDisposers.push(() => {
                disposePipeline();
                hook.dispose?.();
            });
        }
    }

    private getPipelineForPhase(phase: EnchantPhaseId) {
        switch (phase) {
            case EnchantPhase.Attacker:
                return this.damageCoordinator.attacker;
            case EnchantPhase.Defender:
                return this.damageCoordinator.defender;
            case EnchantPhase.PostHit:
                return this.damageCoordinator.postHit;
            default:
                return this.damageCoordinator.attacker;
        }
    }
}
