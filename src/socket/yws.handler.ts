import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server as HttpServer } from "http";
import { Duplex } from "stream";

const messageSync = 0;
const messageAwareness = 1;

interface Room {
    doc: any;
    awareness: any;
    conns: Map<WebSocket, Set<number>>;
}

const rooms = new Map<string, Room>();

let Y: any;
let syncProtocol: any;
let awarenessProtocol: any;
let encoding: any;
let decoding: any;

async function loadDeps() {
    Y = await import("yjs");
    syncProtocol = await import("y-protocols/sync");
    awarenessProtocol = await import("y-protocols/awareness");
    encoding = await import("lib0/encoding");
    decoding = await import("lib0/decoding");
}

function getOrCreateRoom(roomName: string): Room {
    if (!rooms.has(roomName)) {
        const doc = new Y.Doc();
        const awareness = new awarenessProtocol.Awareness(doc);
        awareness.setLocalState(null);

        const room: Room = { doc, awareness, conns: new Map() };

        doc.on("update", (update: Uint8Array, origin: any) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const msg = encoding.toUint8Array(encoder);

            room.conns.forEach((_ids: Set<number>, conn: WebSocket) => {
                if (conn !== origin && conn.readyState === WebSocket.OPEN) {
                    try {
                        conn.send(msg);
                    } catch (e) {
                        /* ignore */
                    }
                }
            });
        });

        awareness.on(
            "update",
            ({ added, updated, removed }: any, origin: any) => {
                const changedClients = added.concat(updated, removed);
                if (changedClients.length === 0) return;

                if (origin !== null && room.conns.has(origin)) {
                    const controlledIds = room.conns.get(origin)!;
                    added.forEach((id: number) => controlledIds.add(id));
                    removed.forEach((id: number) => controlledIds.delete(id));
                }

                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageAwareness);
                encoding.writeVarUint8Array(
                    encoder,
                    awarenessProtocol.encodeAwarenessUpdate(
                        awareness,
                        changedClients,
                    ),
                );
                const msg = encoding.toUint8Array(encoder);

                room.conns.forEach((_ids: Set<number>, conn: WebSocket) => {
                    if (conn.readyState === WebSocket.OPEN) {
                        try {
                            conn.send(msg);
                        } catch (e) {
                            /* ignore */
                        }
                    }
                });
            },
        );

        rooms.set(roomName, room);
    }
    return rooms.get(roomName)!;
}

function handleConnection(conn: WebSocket, roomName: string) {
    const room = getOrCreateRoom(roomName);
    room.conns.set(conn, new Set());

    const encoder1 = encoding.createEncoder();
    encoding.writeVarUint(encoder1, messageSync);
    syncProtocol.writeSyncStep1(encoder1, room.doc);
    conn.send(encoding.toUint8Array(encoder1));

    const encoder2 = encoding.createEncoder();
    encoding.writeVarUint(encoder2, messageSync);
    syncProtocol.writeSyncStep2(encoder2, room.doc);
    conn.send(encoding.toUint8Array(encoder2));

    const states = room.awareness.getStates();
    if (states.size > 0) {
        const encoder3 = encoding.createEncoder();
        encoding.writeVarUint(encoder3, messageAwareness);
        encoding.writeVarUint8Array(
            encoder3,
            awarenessProtocol.encodeAwarenessUpdate(
                room.awareness,
                Array.from(states.keys()),
            ),
        );
        conn.send(encoding.toUint8Array(encoder3));
    }

    conn.on("message", (data: any) => {
        try {
            const message = new Uint8Array(data);
            const decoder = decoding.createDecoder(message);
            const msgType = decoding.readVarUint(decoder);

            switch (msgType) {
                case messageSync: {
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, messageSync);
                    syncProtocol.readSyncMessage(
                        decoder,
                        encoder,
                        room.doc,
                        conn,
                    );
                    if (encoding.length(encoder) > 1) {
                        conn.send(encoding.toUint8Array(encoder));
                    }
                    break;
                }
                case messageAwareness: {
                    awarenessProtocol.applyAwarenessUpdate(
                        room.awareness,
                        decoding.readVarUint8Array(decoder),
                        conn,
                    );
                    break;
                }
            }
        } catch (err: any) {
            console.error("[y-ws] 메시지 처리 오류:", err.message);
        }
    });

    conn.on("close", () => {
        const controlledIds = room.conns.get(conn);
        room.conns.delete(conn);

        if (controlledIds && controlledIds.size > 0) {
            awarenessProtocol.removeAwarenessStates(
                room.awareness,
                Array.from(controlledIds),
                null,
            );
        }

        if (room.conns.size === 0) {
            room.awareness.destroy();
            room.doc.destroy();
            rooms.delete(roomName);
            console.log(`[y-ws] 방 "${roomName}" 정리됨`);
        }
    });
}

export async function setupYWebSocket(httpServer: HttpServer) {
    await loadDeps();

    const wss = new WebSocketServer({ noServer: true });

    httpServer.on(
        "upgrade",
        (req: IncomingMessage, socket: Duplex, head: Buffer) => {
            if (req.url?.startsWith("/socket.io")) return;

            const roomName = (req.url || "/").slice(1) || "default";

            wss.handleUpgrade(req, socket, head, (ws) => {
                console.log(`[y-ws] 클라이언트 연결됨 (room: ${roomName})`);
                handleConnection(ws, roomName);
            });
        },
    );

    console.log("📝 y-websocket 동시 편집 서버 활성화");
}
