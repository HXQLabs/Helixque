// server/chat.ts
import type { Server, Socket } from "socket.io";

// In-memory tracker: room -> Set of userIds
const announcedUsers = new Map<string, Set<string>>();

/** Join the socket to the chat room and announce (dedup by userId) */
export function joinChatRoom(socket: Socket, roomId: string, name: string, userId?: string) {
  if (!roomId) return;
  const room = `chat:${roomId}`;
  socket.join(room);

  // Use socket.id as fallback unique ID if userId not provided
  const uid = userId ?? socket.id;

  // Initialize announced set for this room if missing
  if (!announcedUsers.has(room)) {
    announcedUsers.set(room, new Set());
  }
  const announced = announcedUsers.get(room)!;

  // Only announce if not already announced
  if (!announced.has(uid)) {
    announced.add(uid);
    socket.nsp.in(room).emit("chat:system", {
      text: `${name} joined the chat`,
      ts: Date.now(),
    });
  }

  // Store identifiers for later
  socket.data.name = name;
  socket.data.userId = uid;

  // Clean up on disconnect
  socket.on("disconnect", () => {
    announced.delete(uid);
    if (announced.size === 0) {
      announcedUsers.delete(room);
    }
  });
}

export function wireChat(io: Server, socket: Socket) {
  socket.on("chat:join", ({ roomId, name, userId }: { roomId: string; name: string; userId?: string }) => {
    joinChatRoom(socket, roomId, name, userId);
  });

  socket.on("chat:message", (payload: {
    roomId: string;
    text: string;
    from: string;
    clientId: string;
    ts?: number;
  }) => {
    const { roomId, text, from, clientId, ts } = payload || {};
    const safeText = (text ?? "").toString().trim().slice(0, 1000);
    if (!roomId || !safeText) return;

    socket.nsp.in(`chat:${roomId}`).emit("chat:message", {
      text: safeText,
      from,
      clientId,
      ts: ts ?? Date.now(),
    });
  });

  socket.on("chat:typing", ({ roomId, from, typing }: { roomId: string; from: string; typing: boolean }) => {
    if (!roomId) return;
    socket.to(`chat:${roomId}`).emit("chat:typing", { from, typing });
  });
}
