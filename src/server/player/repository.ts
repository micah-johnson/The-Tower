import { ServerPlayerState } from ".";
import { Signal } from "../../shared/utils/signal";
import { PlayerProfile } from "../profiles";

export class PlayerRepository {
    Added = new Signal<[ServerPlayerState]>()

    private readonly players = new Map<number, ServerPlayerState>();

    bind(player: Player, profile: PlayerProfile) {
        const playerState = new ServerPlayerState(player, profile)

        this.players.set(player.UserId, playerState)

        this.Added.Fire(playerState)
    }

    unbind(player: Player) {
        const playerState = this.getByPlayer(player)

        playerState?.dispose()

        this.players.delete(player.UserId)
    }

    getById(id: number) {
        return this.players.get(id)
    }

    getByPlayer(player: Player) {
        return this.players.get(player.UserId)
    }
}

export const playerRepository = new PlayerRepository()