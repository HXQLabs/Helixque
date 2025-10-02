import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

const QUEUE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface User {
  socket: Socket;
  name: string;
  meta?: Record<string, unknown>;
  joinedAt?: number;
}

export interface MediaState {
  micOn: boolean;
  camOn: boolean;
}

export class UserManager {
  private users: User[];
  private queue: string[];

  private bans: Map<string, Set<string>>;
  private partnerOf: Map<string, string>;
  private online: Set<string>;
  private roomOf: Map<string, string>;

  private queueEntryTime: Map<string, number>;
  private timeoutIntervals: Map<string, NodeJS.Timeout>;
  private mediaState = new Map<string, MediaState>();

  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();

    this.bans = new Map();
    this.partnerOf = new Map();
    this.online = new Set();
    this.roomOf = new Map();
    this.queueEntryTime = new Map();
    this.timeoutIntervals = new Map();
  }

  addUser(name: string, socket: Socket, meta?: Record<string, unknown>) {
    this.users.push({ name, socket, meta, joinedAt: Date.now() });
    this.online.add(socket.id);
    this.mediaState.set(socket.id, { micOn: true, camOn: true });

    if (!this.queue.includes(socket.id)) {
      this.queue.push(socket.id);
      this.startQueueTimeout(socket.id);
    }

    socket.emit("lobby");
    this.clearQueue();

    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter((x) => x !== socketId);
    this.online.delete(socketId);
    this.clearQueueTimeout(socketId);
    this.handleLeave(socketId, "explicit-remove");
  }

  setRoom(socketId: string, roomId?: string) {
    if (!roomId) this.roomOf.delete(socketId);
    else this.roomOf.set(socketId, roomId);
  }

  getRoom(socketId: string): string | undefined {
    return this.roomOf.get(socketId);
  }

  getName(socketId: string): string | undefined {
    const u = this.users.find((x) => x.socket.id === socketId);
    return u?.name;
  }

  getUser(socketId: string): (User & { roomId?: string }) | undefined {
    const u = this.users.find((x) => x.socket.id === socketId);
    if (!u) return undefined;
    const roomId = this.roomOf.get(socketId);
    return roomId ? { ...u, roomId } : u;
  }

  count() {
    return this.users.length;
  }

  /** Send current peers' media states in a room to a specific socket */
  syncMediaStatesTo(targetSocket: Socket, roomId: string) {
    try {
      for (const [socketId, rId] of this.roomOf.entries()) {
        if (rId !== roomId) continue;
        if (socketId === targetSocket.id) continue;
        const state = this.mediaState.get(socketId);
        if (state) {
          targetSocket.emit("peer:media-state", { id: socketId, state });
        }
      }
    } catch (err) {
      console.warn("syncMediaStatesTo error:", err);
    }
  }

  handleMediaState(
    socket: Socket,
    roomId: string | undefined,
    state: Partial<MediaState>
  ) {
    const prev = this.mediaState.get(socket.id) || { micOn: true, camOn: true };
    const merged: MediaState = {
      micOn: state.micOn ?? prev.micOn,
      camOn: state.camOn ?? prev.camOn,
    };
    this.mediaState.set(socket.id, merged);
    if (roomId) {
      socket.to(roomId).emit("peer:media-state", { id: socket.id, state: merged });
    }
  }

  private startQueueTimeout(socketId: string) {
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
    const user = this.users.find(u => u.socket.id === socketId);
    if (!user || !this.online.has(socketId) || !this.queue.includes(socketId)) return;

    user.socket.emit("queue:timeout", {
      message: "We couldn't find a match right now. Please try again later.",
      waitTime: Date.now() - (this.queueEntryTime.get(socketId) || Date.now())
    });

    this.queue = this.queue.filter(id => id !== socketId);
    this.clearQueueTimeout(socketId);
  }

  clearQueue() {
    if (this.queue.length < 2) return;

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
        if (bansA.has(b) || bansB.has(a)) continue;
        id1 = a;
        id2 = b;
        break outer;
      }
    }

    if (!id1 || !id2) return;

    const user1 = this.users.find((x) => x.socket.id === id1);
    const user2 = this.users.find((x) => x.socket.id === id2);
    if (!user1 || !user2) return;

    this.queue = this.queue.filter((x) => x !== id1 && x !== id2);
    this.clearQueueTimeout(id1);
    this.clearQueueTimeout(id2);

    const roomId = this.roomManager.createRoom(user1, user2);
    this.partnerOf.set(id1, id2);
    this.partnerOf.set(id2, id1);
    this.roomOf.set(id1, roomId);
    this.roomOf.set(id2, roomId);

    const state1 = this.mediaState.get(id1);
    const state2 = this.mediaState.get(id2);
    if (state1) user2.socket.emit("peer:media-state", { id: id1, state: state1 });
    if (state2) user1.socket.emit("peer:media-state", { id: id2, state: state2 });

    this.clearQueue();
  }

  private tryMatchFor(userId: string) {
    if (!this.online.has(userId)) return;
    if (!this.queue.includes(userId)) this.queue.push(userId);
    this.clearQueue();
  }

  private handleLeave(leaverId: string, reason: string = "leave") {
    const partnerId = this.partnerOf.get(leaverId);
    this.queue = this.queue.filter((x) => x !== leaverId);

    const leaverRoomId = this.roomOf.get(leaverId);
    if (leaverRoomId) {
      this.roomManager.teardownUser(leaverRoomId, leaverId);
      this.roomOf.delete(leaverId);
    }
    this.partnerOf.delete(leaverId);

    if (partnerId) {
      const bansA = this.bans.get(leaverId) || new Set<string>();
      const bansB = this.bans.get(partnerId) || new Set<string>();
      bansA.add(partnerId);
      bansB.add(leaverId);
      this.bans.set(leaverId, bansA);
      this.bans.set(partnerId, bansB);

      const partnerRoomId = this.roomOf.get(partnerId);
      if (partnerRoomId) {
        this.roomManager.teardownUser(partnerRoomId, partnerId);
        this.roomOf.delete(partnerId);
      }
      this.partnerOf.delete(partnerId);

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
      if (!this.queue.includes(userId)) this.queue.push(userId);
      this.tryMatchFor(userId);
      return;
    }

    const bansU = this.bans.get(userId) || new Set<string>();
    const bansP = this.bans.get(partnerId) || new Set<string>();
    bansU.add(partnerId);
    bansP.add(userId);
    this.bans.set(userId, bansU);
    this.bans.set(partnerId, bansP);

    const roomIdU = this.roomOf.get(userId);
    if (roomIdU) this.roomManager.teardownRoom(roomIdU);

    this.partnerOf.delete(userId);
    this.partnerOf.delete(partnerId);
    this.roomOf.delete(userId);
    this.roomOf.delete(partnerId);

    if (!this.queue.includes(userId)) this.queue.push(userId);
    const partnerUser = this.users.find((u) => u.socket.id === partnerId);
    if (partnerUser && this.online.has(partnerId)) {
      partnerUser.socket.emit("partner:left", { reason: "next" });
      if (!this.queue.includes(partnerId)) this.queue.push(partnerId);
    }

    this.tryMatchFor(userId);
  }

  initHandlers(socket: Socket) {
    socket.on("media:state", (state: MediaState) => {
      const roomId = this.roomOf.get(socket.id);
      this.handleMediaState(socket, roomId, state);
    });

    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
      this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
    });

    socket.on("queue:next", () => this.onNext(socket.id));

    socket.on("queue:leave", () => {
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
      this.handleLeave(socket.id, "disconnect");
      this.online.delete(socket.id);
    });
  }
}
