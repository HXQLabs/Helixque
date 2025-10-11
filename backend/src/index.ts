import http from "http";
import express from "express";
import { Server, Socket } from "socket.io";

import { UserManager } from "./managers/UserManger"; // corrected spelling
// import { pubClient, subClient } from "./cache/redis";
// import { presenceUp, presenceHeartbeat, presenceDown, countOnline } from "./cache/presence";
// import { createAdapter } from "@socket.io/redis-adapter";

import { wireChat /*, joinChatRoom */ } from "./chat/chat"; // keep wiring util
import { checkHealth } from "./health";

import type { HandshakeAuth, HandshakeQuery, ChatJoinPayload } from "./type";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
// io.adapter(createAdapter(pubClient, subClient));

const userManager = new UserManager();

// Set the io instance for UserManager after creation
userManager.setIo(io);

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

app.get("/health", async (_req, res) => {
  const health = await checkHealth();
  if (!health.ok) {
    res.status(503).json(health);
    return;
  }
  res.json(health);
});

const HEARTBEAT_MS = Number(process.env.SOCKET_HEARTBEAT_MS || 30_000);
const heartbeats = new Map<string, NodeJS.Timeout>();

io.on("connection", (socket: Socket) => {
  console.log(`[io] connected ${socket.id}`);

  // Derive meta
  const meta = {
    name: (socket.handshake.auth as HandshakeAuth)?.name || "guest",
    ip: socket.handshake.address || null,
    ua: (socket.handshake.headers["user-agent"] as string) || null,
  };

  // Presence (disabled Redis for now)
  // presenceUp(socket.id, meta).catch((e) => console.warn("[presenceUp]", e?.message));

  const hb = setInterval(() => {
    // presenceHeartbeat(socket.id).catch((e) => console.warn("[presenceHeartbeat]", e?.message));
  }, HEARTBEAT_MS);
  heartbeats.set(socket.id, hb);

  // Track user
  userManager.addUser(meta.name, socket, meta);

  // Hook up chat listeners (chat:join, chat:message, chat:typing)
  wireChat(io, socket);

  // Auto-join a chat room if the client provided it (supports auth or query)
  // Normalize to using `chat:<roomId>` as the room namespace everywhere
  const roomFromAuth = (socket.handshake.auth as HandshakeAuth)?.roomId;
  const roomFromQuery = (socket.handshake.query as HandshakeQuery)?.roomId;
  const initialRoomRaw = (roomFromAuth || roomFromQuery || "").toString().trim();
  const normalizeRoom = (r: string) => (r ? `chat:${r}` : "");

  const initialRoomId = normalizeRoom(initialRoomRaw);

  if (initialRoomId) {
    userManager.setRoom(socket.id, initialRoomId);
    socket.join(initialRoomId); // join the chat namespaced room
  }

  // Keep UserManager in sync when client explicitly joins later
  socket.on("chat:join", ({ roomId }: ChatJoinPayload) => {
    try {
      if (!roomId || typeof roomId !== "string") return;
      const namespaced = normalizeRoom(roomId.trim());
      userManager.setRoom(socket.id, namespaced);
      socket.join(namespaced);
      // Optionally announce system join to the room:
      socket.nsp.in(namespaced).emit("chat:system", {
        text: `${meta.name} joined the chat`,
        ts: Date.now(),
      });
    } catch (err) {
      console.warn("[chat:join] error", err);
    }
  });

  // Screen share + media + renegotiation handlers (same behavior, use namespaced rooms)
  const toRoom = (roomId?: string) => (roomId ? `chat:${roomId}` : undefined);

  socket.on("screen:state", ({ roomId, on }: { roomId: string; on: boolean }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screen:state", { on, from: socket.id });
  });

  socket.on("screenshare:offer", ({ roomId, sdp }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screenshare:offer", { sdp, from: socket.id });
  });

  socket.on("screenshare:answer", ({ roomId, sdp }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screenshare:answer", { sdp, from: socket.id });
  });

  socket.on("screenshare:ice-candidate", ({ roomId, candidate }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screenshare:ice-candidate", { candidate, from: socket.id });
  });

  socket.on("screenshare:track-start", ({ roomId }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screenshare:track-start", { from: socket.id });
  });

  socket.on("screenshare:track-stop", ({ roomId }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("screenshare:track-stop", { from: socket.id });
  });

  // Media state
  socket.on("media:state", ({ roomId, state }: { roomId: string; state: { micOn?: boolean; camOn?: boolean } }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("peer:media-state", { state, from: socket.id });
  });

  socket.on("media:cam", ({ roomId, on }: { roomId: string; on: boolean }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("media:cam", { on, from: socket.id });
  });

  socket.on("media:mic", ({ roomId, on }: { roomId: string; on: boolean }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("media:mic", { on, from: socket.id });
  });

  // Backwards-compat aliases
  socket.on("state:update", ({ roomId, micOn, camOn }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("peer:state", { micOn, camOn, from: socket.id });
  });

  // Renegotiation passthrough
  socket.on("renegotiate-offer", ({ roomId, sdp, role }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("renegotiate-offer", { sdp, role, from: socket.id });
  });

  socket.on("renegotiate-answer", ({ roomId, sdp, role }) => {
    const r = toRoom(roomId);
    if (r) socket.to(r).emit("renegotiate-answer", { sdp, role, from: socket.id });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);

    const hbRef = heartbeats.get(socket.id);
    if (hbRef) {
      clearInterval(hbRef);
      heartbeats.delete(socket.id);
    }

    // presenceDown(socket.id).catch((e) => console.warn("[presenceDown]", e?.message));

    const u = userManager.getUser(socket.id);
    if (u?.roomId) {
      // announce left to the same namespaced room
      socket.nsp.in(u.roomId).emit("chat:system", {
        text: `${u.name} left the chat`,
        ts: Date.now(),
      });
    }

    userManager.removeUser(socket.id);
  });

  socket.on("error", (err) => console.warn(`[io] socket error ${socket.id}:`, err));
});

// --- Routes already defined above ---

// 404 handler (must be AFTER routes)
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).send("Routes Not Found");
});

// Global error handler (must be LAST)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Respect err.status and err.message if present
  const status = err?.status || 500;
  const message = err?.message || "Internal Server Error";

  console.error("Unhandled error:", err?.stack || err);
  res.status(status).json({ message });
});

// Graceful shutdown
const PORT = Number(process.env.PORT || 5001);
server.listen(PORT, () => console.log(`listening on *:${PORT}`));

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    // cleanup: clear all heartbeats
    heartbeats.forEach((hb) => clearInterval(hb));
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
