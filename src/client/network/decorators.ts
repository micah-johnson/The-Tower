import { PacketClass, PacketDirection, PayloadOf, ResponseOf, expectPacketDirection } from "../../shared/network";
import { ClientNet } from "./index";

type MethodDecorator<T> = (_target: unknown, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void;

export function ClientEventHandler<C extends PacketClass<any, any>>(packet: C): MethodDecorator<
    (payload: PayloadOf<C>) => void
> {
    const meta = expectPacketDirection(packet, PacketDirection.ServerToClientEvent);

    return (_target, _propertyKey, descriptor) => {
        if (!descriptor?.value) {
            error("@ClientEventHandler must decorate a function");
        }

        const original = descriptor.value as unknown as (self: unknown, payload: PayloadOf<C>) => void;
        const bound = (payload: PayloadOf<C>) => original(undefined, payload);

        ClientNet.onServerEvent(
            meta.ctor as PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>,
            bound,
        );
    };
}

export function ClientRequestHandler<C extends PacketClass<any, any>>(packet: C): MethodDecorator<
    (payload: PayloadOf<C>) => ResponseOf<C>
> {
    const meta = expectPacketDirection(packet, PacketDirection.ServerToClientRequest);

    return (_target, _propertyKey, descriptor) => {
        if (!descriptor?.value) {
            error("@ClientRequestHandler must decorate a function");
        }

        const original = descriptor.value as unknown as (self: unknown, payload: PayloadOf<C>) => ResponseOf<C>;
        const bound = (payload: PayloadOf<C>) => original(undefined, payload);

        ClientNet.setServerRequestHandler(
            meta.ctor as PacketClass<any, any, typeof PacketDirection.ServerToClientRequest>,
            bound,
        );
    };
}
