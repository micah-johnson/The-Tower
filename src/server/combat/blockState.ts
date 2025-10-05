import { Attribute, BlockConfig, BlockOutcome, BlockReaction, BlockReactionType, ItemInstance } from "../../shared/items";
import { itemRepository } from "../../shared/items/repository";
import { cloneBlockConfig, getDefaultBlockConfig } from "../../shared/items/blockDefaults";
import { ServerInventoryState } from "../inventory";
import { ServerDamageCoordinator } from "./damageCoordinator";
import type { ServerDamageContext } from "./damageCoordinator";
import type { ServerPlayerState } from "../player";
import { playAnimation } from "./animation";
import { AnimationAction } from "../../shared/consts/animations";

const DEFAULT_BLOCK_PRIORITY = 50;

interface BlockResult {
    ok: boolean;
    reason?: string;
}

export class ServerBlockState {
    private isBlocking = false;
    private blockStart = 0;
    private currentConfig?: BlockConfig;
    private currentItemUuid?: string;
    private modifierDisposer?: () => void;
    private disabledUntil = new Map<string, number>();
    private movementApplied = false;

    constructor(
        private readonly owner: ServerPlayerState,
        private readonly inventory: ServerInventoryState,
        private readonly coordinator: ServerDamageCoordinator,
    ) {}

    beginBlock(): BlockResult {
        const equipped = this.inventory.getEquippedItem();
        if (!equipped) {
            return { ok: false, reason: "No item equipped" };
        }

        const config = this.resolveConfig(equipped);
        if (!config?.enabled) {
            return { ok: false, reason: "Item cannot block" };
        }

        if (this.isItemDisabled(equipped)) {
            return { ok: false, reason: "Item disabled" };
        }

        if (DateTime.now().UnixTimestampMillis - this.owner.combatState.getLastSwing() < this.owner.getAttributeValue(Attribute.ATTACK_SPEED)) {
            return { ok: false, reason: "Player is swinging" };
        }

        playAnimation({
            player: this.owner.player,
            item: itemRepository.get(this.owner.inventoryState.getEquippedItem()!.id)!,
            action: AnimationAction.RMB,
            index: 0,
            targetLength: 200,
            freeze: true
        });

        this.isBlocking = true;
        this.blockStart = DateTime.now().UnixTimestampMillis;
        this.currentConfig = config;
        this.currentItemUuid = equipped.uuid;

        print(`[Block] ${this.owner.player.Name} began blocking with ${equipped.id}`);

        const priority = config.defenderPriority ?? DEFAULT_BLOCK_PRIORITY;

        const blockState = this;

        this.modifierDisposer = this.coordinator.defender.register({
            priority,
            apply(ctx) {
                if (!blockState.isBlocking) return ctx;
                if (ctx.victim !== blockState.owner) return ctx;

                const now = DateTime.now().UnixTimestampMillis;
                const elapsed = now - blockState.blockStart;
                const parryWindow = blockState.currentConfig!.parryWindowMs;

                if (elapsed <= parryWindow) {
                    const parryOutcome = blockState.currentConfig!.parry;
                    blockState.applyParry(ctx, equipped, parryOutcome);
                } else {
                    const blockOutcome = blockState.currentConfig!.block;
                    blockState.applyBlock(ctx, equipped, blockOutcome);
                }

                return ctx;
            },
        });

        this.applyMovementModifier();

        return { ok: true };
    }

    endBlock() {
        if (!this.owner.inventoryState.getEquippedItem()) return
        
        playAnimation({
            player: this.owner.player,
            item: itemRepository.get(this.owner.inventoryState.getEquippedItem()!.id)!,
            action: AnimationAction.RMB,
            index: 0,
            targetLength: 200,
            reverse: true
        });

        const wasBlocking = this.isBlocking;

        if (this.modifierDisposer) {
            this.modifierDisposer();
            this.modifierDisposer = undefined;
        }
        this.isBlocking = false;
        this.currentConfig = undefined;
        this.currentItemUuid = undefined;

        this.clearMovementModifier();

        if (wasBlocking) {
            print(`[Block] ${this.owner.player.Name} stopped blocking`);
        }
    }

    onEquippedChanged(equipped: ItemInstance | undefined) {
        if (!equipped || equipped.uuid !== this.currentItemUuid) {
            this.endBlock();
        }
    }

    isBlockingActive() {
        return this.isBlocking;
    }

    private resolveConfig(item: ItemInstance): BlockConfig | undefined {
        if (item.block) {
            return cloneBlockConfig(item.block);
        }

        const def = itemRepository.get(item.id);
        if (!def) {
            return undefined;
        }

        if (def.block) {
            return cloneBlockConfig(def.block);
        }

        return getDefaultBlockConfig(def.type, (def as { subtype?: string }).subtype);
    }

    private isItemDisabled(item: ItemInstance) {
        const expiry = this.disabledUntil.get(item.uuid);
        if (!expiry) return false;
        if (DateTime.now().UnixTimestampMillis >= expiry) {
            this.disabledUntil.delete(item.uuid);
            return false;
        }
        return true;
    }

    private applyParry(ctx: ServerDamageContext, item: ItemInstance, outcome?: BlockOutcome) {
        ctx.finalDamage = outcome?.damageMultiplier !== undefined ? ctx.finalDamage * outcome.damageMultiplier : 0;
        ctx.cancelled = true;

        print(`[Block] ${this.owner.player.Name} parried ${ctx.attacker.player.Name} with ${item.id}`);

        if (outcome?.counterDamage && ctx.queueHit) {
            ctx.queueHit({
                attacker: this.owner,
                victim: ctx.attacker,
                baseDamage: outcome.counterDamage,
                finalDamage: outcome.counterDamage,
            });
        }

        if (outcome?.reaction) {
            this.applyReaction(item, outcome.reaction);
        }
    }

    private applyBlock(ctx: ServerDamageContext, item: ItemInstance, outcome?: BlockOutcome) {
        if (outcome?.damageMultiplier !== undefined) {
            ctx.finalDamage *= outcome.damageMultiplier;
        }

        print(`[Block] ${this.owner.player.Name} blocked ${ctx.attacker.player.Name} with ${item.id}`);

        if (outcome?.reaction) {
            this.applyReaction(item, outcome.reaction);
        }
    }

    private applyReaction(item: ItemInstance, reaction: BlockReaction) {
        if (reaction.type === BlockReactionType.NONE) {
            return;
        }

        if (reaction.type === BlockReactionType.BREAK) {
            this.inventory.destroyItem(item);
            this.endBlock();
            return;
        }

        if (reaction.type === BlockReactionType.DISABLE) {
            const durationMs = math.max(0, reaction.duration) * 1000;
            this.disabledUntil.set(item.uuid, DateTime.now().UnixTimestampMillis + durationMs);
            if (reaction.durabilityDamage) {
                this.inventory.damageItemDurability(item, reaction.durabilityDamage);
            }
            this.endBlock();
        }
    }

    private applyMovementModifier() {
        if (this.movementApplied) {
            return;
        }

        this.owner.movementState.setModifier({
            id: "block",
            priority: 100,
            compute(speed) {
                return speed * 0.5;
            },
        });

        this.movementApplied = true;
    }

    private clearMovementModifier() {
        if (!this.movementApplied) {
            return;
        }

        this.owner.movementState.removeModifier("block");
        this.movementApplied = false;
    }
}
