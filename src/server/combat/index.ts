import { CombatState } from "../../shared/combat";
export type { ServerDamageContext } from "./damageCoordinator";

export class ServerCombatState extends CombatState {
    player: Player
    private lastSwingCooldown = 0;
    private nextSwingSpeedMultiplier?: number;

    constructor(player: Player) {
        super()

        this.player = player
    }

    setLastDamaged(player: Player, time: number) {
        this.lastDamaged.set(player, time)
        this.bumpAndSync()
    }

    setLastSwing(time: number, cooldown?: number) {
        this.lastSwing = time
        if (cooldown !== undefined && cooldown > 0) {
            this.lastSwingCooldown = cooldown
        } else if (cooldown !== undefined) {
            this.lastSwingCooldown = 0
        }
        this.bumpAndSync()
    }

    getLastSwingCooldown() {
        return this.lastSwingCooldown > 0 ? this.lastSwingCooldown : undefined
    }

    setNextSwingSpeedMultiplier(multiplier: number) {
        if (multiplier <= 0) {
            this.nextSwingSpeedMultiplier = undefined
            return
        }

        this.nextSwingSpeedMultiplier = multiplier
    }

    consumeNextSwingSpeedMultiplier() {
        const multiplier = this.nextSwingSpeedMultiplier
        this.nextSwingSpeedMultiplier = undefined
        return multiplier
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
