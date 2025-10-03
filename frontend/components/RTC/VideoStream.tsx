import React from "react";
import { IconMicrophoneOff, IconUser } from "@tabler/icons-react";

interface VideoStreamProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  peerMicOn: boolean;
  peerCamOn: boolean;
  peerScreenShareOn: boolean;
  screenShareOn: boolean;
  camOn: boolean;
}

export default function VideoStream({
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  localScreenShareRef,
  remoteScreenShareRef,
  peerMicOn,
  peerCamOn,
  peerScreenShareOn,
  screenShareOn,
  camOn,
}: VideoStreamProps) {
  return (
    <div className="relative w-full h-full bg-black">
      {/* Main video area */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Remote video (main view) */}
        <div className="relative w-full h-full">
          {peerScreenShareOn ? (
            <video
              ref={remoteScreenShareRef}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
            />
          ) : (
            <>
              {peerCamOn ? (
                <video
                  ref={remoteVideoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <IconUser className="h-32 w-32 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400 text-lg">Camera is off</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Peer microphone indicator */}
          {!peerMicOn && (
            <div className="absolute top-4 left-4 bg-red-600 rounded-full p-2">
              <IconMicrophoneOff className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/20 bg-gray-800">
          {screenShareOn ? (
            <video
              ref={localScreenShareRef}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
              muted
            />
          ) : (
            <>
              {camOn ? (
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  autoPlay
                  muted
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <IconUser className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}