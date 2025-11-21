// server/chat.ts
import type { Server, Socket } from "socket.io";
import escapeHtml from "escape-html"; // npm install escape-html
// --- Simple in-memory per-room history ---
type HistItem = {
  text: string;
  from: string;
  clientId: string;
  ts: number;
  kind?: "user" | "system";
};

const MAX_HISTORY = 300;
const roomHistories = new Map<string, HistItem[]>();

function pushRoomHistory(room: string, item: HistItem) {
  const arr = roomHistories.get(room) || [];
  arr.push(item);
  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }
  roomHistories.set(room, arr);
}

import type {
  SocketData,
  ChatJoinPayload,
  ChatMessagePayload,
  ChatTypingPayload,
  ChatLeavePayload,
} from "../type";
export async function joinChatRoom(socket: Socket, roomId: string, name: string) {
  if (!roomId) return;
  const room = `chat:${roomId}`;

  // per-socket data bag
  const data = (socket.data as SocketData) || ((socket as Socket & { data: SocketData }).data = {});
  data.chatNames = data.chatNames || {};
  data.chatNames[room] = name;
  // guard against duplicate rapid joins
  (data as any).chatJoining = (data as any).chatJoining || {};
  (data as any).chatJoinedOnce = (data as any).chatJoinedOnce || {};
  if ((data as any).chatJoining[room]) return; // join in-flight, ignore
  (data as any).chatJoining[room] = true;

  try {
    const alreadyInRoom = socket.rooms.has(room);
    await socket.join(room);

    // only announce join once per socket per room
    if (!alreadyInRoom) {
      // broadcast a single generic join notice to the entire room (including self)
      const sys = { text: `peer joined the chat`, ts: Date.now() };
      socket.nsp.in(room).emit("chat:system", sys);
      // Do not store join events in history to avoid duplicating on fetch
    }
  } finally {
    (data as any).chatJoining[room] = false;
  }

  // After successful join, send recent history for this room (messages + leave events)
  const history = roomHistories.get(room) || [];
  socket.emit("chat:history", { roomId, messages: history });
}

export function wireChat(io: Server, socket: Socket) {
  // Allows explicit joins (reconnects/late-joins)
  socket.on("chat:join", async ({ roomId, name }: ChatJoinPayload) => {
    await joinChatRoom(socket, roomId, name || "A user");
  });

  // Broadcast a message to everyone in the chat room
  socket.on("chat:message", (payload: ChatMessagePayload) => {
    const { roomId, text, from, clientId, ts } = payload || {};
     
    if (!roomId || !text || !from) return;
    let safeText = text.toString().trim();
    safeText = safeText.slice(0, 1000);
    safeText = escapeHtml(safeText);

    const final = {
      text: safeText,
      from,
      clientId,
      ts: ts || Date.now(),
    };
    socket.nsp.in(`chat:${roomId}`).emit("chat:message", final);
    pushRoomHistory(`chat:${roomId}`, { ...final, kind: "user" });
  });

  // Typing indicator to peers (not echoed to sender)
  socket.on("chat:typing", ({ roomId, from, typing }: ChatTypingPayload) => {
    if (!roomId) return;
    socket.to(`chat:${roomId}`).emit("chat:typing", { from, typing });
  });

  // Explicit leave (e.g., navigating away or switching rooms)
  socket.on("chat:leave", ({ roomId, name }: ChatLeavePayload) => {
    if (!roomId) return;
    const room = `chat:${roomId}`;
    if (socket.rooms.has(room)) {
      // emit to room BEFORE leaving so the leaver also gets the message once
      const msg = { text: `peer left the chat`, ts: Date.now() };
      socket.nsp.in(room).emit("chat:system", msg);
      pushRoomHistory(room, { text: msg.text, from: "system", clientId: "system", ts: msg.ts!, kind: "system" });
      socket.leave(room);
    }
    const data = (socket.data as SocketData) || ((socket as Socket & { data: SocketData }).data = {});
    // mark this room as explicitly left to prevent duplicate leave on disconnecting
    (data as any).chatLeftRooms = (data as any).chatLeftRooms || {};
    (data as any).chatLeftRooms[room] = true;
    if (data.chatNames) delete data.chatNames[room];
  });

  // Announce leave on disconnect across all chat rooms this socket was part of
  socket.on("disconnecting", () => {
    const data = (socket.data as SocketData) || {};
    for (const room of socket.rooms) {
      if (typeof room === "string" && room.startsWith("chat:")) {
        const alreadyLeft = (data as any).chatLeftRooms?.[room];
        if (!alreadyLeft) {
          const sys = { text: `peer left the chat`, ts: Date.now() };
          socket.nsp.in(room).emit("chat:system", sys);
          pushRoomHistory(room, { text: sys.text, from: "system", clientId: "system", ts: sys.ts!, kind: "system" });
        }
      }
    }
  });
}
