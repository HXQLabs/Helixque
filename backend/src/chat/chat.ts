// server/chat.ts
import type { Server, Socket } from "socket.io";

// Track which users have been announced in each room
const announcedUsers = new Map<string, Set<string>>();

// Track socket IDs that have already joined to prevent duplicate joins
const joinedSockets = new Map<string, Set<string>>();

/**
 * Join the socket to the chat room and announce (dedup by userId)
 * Uses authenticated userId from socket handshake, not client payload
 */
export function joinChatRoom(socket: Socket, roomId: string, name: string) {
  if (!roomId) return;

  const room = `chat:${roomId}`;

  // SECURITY: Get userId from server-side auth, not client
  // Fallback to socket.id if no auth present
  const userId = socket.handshake.auth?.userId ?? socket.id;

  // Prevent same socket from joining multiple times
  if (!joinedSockets.has(room)) {
    joinedSockets.set(room, new Set());
  }
  const socketSet = joinedSockets.get(room)!;

  if (socketSet.has(socket.id)) {
    // This socket already joined this room, skip
    return;
  }
  socketSet.add(socket.id);

  socket.join(room);

  // Initialize announced set for this room if missing
  if (!announcedUsers.has(room)) {
    announcedUsers.set(room, new Set());
  }

  const announced = announcedUsers.get(room)!;

  // Only announce if this userId hasn't been announced yet
  if (!announced.has(userId)) {
    announced.add(userId);
    socket.nsp.in(room).emit("chat:system", {
      text: `${name} joined the chat`,
      ts: Date.now(),
    });
  }

  // Store identifiers for disconnect handling
  socket.data.name = name;
  socket.data.userId = userId;
  socket.data.roomId = roomId;

  // Register disconnect handler only once per socket
  if (!socket.data.disconnectHandlerRegistered) {
    socket.data.disconnectHandlerRegistered = true;

    socket.on("disconnect", () => {
      const userRoom = socket.data.roomId;
      const userName = socket.data.name;
      const uid = socket.data.userId;

      if (!userRoom) return;

      const room = `chat:${userRoom}`;
      const announced = announcedUsers.get(room);
      const socketSet = joinedSockets.get(room);

      // Remove this socket from joined set
      if (socketSet) {
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          joinedSockets.delete(room);
        }
      }

      if (!announced) return;

      // Check if this user has any other active sockets in the room
      const clients = socket.nsp.adapter.rooms.get(room);
      let hasOtherSockets = false;

      if (clients) {
        for (const clientId of clients) {
          const clientSocket = socket.nsp.sockets.get(clientId);
          if (clientSocket && clientSocket.data?.userId === uid && clientSocket.id !== socket.id) {
            hasOtherSockets = true;
            break;
          }
        }
      }

      // Only announce left if user has no other active sockets
      if (!hasOtherSockets && announced.has(uid)) {
        announced.delete(uid);
        socket.nsp.in(room).emit("chat:system", {
          text: `${userName} left the chat`,
          ts: Date.now(),
        });
      }

      // Clean up empty room tracker
      if (announced.size === 0) {
        announcedUsers.delete(room);
      }
    });
  }
}

export function wireChat(io: Server, socket: Socket) {
  // Explicit joins (reconnects/late-joins)
  // NOTE: We removed userId from client payload for security
  socket.on("chat:join", ({ roomId, name }: { roomId: string; name: string }) => {
    joinChatRoom(socket, roomId, name);
  });

  // Broadcast a message to everyone in the chat room
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

  // Typing indicator to peers (not echoed to sender)
  socket.on("chat:typing", ({ roomId, from, typing }: { roomId: string; from: string; typing: boolean }) => {
    if (!roomId) return;
    socket.to(`chat:${roomId}`).emit("chat:typing", { from, typing });
  });
}