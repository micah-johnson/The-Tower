import { CombatState } from "../../shared/combat";
import { PlayerState } from "../../shared/player";
import { ServerCombatState } from "../combat";
import { ServerInventoryState } from "../inventory";
import { PlayerProfile } from "../profiles";

export class ServerPlayerState extends PlayerState<ServerCombatState, ServerInventoryState> {
    readonly player: Player
    readonly profile: PlayerProfile

    constructor(player: Player, profile: PlayerProfile) {
        super(
            new ServerCombatState(player),
            new ServerInventoryState(player, profile)
        )
        
        this.player = player
        this.profile = profile
    }

    dispose() {
        this.inventoryState.dispose()
    }
}