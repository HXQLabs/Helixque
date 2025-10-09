// server/chat.ts
import type { Server, Socket, Namespace, RemoteSocket } from "socket.io";

type ChatHistoryItem = {
  text: string;
  from: string;
  clientId: string;
  ts: number;
  kind?: "user" | "system";
};

const MAX_HISTORY = 300;

function getData(socket: { data?: any }): any {
  return (socket.data as any) || ((socket as any).data = {});
}

function getRoomKey(roomId: string): string {
  return `chat:${roomId}`;
}

function pushHistory(socket: Socket | RemoteSocket<any, any> | { data?: any }, roomId: string, item: ChatHistoryItem) {
  const data = getData(socket);
  data.chatHistory = data.chatHistory || {};
  const room = getRoomKey(roomId);
  const arr: ChatHistoryItem[] = (data.chatHistory[room] = data.chatHistory[room] || []);
  arr.push(item);
  if (arr.length > MAX_HISTORY) {
    data.chatHistory[room] = arr.slice(-MAX_HISTORY);
  }
}

async function fanoutHistoryToRoom(io: Server | Namespace, roomId: string, item: ChatHistoryItem, opts?: { excludeId?: string }) {
  const room = getRoomKey(roomId);
  try {
    const sockets = await io.in(room).fetchSockets();
    for (const s of sockets) {
      if (opts?.excludeId && s.id === opts.excludeId) continue;
      pushHistory(s, roomId, item);
    }
  } catch {}
}

/** Join the socket to the chat room and announce */
export async function joinChatRoom(socket: Socket, roomId: string, name: string) {
  if (!roomId) return;
  const room = `chat:${roomId}`;
  const alreadyInRoom = socket.rooms.has(room);
  socket.join(room);

  // remember display name for this room (used for leave announcements)
  const data = getData(socket);
  data.chatNames = data.chatNames || {};
  data.chatNames[room] = name;

  // only announce join once per socket per room
  if (!alreadyInRoom) {
    // inform the joining socket about existing peers already in the room
    try {
      const peers = await socket.nsp.in(room).fetchSockets();
      for (const peer of peers) {
        if (peer.id === socket.id) continue; // skip self
        const peerName = (peer as any).data?.chatNames?.[room] ?? "A user";
        socket.emit("chat:system", { text: `${peerName} joined the chat`, ts: Date.now() });
      }
    } catch {}

    // show the join message to the joining user
    const joinMsg = { text: `${name} joined the chat`, ts: Date.now() };
    socket.emit("chat:system", joinMsg);

    // broadcast the join to everyone else in the room
    const forPeers = { text: `${name} joined the chat`, ts: Date.now() };
    socket.to(room).emit("chat:system", forPeers);
    await fanoutHistoryToRoom(
      socket.nsp,
      roomId,
      { text: forPeers.text, from: "system", clientId: "system", ts: forPeers.ts!, kind: "system" }
    );
  }

  // After successful join, send recent history for this room for this socket
  const history = (getData(socket).chatHistory || {})[room] || [];
  socket.emit("chat:history", { roomId, messages: history });
}

export function wireChat(io: Server, socket: Socket) {
  // Allows explicit joins (reconnects/late-joins)
  socket.on("chat:join", async ({ roomId, name }: { roomId: string; name: string }) => {
    await joinChatRoom(socket, roomId, name);
  });

  // Broadcast a message to everyone in the chat room
  socket.on("chat:message", (payload: {
    roomId: string;
    text: string;
    from: string;      // display name
    clientId: string;  // sender socket.id or app user id
    ts?: number;
  }) => {
    const { roomId, text, from, clientId, ts } = payload || {};
    const safeText = (text ?? "").toString().trim().slice(0, 1000);
    if (!roomId || !safeText) return;
    const final = {
      text: safeText,
      from,
      clientId,
      ts: ts ?? Date.now(),
    };

    socket.nsp.in(`chat:${roomId}`).emit("chat:message", final);
    fanoutHistoryToRoom(socket.nsp, roomId, { ...final, kind: "user" }, { excludeId: socket.id });
    pushHistory(socket, roomId, { ...final, kind: "user" });
  });

  // Typing indicator to peers (not echoed to sender)
  socket.on("chat:typing", ({ roomId, from, typing }: { roomId: string; from: string; typing: boolean }) => {
    if (!roomId) return;
    socket.to(`chat:${roomId}`).emit("chat:typing", { from, typing });
  });

  // Explicit leave (e.g., navigating away or switching rooms)
  socket.on("chat:leave", ({ roomId, name }: { roomId: string; name: string }) => {
    if (!roomId) return;
    const room = `chat:${roomId}`;
    if (socket.rooms.has(room)) {
      socket.leave(room);
      const leaveMsg = { text: `${name} left the chat`, ts: Date.now() };
      socket.nsp.in(room).emit("chat:system", leaveMsg);
      fanoutHistoryToRoom(socket.nsp, roomId, { text: leaveMsg.text, from: "system", clientId: "system", ts: leaveMsg.ts!, kind: "system" });
    }
    const data = getData(socket);
    if (data.chatNames) delete data.chatNames[room];
  });

  socket.on("chat:history:get", async ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    const room = getRoomKey(roomId);
    const history = (getData(socket).chatHistory || {})[room] || [];
    socket.emit("chat:history", { roomId, messages: history });
  });

  // Announce leave on disconnect across all chat rooms this socket was part of
  socket.on("disconnecting", () => {
    const data = getData(socket) || {};
    for (const room of socket.rooms) {
      if (typeof room === "string" && room.startsWith("chat:")) {
        const displayName = data.chatNames?.[room] ?? "A user";
        const sys = { text: `${displayName} left the chat`, ts: Date.now() };
        socket.nsp.in(room).emit("chat:system", sys);
        const rid = room.replace(/^chat:/, "");
        fanoutHistoryToRoom(socket.nsp, rid, { text: sys.text, from: "system", clientId: "system", ts: sys.ts!, kind: "system" }, { excludeId: socket.id });
      }
    }
  });
}
