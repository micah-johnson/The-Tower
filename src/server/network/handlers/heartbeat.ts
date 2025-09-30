import { HeartbeatAckPacket, HeartbeatPacket, HeartbeatPayload, PacketClass, PacketDirection, expectPacketDirection } from "../../../shared/network";
import { ServerEventHandler } from "../decorators";
import { ServerNet } from "..";
import { updateHeartbeat } from "../../inventory/service";

class HeartbeatHandlers {
    @ServerEventHandler(HeartbeatPacket)
    public static onHeartbeat(player: Player, payload: HeartbeatPayload) {
        // Echo the payload back to the client as an acknowledgement.
        const meta = expectPacketDirection(HeartbeatAckPacket, PacketDirection.ServerToClientRequest);

        const serverTimestamp = DateTime.now().UnixTimestampMillis;
        const ackPayload: HeartbeatPayload = { timestamp: serverTimestamp };
        const start = os.clock();
        const [success] = pcall(() =>
            ServerNet.invokeClient(
                meta.ctor as PacketClass<any, any, typeof PacketDirection.ServerToClientRequest>,
                player,
                ackPayload,
            ),
        );

        const roundTripMs = math.floor((os.clock() - start) * 1000);

        if (!success) {
            warn(`[S] Heartbeat ack failed for ${player.Name}`);
            return;
        }

        updateHeartbeat(player, {
            clientTimestamp: payload.timestamp,
            serverTimestamp,
            roundTripMs,
        });
    }
}

export {}
