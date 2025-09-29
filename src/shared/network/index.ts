// Transaction header
export type TxId = string & { __txid: void };

export const enum PacketKind {
    Event,
    Request,
    Response
}

export interface Timestamp {
    seq?: number, // Sequential counter
    dt?: number, // Time difference between current and last input ON CLIENT 
    sumDt?: number, // Total elapsed time
    tClient?: number, // calculate le ping
}

export interface Frame<T = unknown> {
    channel: string,
    payload: T,
    txid?: TxId,
}

export type OutboundPacket<T> = Frame<T> & {
    // caller adds here
};

export type InboundPacket<T> = | (Frame<T> & { kind: PacketKind.Event })
  | (Frame<T> & { kind: PacketKind.Request; txid: TxId });
