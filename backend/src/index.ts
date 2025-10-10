import http from "http";
import express from "express";
import { Server, Socket } from "socket.io";

import { UserManager } from "./managers/UserManger"; // keep your current path
// import { pubClient, subClient } from "./cache/redis";
// import { presenceUp, presenceHeartbeat, presenceDown, countOnline } from "./cache/presence";
// import { createAdapter } from "@socket.io/redis-adapter";

// ⬇️ NEW: import your chat wiring/util
import { wireChat, joinChatRoom } from "./chat/chat";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
// io.adapter(createAdapter(pubClient, subClient));

const userManager = new UserManager();

// Health endpoint
app.get("/healthz", async (_req, res) => {
  try {
    // const online = await countOnline().catch(() => -1);
    // res.json({ ok: true, online });
    res.json({ ok: true, online: -1 }); // fallback without Redis
  } catch {
    res.json({ ok: true, online: -1 });
  }
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

  // Presence (disabled Redis for now)
  // presenceUp(socket.id, meta).catch((e) => console.warn("[presenceUp]", e.message));
  const hb = setInterval(() => {
    // presenceHeartbeat(socket.id).catch((e) => console.warn("[presenceHeartbeat]", e.message));
  }, HEARTBEAT_MS);
  heartbeats.set(socket.id, hb);

  // Track user
  userManager.addUser(meta.name, socket, meta);

  // ⬇️ Hook up chat listeners (chat:join, chat:message, chat:typing)
  wireChat(io, socket);

  // ⬇️ Auto-join a chat room if the client provided it (no matchmaking).
  //    Supports either `io(..., { auth: { roomId }})` or `?roomId=...`
  const roomFromAuth = (socket.handshake.auth?.roomId as string) || "";
  const roomFromQuery = (socket.handshake.query?.roomId as string) || "";
  const initialRoomId = (roomFromAuth || roomFromQuery || "").toString().trim();

  if (initialRoomId) {
    // Do not auto-announce chat joins here; let the client emit chat:join after listeners are attached.
    userManager.setRoom(socket.id, initialRoomId);
    socket.join(initialRoomId); // non-chat room for media and control events
  }

  // ⬇️ Keep UserManager in sync when client explicitly joins later
  socket.on("chat:join", ({ roomId }: { roomId: string; name?: string }) => {
    if (roomId) userManager.setRoom(socket.id, roomId);
    if (roomId) socket.join(roomId);
  });

  // Screen share state and track management
  socket.on("screen:state", ({ roomId, on }) => {
    socket.to(roomId).emit("screen:state", { on });
  });
  

  // Screen share track renegotiation events
  socket.on("screenshare:offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:offer", { sdp, from: socket.id });
  });

  socket.on("screenshare:answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:answer", { sdp, from: socket.id });
  });

  socket.on("screenshare:ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("screenshare:ice-candidate", { candidate, from: socket.id });
  });

  // Screen share track start/stop notifications
  socket.on("screenshare:track-start", ({ roomId }) => {
    socket.to(roomId).emit("screenshare:track-start", { from: socket.id });
  });

  socket.on("screenshare:track-stop", ({ roomId }) => {
    socket.to(roomId).emit("screenshare:track-stop", { from: socket.id });
  });

  // --- Media state (aggregated) ---
  socket.on("media:state", ({ roomId, state }: { roomId: string; state: { micOn?: boolean; camOn?: boolean } }) => {
    socket.to(roomId).emit("peer:media-state", { state });
  });

  // Legacy single toggles (optional; still supported)
  socket.on("media:cam", ({ roomId, on }) => {
    socket.to(roomId).emit("media:cam", { on });
  });
  socket.on("media:mic", ({ roomId, on }) => {
    socket.to(roomId).emit("media:mic", { on });
  });

  // (Optional) Back-compat aliases if you ever used these names:
  socket.on("state:update", ({ roomId, micOn, camOn }) => {
    socket.to(roomId).emit("peer:state", { micOn, camOn });
  });

  // Renegotiation passthrough (your existing)
  socket.on("renegotiate-offer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-offer", { sdp, role });
  });

  socket.on("renegotiate-answer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-answer", { sdp, role });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);

    clearInterval(heartbeats.get(socket.id)!);
    heartbeats.delete(socket.id);

    // presence down (disabled Redis)
    // presenceDown(socket.id).catch((e) => console.warn("[presenceDown]", e.message));

  // Chat leave is announced within chat wiring via "disconnecting" handler

    userManager.removeUser(socket.id);
  });

  socket.on("error", (err) => console.warn(`[io] socket error ${socket.id}:`, err));
});

const PORT = Number(process.env.PORT || 5001);
server.listen(PORT, () => console.log(`listening on *:${PORT}`));
