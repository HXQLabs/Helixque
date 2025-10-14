// server/chat.ts
import type { Server, Socket } from "socket.io";
import type {
  SocketData,
  ChatJoinPayload,
  ChatMessagePayload,
  ChatTypingPayload,
  ChatLeavePayload,
} from "../type";
import { extractLinkPreviewFromText } from "../utils/linkPreview";

export async function joinChatRoom(socket: Socket, roomId: string, name: string) {
  if (!roomId) return;
  const room = `chat:${roomId}`;
  const alreadyInRoom = socket.rooms.has(room);
  socket.join(room);

  // remember display name for this room (used for leave announcements)
  const data = (socket.data as SocketData) || ((socket as Socket & { data: SocketData }).data = {});
  data.chatNames = data.chatNames || {};
  data.chatNames[room] = name;

  // only announce join once per socket per room
  if (!alreadyInRoom) {
    // inform the joining socket about existing peers already in the room
    try {
      const peers = await socket.nsp.in(room).fetchSockets();
      for (const peer of peers) {
        if (peer.id === socket.id) continue; // skip self
        const peerName = (peer as any).data?.chatNames?.[room] || "A user"; // Changed from ?? to || for better compatibility
        socket.emit("chat:system", { text: `${peerName} joined the chat`, ts: Date.now() });
      }
    } catch {}

    // show the join message to the joining user
    socket.emit("chat:system", { text: `${name} joined the chat`, ts: Date.now() });

    // broadcast the join to everyone else in the room
    socket.to(room).emit("chat:system", { text: `${name} joined the chat`, ts: Date.now() });
  }
}

export function wireChat(io: Server, socket: Socket) {
  // Allows explicit joins (reconnects/late-joins)
  socket.on("chat:join", async ({ roomId, name }: ChatJoinPayload) => {
    await joinChatRoom(socket, roomId, name || "A user");
  });

  // Broadcast a message to everyone in the chat room
  socket.on("chat:message", async (payload: ChatMessagePayload) => {
    const { roomId, text, from, clientId, ts } = payload || {};
    const safeText = (text || "").toString().trim().slice(0, 1000); // Changed from ?? to || for better compatibility
    if (!roomId || !safeText) return;

    // Create the base message object
    const messagePayload = {
      text: safeText,
      from,
      clientId,
      ts: ts || Date.now(), // Changed from ?? to || for better compatibility
    };

    // Emit the message immediately
    socket.nsp.in(`chat:${roomId}`).emit("chat:message", messagePayload);

    // Extract link preview asynchronously and emit update if found
    try {
      const preview = await extractLinkPreviewFromText(safeText);
      if (preview) {
        // Emit an update with the link preview
        socket.nsp.in(`chat:${roomId}`).emit("chat:message:update", {
          clientId,
          ts: messagePayload.ts,
          linkPreview: preview
        });
      }
    } catch (err) {
      console.error('Link preview extraction failed:', err);
    }
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
      socket.leave(room);
      socket.nsp.in(room).emit("chat:system", { text: `${name} left the chat`, ts: Date.now() });
    }
    const data = (socket.data as SocketData) || ((socket as Socket & { data: SocketData }).data = {});
    if (data.chatNames) delete data.chatNames[room];
  });

  // Announce leave on disconnect across all chat rooms this socket was part of
  socket.on("disconnecting", () => {
    const data = (socket.data as SocketData) || {};
    for (const room of socket.rooms) {
      if (typeof room === "string" && room.startsWith("chat:")) {
        const displayName = data.chatNames?.[room] || "A user"; // Changed from ?? to || for better compatibility
        socket.nsp.in(room).emit("chat:system", { text: `${displayName} left the chat`, ts: Date.now() });
      }
    }
  });
}