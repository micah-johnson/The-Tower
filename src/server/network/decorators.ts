import { PacketClass, PacketDirection, PayloadOf, ResponseOf, expectPacketDirection } from "../../shared/network";
import { ServerNet } from "./index";

type MethodDecorator<T> = (_target: unknown, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void;

export function ServerEventHandler<C extends PacketClass<any, any>>(packet: C): MethodDecorator<
    (player: Player, payload: PayloadOf<C>) => void
> {
    const meta = expectPacketDirection(packet, PacketDirection.ClientToServerEvent);

    return (_target, _propertyKey, descriptor) => {
        if (!descriptor?.value) {
            error("@ServerEventHandler must decorate a function");
        }

        const original = descriptor.value as unknown as (self: unknown, player: Player, payload: PayloadOf<C>) => void;
        const bound = (player: Player, payload: PayloadOf<C>) => original(undefined, player, payload);

        ServerNet.onClientEvent(
            meta.ctor as PacketClass<any, any, typeof PacketDirection.ClientToServerEvent>,
            bound,
        );
    };
}

export function ServerRequestHandler<C extends PacketClass<any, any>>(packet: C): MethodDecorator<
    (player: Player, payload: PayloadOf<C>) => ResponseOf<C>
> {
    const meta = expectPacketDirection(packet, PacketDirection.ClientToServerRequest);

    return (_target, _propertyKey, descriptor) => {
        if (!descriptor?.value) {
            error("@ServerRequestHandler must decorate a function");
        }

        const original = descriptor.value as unknown as (self: unknown, player: Player, payload: PayloadOf<C>) => ResponseOf<C>;
        const bound = (player: Player, payload: PayloadOf<C>) => original(undefined, player, payload);

        ServerNet.setClientRequestHandler(
            meta.ctor as PacketClass<any, any, typeof PacketDirection.ClientToServerRequest>,
            bound,
        );
    };
}
