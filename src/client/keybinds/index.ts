import { UserInputService } from "@rbxts/services";
import { ClientNet } from "../network";
import { DropItemPacket, BeginBlockPacket, EndBlockPacket } from "../../shared/network";

export function setupKeybinds() {
    // Item Drop
    let blocking = false;

    UserInputService.InputBegan.Connect(input => {
        if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === Enum.KeyCode.Backspace) {
            ClientNet.requestServer(DropItemPacket, undefined)
        }

        if (input.UserInputType === Enum.UserInputType.MouseButton2 && !blocking) {
            blocking = true;
            ClientNet.emit(BeginBlockPacket, undefined);
        }
    })

    UserInputService.InputEnded.Connect(input => {
        if (blocking && input.UserInputType === Enum.UserInputType.MouseButton2) {
            blocking = false;
            ClientNet.emit(EndBlockPacket, undefined);
        }
    })
}
