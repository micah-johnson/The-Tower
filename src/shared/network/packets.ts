import { t } from "@rbxts/t";
import { ItemInstance } from "../items";

export const PacketDirection = {
    ClientToServerEvent: 0,
    ServerToClientEvent: 1,
    ClientToServerRequest: 2,
    ServerToClientRequest: 3,
} as const;

export type PacketDirection = typeof PacketDirection[keyof typeof PacketDirection];

export type PacketValidator<P = unknown> = t.check<P>;

export abstract class Packet<P = unknown, R = void> {
    static opcode: number;
    static direction: PacketDirection;

    constructor(readonly payload: P) {}
}

export type PacketClass<P, R = void, D extends PacketDirection = PacketDirection> = {
    new (payload: P): Packet<P, R>;
    opcode: number;
    direction: D;
};

export type PayloadOf<C> = C extends PacketClass<infer P, any, any> ? P : never;
export type ResponseOf<C> = C extends PacketClass<any, infer R, any> ? R : never;

export type PacketCtx = {
    opcode: number;
    direction: PacketDirection;
    ctor: PacketClass<any, any, PacketDirection>;
    validator?: PacketValidator;
};

const registryByOpcode = new Map<number, PacketCtx>();
const registryByCtor = new Map<PacketClass<any, any, PacketDirection>, PacketCtx>();

export function packetName(ctor: PacketClass<any, any, PacketDirection>) {
    return (ctor as unknown as { name?: string }).name ?? "<anonymous packet>";
}

function registerPacket<C extends PacketClass<any, any>>(
    ctor: C,
    opcode: number,
    direction: PacketDirection,
    validator?: PacketValidator,
) {
    if (registryByOpcode.has(opcode)) {
        const existing = registryByOpcode.get(opcode)!;
        error(`Duplicate packet opcode ${opcode} for ${packetName(ctor)}, already used by ${packetName(existing.ctor)}`);
    }

    (ctor as PacketClass<any, any>).opcode = opcode;
    (ctor as PacketClass<any, any>).direction = direction;

    const meta: PacketCtx = {
        opcode,
        direction,
        ctor: ctor as PacketClass<any, any>,
        validator,
    };

    registryByOpcode.set(opcode, meta);
    registryByCtor.set(ctor as PacketClass<any, any>, meta);
}

export function getPacketMetaByOpcode(opcode: number) {
    return registryByOpcode.get(opcode);
}

export function getPacketMetaByCtor<C extends PacketClass<any, any, PacketDirection>>(ctor: C) {
    const meta = registryByCtor.get(ctor as PacketClass<any, any, PacketDirection>);
    if (!meta) {
        error(`Packet ${packetName(ctor)} has not been registered. Did you forget to apply @Opcode?`);
    }

    return meta as PacketCtx & { ctor: C };
}

interface OpcodeOptions<P> {
    validator?: PacketValidator<P>;
}

export function Opcode<D extends PacketDirection, P = unknown>(opcode: number, direction: D, options?: OpcodeOptions<P>) {
    return <C extends PacketClass<any, any, PacketDirection>>(ctor: C) => {
        registerPacket(ctor as PacketClass<any, any, PacketDirection>, opcode, direction, options?.validator as PacketValidator);
        return ctor;
    };
}

export function assertPacketDirection<C extends PacketClass<any, any, PacketDirection>, D extends PacketDirection>(
    ctor: C,
    expected: D,
) {
    const meta = getPacketMetaByCtor(ctor);
    if (meta.direction !== expected) {
        error(`Packet ${packetName(ctor)} is registered for ${meta.direction}, attempted to use as ${expected}`);
    }
}

export function expectPacketDirection<C extends PacketClass<any, any, PacketDirection>, D extends PacketDirection>(
    ctor: C,
    expected: D,
) {
    const meta = getPacketMetaByCtor(ctor);
    if (meta.direction !== expected) {
        error(`Packet ${packetName(ctor)} is registered for ${meta.direction}, attempted to use as ${expected}`);
    }

    return meta as PacketCtx & {
        opcode: number;
        direction: D;
        ctor: C;
    };
}

export function setPacketValidator<C extends PacketClass<any, any, PacketDirection>>(
    ctor: C,
    validator: PacketValidator<PayloadOf<C>>,
) {
    const meta = getPacketMetaByCtor(ctor);
    meta.validator = validator;
}

export function validatePacketPayload(meta: PacketCtx, payload: unknown) {
    if (!meta.validator) {
        return true;
    }

    return meta.validator(payload);
}

export interface InventorySnapshot {
    version: number;
    slots: Record<string, string | undefined>;
    items: Record<string, ItemInstance>;
}

export interface EquipItemRequest {
    slot: string;
    itemId: string;
}

export interface EquipItemResponse {
    ok: boolean;
    error?: string;
}

export interface HeartbeatPayload {
    timestamp: number;
}

const tEquipItemRequest = t.strictInterface({
    slot: t.string,
    itemId: t.string,
});

const tHeartbeatPayload = t.strictInterface({
    timestamp: t.number,
});

@Opcode(0x01, PacketDirection.ServerToClientEvent)
export class InventoryUpdatePacket extends Packet<InventorySnapshot> {}

@Opcode(0x02, PacketDirection.ClientToServerRequest, { validator: tEquipItemRequest })
export class EquipItemPacket extends Packet<EquipItemRequest, EquipItemResponse> {}

@Opcode(0x03, PacketDirection.ClientToServerEvent, { validator: tHeartbeatPayload })
export class HeartbeatPacket extends Packet<HeartbeatPayload> {}

@Opcode(0x04, PacketDirection.ServerToClientRequest, { validator: tHeartbeatPayload })
export class HeartbeatAckPacket extends Packet<HeartbeatPayload, HeartbeatPayload> {}
