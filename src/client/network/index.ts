import { ReplicatedStorage } from "@rbxts/services";
import {
    PacketDirection,
    PacketClass,
    PayloadOf,
    ResponseOf,
    expectPacketDirection,
    packetName,
    getPacketMetaByOpcode,
    validatePacketPayload,
} from "../../shared/network";

const ROOT_FOLDER = "Net";
const CLIENT_EVENT_REMOTE = "ClientEvent";
const SERVER_EVENT_REMOTE = "ServerEvent";
const CLIENT_REQUEST_REMOTE = "ClientRequest";
const SERVER_REQUEST_REMOTE = "ServerRequest";

type ServerEventHandler = (payload: unknown) => void;
type ServerRequestHandler = (payload: unknown) => unknown;

const serverEventHandlers = new Map<number, Set<ServerEventHandler>>();
const serverRequestHandlers = new Map<number, ServerRequestHandler>();

function waitForFolder(parent: Instance, name: string) {
    return parent.WaitForChild(name) as Folder;
}

function waitForRemoteEvent(name: string) {
    const root = waitForFolder(ReplicatedStorage, ROOT_FOLDER);
    return root.WaitForChild(name) as RemoteEvent;
}

function waitForRemoteFunction(name: string) {
    const root = waitForFolder(ReplicatedStorage, ROOT_FOLDER);
    return root.WaitForChild(name) as RemoteFunction;
}

const clientEventRemote = waitForRemoteEvent(CLIENT_EVENT_REMOTE);
const serverEventRemote = waitForRemoteEvent(SERVER_EVENT_REMOTE);
const clientRequestRemote = waitForRemoteFunction(CLIENT_REQUEST_REMOTE);
const serverRequestRemote = waitForRemoteFunction(SERVER_REQUEST_REMOTE);

serverEventRemote.OnClientEvent.Connect((opcode, payload) => {
    if (typeOf(opcode) !== "number") {
        warn(`[C] Received server event with non-numeric opcode ${tostring(opcode)}`);
        return;
    }

    const numericOpcode = opcode as number;
    const meta = getPacketMetaByOpcode(numericOpcode);
    if (!meta) {
        warn(`[C] Unknown server event opcode ${numericOpcode}`);
        return;
    }

    if (meta.direction !== PacketDirection.ServerToClientEvent) {
        warn(`[C] Opcode ${numericOpcode} (${packetName(meta.ctor)}) is not a server event`);
        return;
    }

    if (!validatePacketPayload(meta, payload)) {
        warn(`[C] Rejected server event payload for ${packetName(meta.ctor)} (opcode ${numericOpcode})`);
        return;
    }

    const handlers = serverEventHandlers.get(numericOpcode);
    if (!handlers) {
        warn(`[C] No handler registered for server event opcode ${numericOpcode}`);
        return;
    }

    for (const handler of handlers) {
        handler(payload);
    }
});

serverRequestRemote.OnClientInvoke = (opcode, payload) => {
    if (typeOf(opcode) !== "number") {
        error(`[C] Server request invoked with non-numeric opcode ${tostring(opcode)}`);
    }

    const numericOpcode = opcode as number;
    const meta = getPacketMetaByOpcode(numericOpcode);
    if (!meta || meta.direction !== PacketDirection.ServerToClientRequest) {
        error(`[C] No request metadata for opcode ${numericOpcode}`);
    }

    if (!validatePacketPayload(meta, payload)) {
        error(`[C] Server request payload failed validation for ${packetName(meta.ctor)} (opcode ${numericOpcode})`);
    }

    const handler = serverRequestHandlers.get(numericOpcode);
    if (!handler) {
        error(`No client handler registered for server request opcode ${numericOpcode}`);
    }

    return handler(payload);
};

export interface Disconnectable {
    Disconnect(): void;
}

export const ClientNet = {
    onServerEvent<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>>(
        packet: C,
        handler: (payload: PayloadOf<C>) => void,
    ): Disconnectable {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientEvent);
        let handlers = serverEventHandlers.get(meta.opcode);
        if (!handlers) {
            handlers = new Set();
            serverEventHandlers.set(meta.opcode, handlers);
        }

        const callback: ServerEventHandler = (payload) => handler(payload as PayloadOf<C>);
        handlers.add(callback);

        return {
            Disconnect() {
                const list = serverEventHandlers.get(meta.opcode);
                if (!list) {
                    return;
                }
                list.delete(callback);
                if (list.size() === 0) {
                    serverEventHandlers.delete(meta.opcode);
                }
            },
        };
    },

    emit<C extends PacketClass<any, any, typeof PacketDirection.ClientToServerEvent>>(
        packet: C,
        payload: PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ClientToServerEvent);
        if (!validatePacketPayload(meta, payload)) {
        error(`[C] Attempted to emit invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
        }
        clientEventRemote.FireServer(meta.opcode, payload);
    },

    requestServer<C extends PacketClass<any, any, typeof PacketDirection.ClientToServerRequest>>(
        packet: C,
        payload: PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ClientToServerRequest);
        if (!validatePacketPayload(meta, payload)) {
        error(`[C] Attempted to request server with invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
        }
        return clientRequestRemote.InvokeServer(meta.opcode, payload) as ResponseOf<C>;
    },

    setServerRequestHandler<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientRequest>>(
        packet: C,
        handler: (payload: PayloadOf<C>) => ResponseOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientRequest);
        if (serverRequestHandlers.has(meta.opcode)) {
            error(`Server request handler already registered for opcode ${meta.opcode} (${packetName(packet)})`);
        }

        serverRequestHandlers.set(meta.opcode, (payload) => handler(payload as PayloadOf<C>));
    },
};
