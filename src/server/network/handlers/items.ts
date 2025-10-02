import { EquipItemPacket, EquipItemRequest, EquipItemResponse, MoveItemsPacket, MoveItemsRequest, MoveItemResponse, DropItemPacket, DropItemResponse } from "../../../shared/network";
import { playerRepository } from "../../container";
import { ServerRequestHandler } from "../decorators";
class ItemHandlers {
    @ServerRequestHandler(MoveItemsPacket)
    public static onMoveItem(player: Player, payload: MoveItemsRequest): MoveItemResponse {
        return handleMoveRequest(player, payload);
    }

    @ServerRequestHandler(EquipItemPacket)
    public static onEquipItem(player: Player, payload: EquipItemRequest): EquipItemResponse {
        return handleEquipRequest(player, payload)
    }

    @ServerRequestHandler(DropItemPacket)
    public static onDropItem(player: Player): DropItemResponse {
        return handleDropRequest(player)
    }
}

export function handleMoveRequest(player: Player, payload: MoveItemsRequest): MoveItemResponse {
    const inventory = playerRepository.getByPlayer(player)?.inventoryState;
    if (!inventory) {
        return {
            ok: false,
            error: "Inventory not ready",
        };
    }

    for (const move of payload) {
        const response = inventory.move(move.slot, move.itemUuid, true)

        if (!response.ok) {
            inventory.bumpAndSync()
            return response
        }
    }

    inventory.bumpAndSync()

    return {
        ok: true
    };
}

export function handleEquipRequest(player: Player, payload: EquipItemRequest): EquipItemResponse {
    const inventory = playerRepository.getByPlayer(player)?.inventoryState;
    if (!inventory) {
        return {
            ok: false,
            error: "Inventory not ready",
        };
    }

    return inventory.equip(payload.slot)
}

export function handleDropRequest(player: Player): DropItemResponse {
    const inventory = playerRepository.getByPlayer(player)?.inventoryState;
    if (!inventory) {
        return {
            ok: false,
            error: "Inventory not ready",
        };
    }

    return inventory.drop();
}

export {}
