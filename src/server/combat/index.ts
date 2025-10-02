import { CombatState } from "../../shared/combat";
export type { ServerDamageContext } from "./damageCoordinator";

export class ServerCombatState extends CombatState {
    player: Player

    constructor(player: Player) {
        super()

        this.player = player
    }

    setLastDamaged(player: Player, time: number) {
        this.lastDamaged.set(player, time)
        this.bumpAndSync()
    }

    setLastSwing(time: number) {
        this.lastSwing = time
        this.bumpAndSync()
    }

    private bumpAndSync() {
        this.bump()

        this.syncToClient()
    }

    private toSnapshot() {
        return {
            _version: this.getVersion(),
            lastSwing: this.lastSwing,
            lastDamaged: this.lastDamaged
        }
    }

    private syncToClient() {
        const snapshot = this.toSnapshot()
    }
}
