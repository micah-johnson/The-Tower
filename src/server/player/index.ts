import { CombatState } from "../../shared/combat";
import { PlayerState } from "../../shared/player";
import { ServerCombatState } from "../combat";
import { ServerInventoryState } from "../inventory";
import { ServerBlockState } from "../combat/blockState";
import { PlayerProfile } from "../profiles";
import type { ServerDamageCoordinator } from "../combat/damageCoordinator";
import { ServerMovementState } from "../movement";

export class ServerPlayerState extends PlayerState<ServerCombatState, ServerInventoryState> {
    readonly player: Player
    readonly profile: PlayerProfile
    readonly blockState: ServerBlockState
    readonly movementState: ServerMovementState

    constructor(player: Player, profile: PlayerProfile, damageCoordinator: ServerDamageCoordinator) {
        super(
            new ServerCombatState(player),
            new ServerInventoryState(player, profile, damageCoordinator)
        )

        this.player = player;
        this.profile = profile;

        this.blockState = new ServerBlockState(this, this.inventoryState, damageCoordinator);
        this.movementState = new ServerMovementState(player);

        (this.inventoryState as ServerInventoryState).attachOwner(this);

        const connectCharacter = (character: Model) => {
            const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
            if (!humanoid) {
                return;
            }

            this.movementState.attachHumanoid(humanoid);
        };

        const character = player.Character;
        if (character) {
            connectCharacter(character);
        }

        player.CharacterAdded.Connect(connectCharacter);
    }

    dispose() {
        this.combatState.dispose?.()
        this.inventoryState.dispose()
        // this.blockState.endBlock()
        this.movementState.detachHumanoid()
        super.dispose()
    }
}
