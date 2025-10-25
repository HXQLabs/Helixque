import { Server, Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { User } from "../type";

const QUEUE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class UserManager {
  private users: User[];
  private queue: string[];

  // track bans, partner links, online, and per-user room
  private bans: Map<string, Set<string>>;
  private partnerOf: Map<string, string>;
  private online: Set<string>;
  private roomOf: Map<string, string>; // chat/match room id per user

  private queueEntryTime: Map<string, number>;
  private timeoutIntervals: Map<string, NodeJS.Timeout>;

  private roomManager: RoomManager;
  private io: Server | null = null;

  constructor(io?: Server) {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();

    this.bans = new Map();
    this.partnerOf = new Map();
    this.online = new Set();
    this.roomOf = new Map();
    this.queueEntryTime = new Map();
    this.timeoutIntervals = new Map();
    
    if (io) {
      this.io = io;
    }
  }

  // Method to set the io instance after construction
  setIo(io: Server) {
    this.io = io;
  }

  // accepts optional meta; safe to call as addUser(name, socket)
  addUser(name: string, socket: Socket, meta?: Record<string, unknown>) {
    this.users.push({ name, socket, meta, joinedAt: Date.now() });
    this.online.add(socket.id);

    // join queue immediately (kept from your original flow)
    if (!this.queue.includes(socket.id)) {
      this.queue.push(socket.id);
      this.startQueueTimeout(socket.id);
    }

    socket.emit("lobby");
    this.clearQueue(); // preserve your behavior

    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    // remove from list
    this.users = this.users.filter((x) => x.socket.id !== socketId);

    // remove from queue (fix)
    this.queue = this.queue.filter((x) => x !== socketId);

    // clean presence
    this.online.delete(socketId);

    // clean timeout tracking
    this.clearQueueTimeout(socketId);

    // if they were in a room/paired, handle like leave
    this.handleLeave(socketId, "explicit-remove");
  }

  // ---------- PUBLIC HELPERS (used by index.ts / chat integration) ----------

  /** Record current chat/match room for this user. Pass undefined to clear. */
  setRoom(socketId: string, roomId?: string) {
    if (!roomId) this.roomOf.delete(socketId);
    else this.roomOf.set(socketId, roomId);
  }

  /** Get current room id (if any) for this user. */
  getRoom(socketId: string): string | undefined {
    return this.roomOf.get(socketId);
  }

  /** Get user's display name quickly. */
  getName(socketId: string): string | undefined {
    const u = this.users.find((x) => x.socket.id === socketId);
    return u?.name;
  }

  /** Return a shallow user object plus roomId (if set). */
  getUser(
    socketId: string
  ): (User & { roomId?: string }) | undefined {
    const u = this.users.find((x) => x.socket.id === socketId);
    if (!u) return undefined;
    const roomId = this.roomOf.get(socketId);
    return roomId ? { ...u, roomId } : u;
  }

  count() {
    return this.users.length;
  }

  private startQueueTimeout(socketId: string) {
    console.log(`[TIMEOUT] Starting timeout for socket: ${socketId}, timeout: ${QUEUE_TIMEOUT_MS}ms`);
    this.clearQueueTimeout(socketId);

    this.queueEntryTime.set(socketId, Date.now());

    const timeout = setTimeout(() => {
      this.handleQueueTimeout(socketId);
    }, QUEUE_TIMEOUT_MS);

    this.timeoutIntervals.set(socketId, timeout);
  }

  private clearQueueTimeout(socketId: string) {
    const timeout = this.timeoutIntervals.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutIntervals.delete(socketId);
    }
    this.queueEntryTime.delete(socketId);
  }

  private handleQueueTimeout(socketId: string) {
    console.log(`[TIMEOUT] Handling timeout for socket: ${socketId}`);
    const user = this.users.find(u => u.socket.id === socketId);
    if (!user || !this.online.has(socketId) || !this.queue.includes(socketId)) {
      console.log(`[TIMEOUT] User not found, offline, or not in queue:`, {
        user: !!user,
        online: this.online.has(socketId),
        inQueue: this.queue.includes(socketId)
      });
      return;
    }

    console.log(`[TIMEOUT] Emitting timeout event to user: ${socketId}`);
    try {
      user.socket.emit("queue:timeout", {
        message: "We couldn't find a match right now. Please try again later.",
        waitTime: Date.now() - (this.queueEntryTime.get(socketId) || Date.now())
      });
      console.log(`[TIMEOUT] Successfully emitted timeout event`);
    } catch (error) {
      console.error("Failed to emit queue:timeout:", error);
    }

    this.queue = this.queue.filter(id => id !== socketId);
    this.clearQueueTimeout(socketId);
  }

  // ---------- MATCHING / QUEUE (your logic kept intact) ----------

  clearQueue() {
    console.log("inside clear queues");
    console.log(this.queue.length);
    if (this.queue.length < 2) {
      return;
    }

    // find first valid pair not banned from each other and both online
    let id1: string | undefined;
    let id2: string | undefined;

    outer: for (let i = 0; i < this.queue.length; i++) {
      const a = this.queue[i];
      if (!this.online.has(a)) continue;

      const bansA = this.bans.get(a) || new Set<string>();

      for (let j = i + 1; j < this.queue.length; j++) {
        const b = this.queue[j];
        if (!this.online.has(b)) continue;

        const bansB = this.bans.get(b) || new Set<string>();
        if (bansA.has(b) || bansB.has(a)) continue; // never rematch

        id1 = a;
        id2 = b;
        break outer;
      }
    }

    if (!id1 || !id2) {
      return; // no valid pair right now
    }

    console.log("id is " + id1 + " " + id2);

    const user1 = this.users.find((x) => x.socket.id === id1);
    const user2 = this.users.find((x) => x.socket.id === id2);
    if (!user1 || !user2) return;

    console.log("creating roonm");

    // remove both from queue for pairing
    this.queue = this.queue.filter((x) => x !== id1 && x !== id2);

    // clear timeouts for matched users
    this.clearQueueTimeout(id1);
    this.clearQueueTimeout(id2);

    // create room and remember links
    const roomId = this.roomManager.createRoom(user1, user2);

    this.partnerOf.set(id1, id2);
    this.partnerOf.set(id2, id1);
    this.roomOf.set(id1, roomId);
    this.roomOf.set(id2, roomId);

    // keep matching others if possible
    this.clearQueue();
  }

  // Try to get this user matched immediately (used after requeue)
  private tryMatchFor(userId: string) {
    if (!this.online.has(userId)) return;
    if (!this.queue.includes(userId)) this.queue.push(userId);
    this.clearQueue();
  }

  // ---------- LEAVE / DISCONNECT / NEXT ----------

  // Unified leave handler. If a user leaves, partner is requeued + notified.
  private handleLeave(leaverId: string, reason: string = "leave") {
    const partnerId = this.partnerOf.get(leaverId);

    // always remove leaver from queue
    this.queue = this.queue.filter((x) => x !== leaverId);

    // clean leaver links
    const leaverRoomId = this.roomOf.get(leaverId);
    if (leaverRoomId) {
      this.roomManager.teardownUser(leaverRoomId, leaverId);
      this.roomOf.delete(leaverId);
    }
    this.partnerOf.delete(leaverId);

    if (partnerId) {
      // ban each other to prevent rematch
      const bansA = this.bans.get(leaverId) || new Set<string>();
      const bansB = this.bans.get(partnerId) || new Set<string>();
      bansA.add(partnerId);
      bansB.add(leaverId);
      this.bans.set(leaverId, bansA);
      this.bans.set(partnerId, bansB);

      // clean partner side of the room/pair
      const partnerRoomId = this.roomOf.get(partnerId);
      if (partnerRoomId) {
        this.roomManager.teardownUser(partnerRoomId, partnerId);
        this.roomOf.delete(partnerId);
      }
      this.partnerOf.delete(partnerId);

      // keep partner waiting: requeue + notify + try match now
      const partnerUser = this.users.find((u) => u.socket.id === partnerId);
      if (partnerUser && this.online.has(partnerId)) {
        partnerUser.socket.emit("partner:left", { reason });
        if (!this.queue.includes(partnerId)) this.queue.push(partnerId);
        this.tryMatchFor(partnerId);
      }
    }
  }

  private onNext(userId: string) {
    const partnerId = this.partnerOf.get(userId);
    if (!partnerId) {
      // user is not currently paired; just ensure they are queued
      if (!this.queue.includes(userId)) this.queue.push(userId);
      this.tryMatchFor(userId);
      return;
    }

    // Get room ID to send system message BEFORE teardown
    const roomId = this.roomOf.get(userId);
    
    // Send system message that peer left the chat BEFORE teardown to ensure users are still in the chat room
    if (roomId && this.io) {
      const chatRoom = `chat:${roomId}`;
      this.io.to(chatRoom).emit("chat:system", { 
        text: "Peer left the chat", 
        ts: Date.now() 
      });
    }
    
    // Ban both users from matching with each other again
    const bansU = this.bans.get(userId) || new Set<string>();
    const bansP = this.bans.get(partnerId) || new Set<string>();
    bansU.add(partnerId);
    bansP.add(userId);
    this.bans.set(userId, bansU);
    this.bans.set(partnerId, bansP);

    // Teardown room and clear mappings
    if (roomId) this.roomManager.teardownRoom(roomId);
    this.partnerOf.delete(userId);
    this.partnerOf.delete(partnerId);
    this.roomOf.delete(userId);
    this.roomOf.delete(partnerId);

    // Requeue caller immediately; notify partner their match ended
    if (!this.queue.includes(userId)) this.queue.push(userId);
    const partnerUser = this.users.find((u) => u.socket.id === partnerId);
    if (partnerUser && this.online.has(partnerId)) {
      partnerUser.socket.emit("partner:left", { reason: "next" });
      // Also requeue partner automatically
      if (!this.queue.includes(partnerId)) this.queue.push(partnerId);
    }

    // Try to rematch the caller right away
    this.tryMatchFor(userId);
  }

  // ---------- SOCKET HANDLERS ----------

  initHandlers(socket: Socket) {
    // WebRTC signaling passthrough
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
      this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
    });

    // user actions
    socket.on("queue:next", () => {
      this.onNext(socket.id);
    });

    socket.on("queue:leave", () => {
      // user wants to leave matching; remove from queue and clean links
      this.queue = this.queue.filter((x) => x !== socket.id);
      this.clearQueueTimeout(socket.id);
      this.handleLeave(socket.id, "leave-button");
    });

    socket.on("queue:retry", () => {
      if (!this.queue.includes(socket.id) && this.online.has(socket.id)) {
        this.queue.push(socket.id);
        this.startQueueTimeout(socket.id);
        socket.emit("queue:waiting");
        this.clearQueue();
      }
    });

    socket.on("disconnect", () => {
      // treat as a leave, but do not remove the partner; requeue them
      this.handleLeave(socket.id, "disconnect");
      this.online.delete(socket.id);
    });
  }
}
