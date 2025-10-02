import { Players } from "@rbxts/services";
import { Attribute } from "../../shared/items";
import { ServerPlayerState } from "../player";
import { playerRepository } from "../player/repository";

export class CombatHandler {
    register(tool: Tool) {
        tool.Equipped.Connect(() => {
            const handle = tool.FindFirstChild("Handle") as Part | undefined

            if (!handle || !handle.IsA("Part")) return;

            const owner = getPlayerFromChild(tool)

            if (!owner) return

            const ownerState = playerRepository.getByPlayer(owner)

            const touchHandler = handle.Touched.Connect(other => {
                const victim = getPlayerFromChild(other)

                if (!victim) return;

                const victimState = playerRepository.getByPlayer(victim)

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
        if (!this.isSwinging(player)) player.combatState.setLastSwing(DateTime.now().UnixTimestampMillis)
    }

    isSwinging(player: ServerPlayerState) {
        return DateTime.now().UnixTimestampMillis - player.combatState.getLastSwing() < player.getAttributeValue(Attribute.ATTACK_SPEED)
    }

    canAttack(attacker: ServerPlayerState, victim: ServerPlayerState) {
        const lastDamaged = victim.combatState.getLastDamaged(attacker.player) ?? -1

        return DateTime.now().UnixTimestampMillis - lastDamaged > attacker.getAttributeValue(Attribute.ATTACK_SPEED)
    }

    handleTouch(attacker: ServerPlayerState, victim: ServerPlayerState) {
        const humanoid = victim.player.Character?.FindFirstChild("Humanoid") as Humanoid | undefined

        if (!humanoid) return

        if (!this.isSwinging(attacker)) return;

        if (!this.canAttack(attacker, victim)) return;

        const damage = attacker.getAttributeValue(Attribute.DAMAGE)

        humanoid.Health -= damage
        victim.combatState.setLastDamaged(attacker.player, DateTime.now().UnixTimestampMillis)
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

export const combatHandler = new CombatHandler()