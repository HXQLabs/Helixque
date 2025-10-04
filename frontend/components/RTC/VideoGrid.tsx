"use client";

import {
  IconUser,
  IconLoader2,
  IconMicrophoneOff,
  IconScreenShare,
} from "@tabler/icons-react";
import React from "react";

// Interfaces remain the same
interface MediaState {
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
}
interface PeerState {
  peerMicOn: boolean;
  peerCamOn: boolean;
  peerScreenShareOn: boolean;
}
interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  showChat: boolean;
  lobby: boolean;
  status: string;
  name: string;
  mediaState: MediaState;
  peerState: PeerState;
}

export default function VideoGrid({
  localVideoRef,
  remoteVideoRef,
  localScreenShareRef,
  remoteScreenShareRef,
  showChat,
  lobby,
  status,
  name,
  mediaState,
  peerState,
}: VideoGridProps) {
  const { camOn, screenShareOn } = mediaState;
  const { peerMicOn, peerCamOn, peerScreenShareOn } = peerState;

  // Screen Share Layout
  if (peerScreenShareOn || screenShareOn) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap justify-center gap-4">

          <div className="relative aspect-video w-40 overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg sm:w-52 md:w-64">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <IconUser className="h-8 w-8 text-white/70" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs">
              <span>{name || "You"}</span>
            </div>
          </div>

          <div className="relative aspect-video w-40 overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg sm:w-52 md:w-64">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!peerCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <IconUser className="h-8 w-8 text-white/70" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs">
              <span>Peer</span>
              {!peerMicOn && (
                <IconMicrophoneOff className="ml-1 inline h-3 w-3" />
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg">
          {screenShareOn && (
            <video
              ref={localScreenShareRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          {peerScreenShareOn && !screenShareOn && (
            <video
              ref={remoteScreenShareRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <IconScreenShare className="h-4 w-4" />
              {screenShareOn ? "Your Screen Share" : "Peer's Screen Share"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular Video Grid
  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2">
      {/* Remote/Peer Video */}
      <div className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
        <div className="relative h-full w-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full ${
              peerScreenShareOn ? "object-contain" : "object-cover"
            }`}
          />
          {lobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
              <IconLoader2 className="h-10 w-10 animate-spin text-white/70" />
              <span className="text-sm text-white/70">{status}</span>
            </div>
          )}
          {!peerCamOn && !lobby && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <IconUser className="h-12 w-12 text-white/70" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs">
            <span>{lobby ? "—" : "Peer"}</span>
            {!lobby && !peerMicOn && (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-red-600/80 px-1.5 py-0.5">
                <IconMicrophoneOff className="h-3 w-3" />
                <span>muted</span>
              </span>
            )}
            {peerScreenShareOn && (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-600/80 px-1.5 py-0.5">
                <IconScreenShare className="h-3 w-3" />
                <span>sharing</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Local/Your Video */}
      <div className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
        <div className="relative h-full w-full">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <IconUser className="h-12 w-12 text-white/70" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs">
            <span>{name || "You"}</span>
            {screenShareOn && (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-600/80 px-1.5 py-0.5">
                <IconScreenShare className="h-3 w-3" />
                <span>sharing</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { MediaState, PeerState };
