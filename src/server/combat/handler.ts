import { Debris, Players } from "@rbxts/services";
import { Attribute } from "../../shared/items";
import type { PlayerRepository } from "../player/repository";
import { ServerPlayerState } from "../player";
import type { ServerDamageContext } from "./damageCoordinator";
import { ServerDamageCoordinator } from "./damageCoordinator";
import { playAnimation } from "./animation";
import { AnimationAction } from "../../shared/consts/animations";
import { itemRepository } from "../../shared/items/repository";

export class CombatHandler {
    constructor(
        private readonly playerRepository: PlayerRepository,
        private readonly coordinator: ServerDamageCoordinator,
    ) {}

    register(tool: Tool) {
        tool.Equipped.Connect(() => {
            const handle = tool.FindFirstChild("Handle") as Part | undefined

            if (!handle || !handle.IsA("Part")) return;

            const owner = getPlayerFromChild(tool)

            if (!owner) return

            const ownerState = this.playerRepository.getByPlayer(owner)

            const touchHandler = handle.Touched.Connect(other => {
                const victim = getPlayerFromChild(other)

                if (!victim) return;

                const victimState = this.playerRepository.getByPlayer(victim)

                if (!ownerState || !victimState) return;

                this.handleTouch(ownerState, victimState)
            })

            const activationHandler = tool.Activated.Connect(() => {
                if (ownerState) this.handleSwing(ownerState)
            })

            tool.Unequipped.Once(() => {
                touchHandler.Disconnect()
                activationHandler.Disconnect()
            })
        })
    }

    handleSwing(player: ServerPlayerState) {
        if (this.canSwing(player)) {
            player.combatState.setLastSwing(DateTime.now().UnixTimestampMillis);
            playAnimation(
                player.player,
                itemRepository.get(player.inventoryState.getEquippedItem()!.id)!,
                AnimationAction.USE,
                0,
                player.getAttributeValue(Attribute.ATTACK_SPEED),
            );
        }
    }

    isSwinging(player: ServerPlayerState) {
        return DateTime.now().UnixTimestampMillis - player.combatState.getLastSwing() < player.getAttributeValue(Attribute.ATTACK_SPEED)
    }

    canSwing(player: ServerPlayerState) {
        return player.inventoryState.getEquippedItem() && !this.isSwinging(player) && !player.blockState.isBlockingActive()
    }

    canAttack(attacker: ServerPlayerState, victim: ServerPlayerState) {
        const lastDamaged = victim.combatState.getLastDamaged(attacker.player) ?? -1

        return DateTime.now().UnixTimestampMillis - lastDamaged > attacker.getAttributeValue(Attribute.ATTACK_SPEED)
    }

    handleTouch(attacker: ServerPlayerState, victim: ServerPlayerState) {
        if (!this.isSwinging(attacker)) return

        if (!this.canAttack(attacker, victim)) return

        const baseDamage = attacker.getAttributeValue(Attribute.DAMAGE)

        const context: ServerDamageContext = {
            attacker,
            victim,
            baseDamage,
            finalDamage: baseDamage,
            cancelled: false,
        }

        const result = this.coordinator.apply(context)

        if (result.applied) {
            this.applyKnockback(attacker.player, victim.player)
            victim.combatState.setLastDamaged(attacker.player, DateTime.now().UnixTimestampMillis)
        }
    }

    applyKnockback(
        attacker: Player,
        victim: Player,
        opts?: { horizontal?: number; vertical?: number; duration?: number },
    ) {
        const victimRoot = victim.Character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        const attackerRoot = attacker.Character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!victimRoot || !attackerRoot) return;

        const horizontal = opts?.horizontal ?? 3000; // how hard to push back
        const vertical = opts?.vertical ?? 10;     // upward lift
        const duration = opts?.duration ?? 0.1;   // seconds to keep the push

        // Direction from attacker -> victim (fallback to attacker's facing if overlapping)
        const offset = victimRoot.Position.sub(attackerRoot.Position);
        const dir = offset.Magnitude > 1e-3 ? offset.Unit : attackerRoot.CFrame.LookVector;

        // Attachment + LinearVelocity for a brief burst
        const attachment = new Instance("Attachment");
        attachment.Parent = victimRoot;

        const lv = new Instance("LinearVelocity");
        lv.Attachment0 = attachment;
        lv.MaxForce = math.huge; // unlimited for the brief burst
        lv.VectorVelocity = dir.mul(horizontal).add(new Vector3(0, vertical, 0));
        lv.Parent = victimRoot;

        // Auto-cleanup after the burst
        Debris.AddItem(lv, duration);
        Debris.AddItem(attachment, duration);
    }
}

// Attempts to grab player from child object under player model
export function getPlayerFromChild(part: Instance) {
    const model = part.Parent as Model | undefined;
    const humanoid = model?.FindFirstChildOfClass("Humanoid");
    if (!humanoid) return;

    const player = Players.GetPlayerFromCharacter(model);
    if (!player) return;

    return player
}
