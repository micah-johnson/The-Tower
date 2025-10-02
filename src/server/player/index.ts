import { CombatState } from "../../shared/combat";
import { PlayerState } from "../../shared/player";
import { ServerCombatState } from "../combat";
import { ServerInventoryState } from "../inventory";
import { PlayerProfile } from "../profiles";
import type { ServerDamageCoordinator } from "../combat/damageCoordinator";

export class ServerPlayerState extends PlayerState<ServerCombatState, ServerInventoryState> {
    readonly player: Player
    readonly profile: PlayerProfile

    constructor(player: Player, profile: PlayerProfile, damageCoordinator: ServerDamageCoordinator) {
        super(
            new ServerCombatState(player),
            new ServerInventoryState(player, profile, damageCoordinator)
        )
        
        this.player = player
        this.profile = profile;

        (this.inventoryState as ServerInventoryState).attachOwner(this)
    }

    dispose() {
        this.combatState.dispose?.()
        this.inventoryState.dispose()
        super.dispose()
    }
}
