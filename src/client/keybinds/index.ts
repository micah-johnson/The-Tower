import { UserInputService } from "@rbxts/services";
import { ClientNet } from "../network";
import { DropItemPacket, BeginBlockPacket, EndBlockPacket } from "../../shared/network";

export function setupKeybinds() {
    // Item Drop / Blocking
    let holdingBlock = false;
    let blockActive = false;
    let blockRequestInFlight = false;
    let cancelOnResolve = false;

    const tryBeginBlock = () => {
        if (blockRequestInFlight || blockActive) {
            return;
        }

        blockRequestInFlight = true;

        task.spawn(() => {
            const response = ClientNet.requestServer(BeginBlockPacket, {
                clientTimestamp: DateTime.now().UnixTimestampMillis,
            });

            blockRequestInFlight = false;

            if (!holdingBlock) {
                if (response.ok) {
                    ClientNet.emit(EndBlockPacket, undefined);
                }
                cancelOnResolve = false;
                blockActive = false;
                return;
            }

            if (!response.ok) {
                cancelOnResolve = false;
                blockActive = false;

                // retry automatically while the input is held
                task.delay(0.1, () => {
                    if (holdingBlock && !blockActive && !blockRequestInFlight) {
                        tryBeginBlock();
                    }
                });

                return;
            }

            if (cancelOnResolve) {
                cancelOnResolve = false;
                ClientNet.emit(EndBlockPacket, undefined);
                blockActive = false;
                return;
            }

            blockActive = true;
        });
    };

    UserInputService.InputBegan.Connect((input) => {
        if (input.UserInputType === Enum.UserInputType.Keyboard && input.KeyCode === Enum.KeyCode.Backspace) {
            ClientNet.requestServer(DropItemPacket, undefined);
        }

        if (input.UserInputType === Enum.UserInputType.MouseButton2) {
            if (holdingBlock) {
                return;
            }

            holdingBlock = true;
            cancelOnResolve = false;
            tryBeginBlock();
        }
    });

    UserInputService.InputEnded.Connect((input) => {
        if (input.UserInputType === Enum.UserInputType.MouseButton2) {
            const wasHolding = holdingBlock;
            holdingBlock = false;

            if (!wasHolding) {
                return;
            }

            if (blockActive) {
                blockActive = false;
                ClientNet.emit(EndBlockPacket, undefined);
            } else if (blockRequestInFlight) {
                cancelOnResolve = true;
            }
        }
    });
}
