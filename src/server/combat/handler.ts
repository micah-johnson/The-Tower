import { Players } from "@rbxts/services";
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
            player.combatState.setLastSwing(DateTime.now().UnixTimestampMillis)
            playAnimation(player.player, itemRepository.get(player.inventoryState.getEquippedItem()!.id)!, AnimationAction.USE, 0, player.getAttributeValue(Attribute.ATTACK_SPEED))
        }
    }

    isSwinging(player: ServerPlayerState) {
        return DateTime.now().UnixTimestampMillis - player.combatState.getLastSwing() < player.getAttributeValue(Attribute.ATTACK_SPEED)
    }

    canSwing(player: ServerPlayerState) {
        return player.inventoryState.getEquippedItem() && !this.isSwinging(player)
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
            victim.combatState.setLastDamaged(attacker.player, DateTime.now().UnixTimestampMillis)
        }
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
