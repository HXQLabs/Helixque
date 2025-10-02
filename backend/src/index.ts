import http from "http";
import express from "express";
import { Server, Socket } from "socket.io";

import { wireChat, joinChatRoom } from "./chat/chat";
import { UserManager } from "./managers/UserManger";
// import { UserManager } from "./managers/UserManager"; // ✅ corrected import path

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const userManager = new UserManager();

// Health endpoint
app.get("/healthz", async (_req, res) => {
  res.json({ ok: true, online: -1 });
});

const HEARTBEAT_MS = Number(process.env.SOCKET_HEARTBEAT_MS || 30_000);
const heartbeats = new Map<string, ReturnType<typeof setInterval>>();

io.on("connection", (socket: Socket) => {
  console.log(`[io] connected ${socket.id}`);

  // Derive meta
  const meta = {
    name: (socket.handshake.auth?.name as string) || "guest",
    ip: (socket.handshake.address as string) || null,
    ua: (socket.handshake.headers["user-agent"] as string) || null,
  };

  // Presence heartbeat (disabled redis for now)
  const hb = setInterval(() => {}, HEARTBEAT_MS);
  heartbeats.set(socket.id, hb);

  // Add user
  userManager.addUser(meta.name, socket, meta);

  // Hook chat listeners
  wireChat(io, socket);

  // Auto-join room if provided
  const roomFromAuth = (socket.handshake.auth?.roomId as string) || "";
  const roomFromQuery = (socket.handshake.query?.roomId as string) || "";
  const initialRoomId = (roomFromAuth || roomFromQuery || "").toString().trim();

  if (initialRoomId) {
    joinChatRoom(socket, initialRoomId, meta.name);
    userManager.setRoom(socket.id, initialRoomId);
    socket.join(initialRoomId);

    // Sync media states of peers to this newcomer
    userManager.syncMediaStatesTo(socket, initialRoomId);
  }

  // Explicit chat join later
  socket.on("chat:join", ({ roomId }: { roomId: string; name?: string }) => {
    if (roomId) {
      userManager.setRoom(socket.id, roomId);
      socket.join(roomId);
      userManager.syncMediaStatesTo(socket, roomId);
    }
  });

  // Media state handling
  socket.on(
    "media:state",
    ({ roomId, state }: { roomId: string; state: { micOn?: boolean; camOn?: boolean } }) => {
      userManager.handleMediaState(socket, roomId, state);
    }
  );

  // Legacy media toggles
  socket.on("media:cam", ({ roomId, on }) => {
    userManager.handleMediaState(socket, roomId, { camOn: on });
  });
  socket.on("media:mic", ({ roomId, on }) => {
    userManager.handleMediaState(socket, roomId, { micOn: on });
  });

  // Screen share events
  socket.on("screen:state", ({ roomId, on }) => {
    socket.to(roomId).emit("screen:state", { on });
  });
  socket.on("screenshare:offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:offer", { sdp, from: socket.id });
  });
  socket.on("screenshare:answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:answer", { sdp, from: socket.id });
  });
  socket.on("screenshare:ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("screenshare:ice-candidate", { candidate, from: socket.id });
  });
  socket.on("screenshare:track-start", ({ roomId }) => {
    socket.to(roomId).emit("screenshare:track-start", { from: socket.id });
  });
  socket.on("screenshare:track-stop", ({ roomId }) => {
    socket.to(roomId).emit("screenshare:track-stop", { from: socket.id });
  });

  // Renegotiation passthrough
  socket.on("renegotiate-offer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-offer", { sdp, role });
  });
  socket.on("renegotiate-answer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-answer", { sdp, role });
  });

  // Disconnect cleanup
  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);
    clearInterval(heartbeats.get(socket.id)!);
    heartbeats.delete(socket.id);

    const u = userManager.getUser(socket.id);
    if (u?.roomId) {
      socket.nsp.in(`chat:${u.roomId}`).emit("chat:system", {
        text: `${u.name} left the chat`,
        ts: Date.now(),
      });
    }

    userManager.removeUser(socket.id);
  });

  socket.on("error", (err) => console.warn(`[io] socket error ${socket.id}:`, err));
});

const PORT = Number(process.env.PORT || 5001);
server.listen(PORT, () => console.log(`listening on *:${PORT}`));
