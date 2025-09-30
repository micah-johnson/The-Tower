import { EquipItemPacket, EquipItemRequest, EquipItemResponse } from "../../../shared/network";
import { ServerRequestHandler } from "../decorators";
import { handleEquipRequest } from "../../inventory/service";

class ItemHandlers {
    @ServerRequestHandler(EquipItemPacket)
    public static onEquipItem(player: Player, payload: EquipItemRequest): EquipItemResponse {
        return handleEquipRequest(player, payload);
    }
}

export {}
