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
