import { playerRepository } from "../../server/player/repository"
import { InventoryState } from "../inventory"
import { Attribute, ItemInstance } from "../items"
import { PlayerState } from "../player"
import { State } from "../state"

export abstract class CombatState extends State {
    protected lastSwing = -1
    protected lastDamaged = new Map<Player,number>()

    getLastSwing() {
        return this.lastSwing
    }

    getLastDamaged(player: Player) {
        return this.lastDamaged.get(player)
    }
}