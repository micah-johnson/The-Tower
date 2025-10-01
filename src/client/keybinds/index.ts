import { UserInputService } from "@rbxts/services";
import { ClientNet } from "../network";
import { DropItemPacket } from "../../shared/network";

export function setupKeybinds() {
    // Item Drop
    UserInputService.InputBegan.Connect(input => {
        if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === Enum.KeyCode.Backspace) {
            ClientNet.requestServer(DropItemPacket, undefined)
        }
    })
}