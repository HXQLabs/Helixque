// server/chat.ts
import type { Server, Socket } from "socket.io";

/** Join the socket to the chat room and announce */
export function joinChatRoom(socket: Socket, roomId: string, name: string) {
  if (!roomId) return;
  const room = `chat:${roomId}`;
  socket.join(room);
  socket.nsp.in(room).emit("chat:system", { text: `${name} joined the chat`, ts: Date.now() });
}

export function wireChat(io: Server, socket: Socket) {
  // Allows explicit joins (reconnects/late-joins)
  socket.on("chat:join", ({ roomId, name }: { roomId: string; name: string }) => {
    joinChatRoom(socket, roomId, name);
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

    socket.nsp.in(`chat:${roomId}`).emit("chat:message", {
      text: safeText,
      from,
      clientId,
      ts: ts ?? Date.now(),
    });
  });

  // Typing indicator to peers (not echoed to sender)
  socket.on("chat:typing", ({ roomId, from, typing }: { roomId: string; from: string; typing: boolean }) => {
    if (!roomId) return;
    socket.to(`chat:${roomId}`).emit("chat:typing", { from, typing });
  });

  // File sharing via chat (small files only). Frontend should enforce limits.
  socket.on("chat:file", (payload: {
    roomId: string;
    from: string;
    clientId: string;
    filename: string;
    dataUrl: string; // data:<mime>;base64,...
    ts?: number;
  }) => {
    const { roomId, filename, from, clientId, dataUrl, ts } = payload || {};
    if (!roomId || !dataUrl || !filename) return;
    // Broadcast file metadata + dataUrl to room
    socket.nsp.in(`chat:${roomId}`).emit("chat:file", {
      roomId,
      filename,
      from,
      clientId,
      dataUrl,
      ts: ts ?? Date.now(),
    });
  });
}
