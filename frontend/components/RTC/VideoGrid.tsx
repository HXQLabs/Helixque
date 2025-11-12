"use client";

import { 
  IconUser, 
  IconLoader2, 
  IconMicrophoneOff, 
  IconScreenShare 
} from "@tabler/icons-react";

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
  avatar?: string | null;
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
  avatar, 
}: VideoGridProps) {
  const { micOn, camOn, screenShareOn } = mediaState;
  const { peerMicOn, peerCamOn, peerScreenShareOn } = peerState;

  if (peerScreenShareOn || screenShareOn) {
    return (
      <div className="flex flex-col h-full gap-4">
        {/* Top: Two small videos side by side */}
        <div className="flex gap-4 justify-center">
         {/* My Video */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-64 aspect-video">
            {camOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : avatar ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black"> 
              <img
                src={avatar}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <IconUser className="h-8 w-8 text-white/70" />
              </div>
            )}
          </div>

          {/* Peer Video */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-64 aspect-video">
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
                <IconMicrophoneOff className="h-3 w-3 ml-1 inline" />
              )}
            </div>
          </div>
        </div>

        {/* Center: Large Screen Share */}
        <div className="flex-1 relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
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

  return (
    <div className={`grid gap-4 h-full transition-all duration-300 ${
      showChat 
        ? 'grid-cols-1 grid-rows-2 max-w-none' 
        : 'grid-cols-1 sm:grid-cols-2 grid-rows-1'
    }`}>
      {/* Remote/Peer Video */}
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${
        showChat ? 'aspect-[4/3] max-w-2xl mx-auto' : ''
      }`}>
        <div className={`relative w-full ${
          showChat ? 'h-full' : 'h-full min-h-0'
        }`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full ${
              peerScreenShareOn ? 'object-contain' : 
              showChat ? 'object-cover' : 'object-cover'
            }`}
          />

          {/* Lobby overlay */}
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
          
          {/* Remote label with indicators */}
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
        <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${showChat ? 'aspect-[4/3] max-w-2xl mx-auto' : ''}`}>
          <div className={`relative w-full ${showChat ? 'h-full' : 'h-full min-h-0'}`}>
            {camOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            ) : avatar ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img
                src={avatar}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <IconUser className="h-12 w-12 text-white/70" />
              </div>
            )}

          {/* Local label with indicators */}
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