import { EquipItemPacket, EquipItemRequest, EquipItemResponse, MoveItemsPacket, MoveItemRequest, MoveItemResponse } from "../../../shared/network";
import { ServerRequestHandler } from "../decorators";
import { handleEquipRequest, handleMoveRequest } from "../../inventory/service";

class ItemHandlers {
    @ServerRequestHandler(MoveItemsPacket)
    public static onMoveItem(player: Player, payload: MoveItemRequest): MoveItemResponse {
        return handleMoveRequest(player, payload);
    }

    @ServerRequestHandler(EquipItemPacket)
    public static onEquipItem(player: Player, payload: EquipItemRequest): EquipItemResponse {
        return handleEquipRequest(player, payload)
    }
}

export {}
