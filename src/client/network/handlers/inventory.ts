import { InventorySnapshot, InventoryUpdatePacket } from "../../../shared/network";
import { playerInventory } from "../../inventory";
import { ClientEventHandler } from "../decorators";

class InventoryHandlers {
    @ClientEventHandler(InventoryUpdatePacket)
    public static onInventoryUpdate(snapshot: InventorySnapshot) {
        playerInventory.applySnapshot(snapshot);
    }
}

export {}
