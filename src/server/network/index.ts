import { Players, ReplicatedStorage } from "@rbxts/services";
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
const CLIENT_EVENT_REMOTE = "ClientEvent"; // Client -> Server RemoteEvent
const SERVER_EVENT_REMOTE = "ServerEvent"; // Server -> Client RemoteEvent
const CLIENT_REQUEST_REMOTE = "ClientRequest"; // Client -> Server RemoteFunction
const SERVER_REQUEST_REMOTE = "ServerRequest"; // Server -> Client RemoteFunction

type ClientEventHandler = (player: Player, payload: unknown) => void;
type ClientRequestHandler = (player: Player, payload: unknown) => unknown;

const clientEventHandlers = new Map<number, Set<ClientEventHandler>>();
const clientRequestHandlers = new Map<number, ClientRequestHandler>();

function ensureFolder(parent: Instance, name: string) {
    const existing = parent.FindFirstChild(name);
    if (existing) {
        return existing;
    }

    const folder = new Instance("Folder");
    folder.Name = name;
    folder.Parent = parent;
    return folder;
}

function ensureRoot() {
    return ensureFolder(ReplicatedStorage, ROOT_FOLDER);
}

function ensureEvent(name: string) {
    const folder = ensureRoot();
    let remote = folder.FindFirstChild(name) as RemoteEvent | undefined;
    if (!remote) {
        remote = new Instance("RemoteEvent");
        remote.Name = name;
        remote.Parent = folder;
    }
    return remote;
}

function ensureFunction(name: string) {
    const folder = ensureRoot();
    let remote = folder.FindFirstChild(name) as RemoteFunction | undefined;
    if (!remote) {
        remote = new Instance("RemoteFunction");
        remote.Name = name;
        remote.Parent = folder;
    }
    return remote;
}

const clientEventRemote = ensureEvent(CLIENT_EVENT_REMOTE);
const serverEventRemote = ensureEvent(SERVER_EVENT_REMOTE);
const clientRequestRemote = ensureFunction(CLIENT_REQUEST_REMOTE);
const serverRequestRemote = ensureFunction(SERVER_REQUEST_REMOTE);

clientEventRemote.OnServerEvent.Connect((player, opcode, payload) => {
    if (typeOf(opcode) !== "number") {
        warn(`[S] Received client event with non-numeric opcode ${tostring(opcode)}`);
        return;
    }

    const numericOpcode = opcode as number;
    const meta = getPacketMetaByOpcode(numericOpcode);
    if (!meta) {
        warn(`[S] Unknown client event opcode ${numericOpcode}`);
        return;
    }

    if (meta.direction !== PacketDirection.ClientToServerEvent) {
        warn(`[S] Opcode ${numericOpcode} (${packetName(meta.ctor)}) is not a client event`);
        return;
    }

    if (!validatePacketPayload(meta, payload)) {
        warn(`[S] Rejected client event payload for ${packetName(meta.ctor)} (opcode ${numericOpcode})`);
        return;
    }

    const handlers = clientEventHandlers.get(numericOpcode);
    if (!handlers) {
        warn(`[S] No handler registered for client event opcode ${numericOpcode}`);
        return;
    }

    for (const handler of handlers) {
        handler(player, payload);
    }
});

clientRequestRemote.OnServerInvoke = (player, opcode, payload) => {
    if (typeOf(opcode) !== "number") {
        error(`[S] Client request invoked with non-numeric opcode ${tostring(opcode)}`);
    }

    const numericOpcode = opcode as number;
    const meta = getPacketMetaByOpcode(numericOpcode);
    if (!meta || meta.direction !== PacketDirection.ClientToServerRequest) {
        error(`[S] No request metadata for opcode ${numericOpcode}`);
    }

    if (!validatePacketPayload(meta, payload)) {
        error(`[S] Client request payload failed validation for ${packetName(meta.ctor)} (opcode ${numericOpcode})`);
    }

    const handler = clientRequestHandlers.get(numericOpcode);
    if (!handler) {
        error(`No server handler registered for client request opcode ${numericOpcode}`);
    }

    return handler(player, payload);
};

export interface Disconnectable {
    Disconnect(): void;
}

export const ServerNet = {
    onClientEvent<C extends PacketClass<any, any, typeof PacketDirection.ClientToServerEvent>>(
        packet: C,
        handler: (player: Player, payload: PayloadOf<C>) => void,
    ): Disconnectable {
        const meta = expectPacketDirection(packet, PacketDirection.ClientToServerEvent);
        let handlers = clientEventHandlers.get(meta.opcode);
        if (!handlers) {
            handlers = new Set();
            clientEventHandlers.set(meta.opcode, handlers);
        }

        const callback: ClientEventHandler = (player, payload) => handler(player, payload as PayloadOf<C>);
        handlers.add(callback);

        return {
            Disconnect() {
                const list = clientEventHandlers.get(meta.opcode);
                if (!list) {
                    return;
                }

                list.delete(callback);

                if (list.size() === 0) {
                    clientEventHandlers.delete(meta.opcode);
                }
            },
        };
    },

    sendToClient<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>>(
        packet: C,
        player: Player,
        payload: PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientEvent);
        if (!validatePacketPayload(meta, payload)) {
        error(`[S] Attempted to send invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
        }
        serverEventRemote.FireClient(player, meta.opcode, payload);
    },

    broadcast<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>>(
        packet: C,
        payload: PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientEvent);
        if (!validatePacketPayload(meta, payload)) {
        error(`[S] Attempted to broadcast invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
        }
        serverEventRemote.FireAllClients(meta.opcode, payload);
    },

    broadcastEach<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientEvent>>(
        packet: C,
        payloadFactory: (player: Player) => PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientEvent);
        for (const player of Players.GetPlayers()) {
            const payload = payloadFactory(player);
            if (!validatePacketPayload(meta, payload)) {
                warn(`[S] Skipped broadcast to ${player.Name} due to invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
                continue;
            }
            serverEventRemote.FireClient(player, meta.opcode, payload);
        }
    },

    setClientRequestHandler<C extends PacketClass<any, any, typeof PacketDirection.ClientToServerRequest>>(
        packet: C,
        handler: (player: Player, payload: PayloadOf<C>) => ResponseOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ClientToServerRequest);
        if (clientRequestHandlers.has(meta.opcode)) {
            error(`Client request handler already registered for opcode ${meta.opcode} (${packetName(packet)})`);
        }

        clientRequestHandlers.set(meta.opcode, (player, payload) => handler(player, payload as PayloadOf<C>));
    },

    invokeClient<C extends PacketClass<any, any, typeof PacketDirection.ServerToClientRequest>>(
        packet: C,
        player: Player,
        payload: PayloadOf<C>,
    ) {
        const meta = expectPacketDirection(packet, PacketDirection.ServerToClientRequest);
        if (!validatePacketPayload(meta, payload)) {
        error(`[S] Attempted to invoke client with invalid payload for ${packetName(packet)} (opcode ${meta.opcode})`);
        }
        return serverRequestRemote.InvokeClient(player, meta.opcode, payload) as ResponseOf<C>;
    },
};
