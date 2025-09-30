import { InventorySnapshot, InventoryUpdatePacket } from "../../../shared/network";
import { inventoryManager } from "../../inventory/manager";
import { ClientEventHandler } from "../decorators";

class InventoryHandlers {
    @ClientEventHandler(InventoryUpdatePacket)
    public static onInventoryUpdate(snapshot: InventorySnapshot) {
        inventoryManager.applySnapshot(snapshot);
    }
}

export {}
