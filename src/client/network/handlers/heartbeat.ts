import { HeartbeatAckPacket, HeartbeatPayload } from "../../../shared/network";
import { ClientRequestHandler } from "../decorators";

let lastServerHeartbeat = 0;
let lastRoundTripEstimate = 0;

class HeartbeatHandlers {
    @ClientRequestHandler(HeartbeatAckPacket)
    public static onHeartbeatAck(payload: HeartbeatPayload): HeartbeatPayload {
        lastServerHeartbeat = payload.timestamp;
        lastRoundTripEstimate = math.floor((DateTime.now().UnixTimestampMillis - payload.timestamp));

        return {
            timestamp: DateTime.now().UnixTimestampMillis,
        };
    }
}

export function getLastHeartbeat() {
    return {
        serverTimestamp: lastServerHeartbeat,
        roundTripEstimateMs: lastRoundTripEstimate,
    };
}

export {}
