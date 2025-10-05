import { BeginBlockPacket, EndBlockPacket } from "../../../shared/network";
import type { BeginBlockRequest, BlockActionResponse } from "../../../shared/network";
import { playerRepository } from "../../container";
import { ServerEventHandler, ServerRequestHandler } from "../decorators";

class BlockHandlers {
    @ServerRequestHandler(BeginBlockPacket)
    public static onBeginBlock(player: Player, payload: BeginBlockRequest): BlockActionResponse {
        const state = playerRepository.getByPlayer(player);
        if (!state) {
            return { ok: false, error: "Player not registered" };
        }

        const result = state.blockState.beginBlock(payload?.clientTimestamp);
        return { ok: result.ok, error: result.reason };
    }

    @ServerEventHandler(EndBlockPacket)
    public static onEndBlock(player: Player) {
        const state = playerRepository.getByPlayer(player);
        if (!state) return;

        state.blockState.endBlock();
    }
}

export {}
