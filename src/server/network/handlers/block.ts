import { BeginBlockPacket, EndBlockPacket } from "../../../shared/network";
import { playerRepository } from "../../container";
import { ServerEventHandler } from "../decorators";

class BlockHandlers {
    @ServerEventHandler(BeginBlockPacket)
    public static onBeginBlock(player: Player) {
        const state = playerRepository.getByPlayer(player);
        if (!state) return;

        state.blockState.beginBlock();
    }

    @ServerEventHandler(EndBlockPacket)
    public static onEndBlock(player: Player) {
        const state = playerRepository.getByPlayer(player);
        if (!state) return;

        state.blockState.endBlock();
    }
}

export {}
