import { CombatState } from "../../shared/combat";
import { PlayerState } from "../../shared/player";
import { ServerCombatState } from "../combat";
import { ServerInventoryState } from "../inventory";
import { ServerBlockState } from "../combat/blockState";
import { PlayerProfile } from "../profiles";
import type { ServerDamageCoordinator } from "../combat/damageCoordinator";

export class ServerPlayerState extends PlayerState<ServerCombatState, ServerInventoryState> {
    readonly player: Player
    readonly profile: PlayerProfile
    readonly blockState: ServerBlockState

    constructor(player: Player, profile: PlayerProfile, damageCoordinator: ServerDamageCoordinator) {
        super(
            new ServerCombatState(player),
            new ServerInventoryState(player, profile, damageCoordinator)
        )
        
        this.player = player;
        this.profile = profile;

        this.blockState = new ServerBlockState(this, this.inventoryState, damageCoordinator);

        (this.inventoryState as ServerInventoryState).attachOwner(this);
    }

    dispose() {
        this.combatState.dispose?.()
        this.inventoryState.dispose()
        this.blockState.endBlock()
        super.dispose()
    }
}
