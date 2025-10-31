import http from "http";
import express from "express";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { Report } from "./models/Report";
import { configDotenv } from "dotenv";

import { UserManager } from "./managers/UserManger"; // corrected spelling
// import { pubClient, subClient } from "./cache/redis";
// import { presenceUp, presenceHeartbeat, presenceDown, countOnline } from "./cache/presence";
// import { createAdapter } from "@socket.io/redis-adapter";

import { wireChat /*, joinChatRoom */ } from "./chat/chat"; // keep wiring util

import type { HandshakeAuth, HandshakeQuery, ChatJoinPayload } from "./type";

const app = express();
const server = http.createServer(app);
configDotenv();

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

// Admin endpoint to view reports (for moderation)
app.get("/admin/reports", async (_req, res) => {
  try {
    if (mongoose.connection?.readyState === 1) {
      // Get reports from MongoDB
      const reports = await Report.find().sort({ ts: -1 }).limit(100);
      res.json({ 
        success: true, 
        count: reports.length, 
        reports: reports.map(r => ({
          id: r._id,
          reportId: r.reporterId + '-' + r.reportedId + '-' + r.ts,
          reporterId: r.reporterId,
          reportedId: r.reportedId,
          roomId: r.roomId,
          reason: r.reason,
          timestamp: new Date(r.ts).toISOString(),
          reporterMeta: r.reporterMeta,
          reportedMeta: r.reportedMeta
        }))
      });
    } else {
      // Get reports from in-memory storage
      const reports = (io as any)._reports || [];
      res.json({ 
        success: true, 
        count: reports.length, 
        reports: reports.slice(-100).reverse() // Get last 100, most recent first
      });
    }
  } catch (error: any) {
    console.error("[admin/reports] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const HEARTBEAT_MS = Number(process.env.SOCKET_HEARTBEAT_MS || 30_000);

// --- Connect MongoDB if configured ---
const MONGODB_URI = process.env.MONGODB_URI as string;
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("[mongo] connected"))
    .catch((e) => console.warn("[mongo] connection error", e?.message));
} else {
  console.warn("[mongo] MONGODB_URI not set. Reports will be stored in-memory only.");
}
const heartbeats = new Map<string, NodeJS.Timeout>();

io.on("connection", (socket: Socket) => {
  // console.log(`[io] connected ${socket.id}`);

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
  // Do not auto-join here; let chat.ts handle joining and announcements to avoid duplicates
  if (initialRoomId) {
    userManager.setRoom(socket.id, initialRoomId);
  }

  // Keep UserManager in sync when client explicitly joins later
  socket.on("chat:join", ({ roomId }: ChatJoinPayload) => {
    try {
      if (!roomId || typeof roomId !== "string") return;
      const namespaced = normalizeRoom(roomId.trim());
      // Keep UserManager in sync only; actual join + announcements are handled in chat.ts
      userManager.setRoom(socket.id, namespaced);
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
    // console.log(`[io] disconnected ${socket.id} (${reason})`);

    const hbRef = heartbeats.get(socket.id);
    if (hbRef) {
      clearInterval(hbRef);
      heartbeats.delete(socket.id);
    }

    // presenceDown(socket.id).catch((e) => console.warn("[presenceDown]", e?.message));

    // chat.ts handles leave announcements in its disconnecting handler

    userManager.removeUser(socket.id);
  });

  socket.on("error", (err) => console.warn(`[io] socket error ${socket.id}:`, err));

  // --- Report handler ---
  // Simple throttling: one report per reporter per 60s
  const REPORT_WINDOW_MS = 60_000;
  const lastReportAt = new Map<string, number>();

  socket.on("report", async (payload: { reporterId?: string; reportedId?: string | null; roomId?: string; reason?: string }) => {
    try {
      const reporterId = (payload?.reporterId || socket.id || "").toString();
      let reportedId = (payload?.reportedId || "").toString();
      const roomIdRaw = (payload?.roomId || "").toString();
      const reason = (payload?.reason || "").toString().slice(0, 500);

      // throttle
      const now = Date.now();
      const prev = lastReportAt.get(reporterId) || 0;
      if (now - prev < REPORT_WINDOW_MS) {
        socket.emit("report:error", { message: "Please wait before submitting another report." });
        return;
      }

      // basic presence validation
      if (!reporterId) {
        socket.emit("report:error", { message: "Missing reporterId." });
        return;
      }
      if (!userManager.isOnline(reporterId)) {
        socket.emit("report:error", { message: "Reporter is not online." });
        return;
      }

      // resolve reportedId: if omitted or looks like a room id equal to reporter's room, use partner
      const partner = userManager.getPartner(reporterId);
      if (!reportedId || reportedId === roomIdRaw) {
        reportedId = partner || "";
      }

      if (!reportedId) {
        socket.emit("report:error", { message: "Reported user not found." });
        return;
      }
      if (reportedId === reporterId) {
        socket.emit("report:error", { message: "Cannot report yourself." });
        return;
      }
      if (!userManager.isOnline(reportedId)) {
        socket.emit("report:error", { message: "Reported user is not online." });
        return;
      }

      // room validation: ensure both in same room and match provided roomId if any
      const reporterRoom = userManager.getRoom(reporterId);
      const reportedRoom = userManager.getRoom(reportedId);
      console.log("[report] Room validation:", { 
        reporterId, 
        reportedId, 
        reporterRoom, 
        reportedRoom, 
        roomIdRaw,
        reporterRoomType: typeof reporterRoom,
        roomIdRawType: typeof roomIdRaw
      });
      
      if (!reporterRoom || !reportedRoom || reporterRoom !== reportedRoom) {
        socket.emit("report:error", { message: "Users are not in the same room." });
        return;
      }
      // Only validate roomId if provided, not empty, and not null/undefined
      if (roomIdRaw && 
          roomIdRaw.trim() !== "" && 
          roomIdRaw !== "null" && 
          roomIdRaw !== "undefined") {
        
        // Handle room ID format: backend stores as "chat:1", frontend sends "1"
        const normalizedBackendRoom = reporterRoom?.replace('chat:', '') || '';
        const normalizedFrontendRoom = roomIdRaw.toString();
        
        if (normalizedBackendRoom !== normalizedFrontendRoom) {
          console.log("[report] Room mismatch details:", {
            reporterRoom: reporterRoom,
            roomIdRaw: roomIdRaw,
            normalizedBackendRoom: normalizedBackendRoom,
            normalizedFrontendRoom: normalizedFrontendRoom,
            strictEqual: reporterRoom === roomIdRaw,
            stringEqual: reporterRoom.toString() === roomIdRaw.toString(),
            normalizedEqual: normalizedBackendRoom === normalizedFrontendRoom
          });
          socket.emit("report:error", { message: "Room mismatch." });
          return;
        }
      }

  // Build report payload - use normalized room ID for storage
  const normalizedRoomId = reporterRoom?.replace('chat:', '') || reporterRoom;
  const reportRecord = {
        id: `${now}-${reporterId}-${reportedId}`,
        reporterId,
        reportedId,
        roomId: normalizedRoomId,
        reason,
        ts: now,
        reporterMeta: userManager.getMeta(reporterId) || {},
        reportedMeta: userManager.getMeta(reportedId) || {},
      };

  // Persist: MongoDB if available, else in-memory fallback
  if (mongoose.connection?.readyState === 1) {
    try {
      await Report.create({
        reporterId: reportRecord.reporterId,
        reportedId: reportRecord.reportedId,
        roomId: reportRecord.roomId,
        reason: reportRecord.reason,
        ts: reportRecord.ts,
        reporterMeta: reportRecord.reporterMeta,
        reportedMeta: reportRecord.reportedMeta,
      });
      console.log("[report] Successfully saved to database:", reportRecord);
      
      // Enhanced logging for moderation review
      console.log("[MODERATION] New report submitted:", {
        reportId: reportRecord.id,
        reporterId: reportRecord.reporterId,
        reportedId: reportRecord.reportedId,
        roomId: reportRecord.roomId,
        reason: reportRecord.reason,
        timestamp: new Date(reportRecord.ts).toISOString(),
        reporterIP: reportRecord.reporterMeta?.ip || 'unknown',
        reporterUA: reportRecord.reporterMeta?.ua || 'unknown',
        reportedIP: reportRecord.reportedMeta?.ip || 'unknown',
        reportedUA: reportRecord.reportedMeta?.ua || 'unknown'
      });
    } catch (e: any) {
      console.warn("[report] DB persist error", e?.message || e);
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore attach temp store to io for visibility
    (io as any)._reports = (io as any)._reports || [];
    (io as any)._reports.push(reportRecord);
    console.log("[report] Saved to in-memory storage:", reportRecord);
    
    // Enhanced logging for moderation review (in-memory fallback)
    console.log("[MODERATION] New report submitted (in-memory):", {
      reportId: reportRecord.id,
      reporterId: reportRecord.reporterId,
      reportedId: reportRecord.reportedId,
      roomId: reportRecord.roomId,
      reason: reportRecord.reason,
      timestamp: new Date(reportRecord.ts).toISOString(),
      reporterIP: reportRecord.reporterMeta?.ip || 'unknown',
      reporterUA: reportRecord.reporterMeta?.ua || 'unknown',
      reportedIP: reportRecord.reportedMeta?.ip || 'unknown',
      reportedUA: reportRecord.reportedMeta?.ua || 'unknown'
    });
  }

      lastReportAt.set(reporterId, now);

      socket.emit("report:ack", { ok: true, id: reportRecord.id, ts: now });
      console.log("[report]", reportRecord);
    } catch (err: any) {
      console.warn("[report] error", err?.message || err);
      socket.emit("report:error", { message: "Failed to submit report." });
    }
  });
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
