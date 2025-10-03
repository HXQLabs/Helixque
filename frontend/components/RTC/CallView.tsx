import React from "react";
import { Socket } from "socket.io-client";
import VideoStream from "./VideoStream";
import MediaControls from "./MediaControls";
import ChatPanel from "./Chat/chat";
import { MediaState, PeerMediaState, VideoRefs } from "./types/room";

interface CallViewProps extends MediaState, PeerMediaState, VideoRefs {
  showChat: boolean;
  socket: Socket | null;
  roomId: string | null;
  name: string;
  mySocketId: string | null;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onNext: () => void;
  onLeave: () => void;
  onReport?: () => void;
}

export default function CallView({
  micOn,
  camOn,
  screenShareOn,
  peerMicOn,
  peerCamOn,
  peerScreenShareOn,
  showChat,
  socket,
  roomId,
  name,
  mySocketId,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  localScreenShareRef,
  remoteScreenShareRef,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleChat,
  onNext,
  onLeave,
  onReport,
}: CallViewProps) {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Main video area */}
      <div className={`transition-all duration-300 ${showChat ? "mr-80" : ""}`}>
        <VideoStream
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteAudioRef={remoteAudioRef}
          localScreenShareRef={localScreenShareRef}
          remoteScreenShareRef={remoteScreenShareRef}
          peerMicOn={peerMicOn}
          peerCamOn={peerCamOn}
          peerScreenShareOn={peerScreenShareOn}
          screenShareOn={screenShareOn}
          camOn={camOn}
        />
      </div>

      {/* Media Controls */}
      <MediaControls
        micOn={micOn}
        camOn={camOn}
        screenShareOn={screenShareOn}
        showChat={showChat}
        onToggleMic={onToggleMic}
        onToggleCam={onToggleCam}
        onToggleScreenShare={onToggleScreenShare}
        onToggleChat={onToggleChat}
        onNext={onNext}
        onLeave={onLeave}
        onReport={onReport}
      />

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-30">
          <ChatPanel 
            socket={socket}
            roomId={roomId}
            name={name}
            mySocketId={mySocketId}
          />
        </div>
      )}
    </div>
  );
}