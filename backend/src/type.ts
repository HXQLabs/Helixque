import type { Socket } from "socket.io";

export interface User {
  socket: Socket;
  name: string;
  joinedAt?: number;
  meta?: {
    language?: string;
    industry?: string;
    skillBucket?: string;
    ip?: string | null;
    ua?: string | null;
    [key: string]: unknown;
  };
}

// Socket.IO handshake auth parameters
export interface HandshakeAuth {
  name?: string;
  roomId?: string;
}

// Socket.IO handshake query parameters
export interface HandshakeQuery {
  roomId?: string;
}

// Socket data structure for storing chat-related information
export interface SocketData {
  chatNames?: Record<string, string>;
}

// Chat event payload types
export interface ChatJoinPayload {
  roomId: string;
  name?: string;
}

export interface ChatMessagePayload {
  roomId: string;
  text: string;
  from: string;
  clientId: string;
  ts?: number;
}

export interface ChatTypingPayload {
  roomId: string;
  from: string;
  typing: boolean;
}

export interface ChatLeavePayload {
  roomId: string;
  name: string;
}

export interface ScreenStatePayload {
  roomId: string;
  on: boolean;
}

export interface ScreenshareOfferPayload {
  roomId: string;
  sdp: string;
}

export interface ScreenshareAnswerPayload {
  roomId: string;
  sdp: string;
}

export interface ScreenshareIceCandidatePayload {
  roomId: string;
  candidate: string;
}

export interface ScreenshareTrackStartPayload {
  roomId: string;
}

export interface ScreenshareTrackStopPayload {
  roomId: string;
}

export interface MediaStatePayload {
  roomId: string;
  state: {
    micOn?: boolean;
    camOn?: boolean;
  };
}

export interface MediaCamPayload {
  roomId: string;
  on: boolean;
}

export interface MediaMicPayload {
  roomId: string;
  on: boolean;
}

export interface StateUpdatePayload {
  roomId: string;
  micOn?: boolean;
  camOn?: boolean;
}

export interface RenegotiateOfferPayload {
  roomId: string;
  sdp: string;
  role: string;
}

export interface RenegotiateAnswerPayload {
  roomId: string;
  sdp: string;
  role: string;
}
