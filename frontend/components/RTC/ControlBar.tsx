"use client";

import {
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconPhoneOff,
  IconScreenShare,
  IconScreenShareOff,
  IconUserOff,
  IconRefresh,
  IconMessage,
  IconFlag,
} from "@tabler/icons-react";
import { MediaState } from "./VideoGrid";
import Tooltip from "../ui/tooltip";

interface ControlBarProps {
  mediaState: MediaState;
  showChat: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onRecheck: () => void;
  onNext: () => void;
  onLeave: () => void;
  onReport: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function ControlBar({
  mediaState,
  showChat,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleChat,
  onRecheck,
  onNext,
  onLeave,
  onReport
  , onStartRecording, onStopRecording
}: ControlBarProps) {
  const { micOn, camOn, screenShareOn } = mediaState;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 z-50">
      <div className="relative h-full flex items-center justify-center">
        {/* Bottom controls */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur">
          <Tooltip content="Recheck">
            <button
              onClick={onRecheck}
              className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <IconRefresh className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip content={micOn ? "Turn off microphone" : "Turn on microphone"}>
            <button
              onClick={onToggleMic}
              className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {micOn ? <IconMicrophone className="h-5 w-5" /> : <IconMicrophoneOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={camOn ? "Turn off camera" : "Turn on camera"}>
            <button
              onClick={onToggleCam}
              className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {camOn ? <IconVideo className="h-5 w-5" /> : <IconVideoOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={screenShareOn ? "Stop screen share" : "Start screen share"}>
            <button
              onClick={onToggleScreenShare}
              className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                screenShareOn ? "bg-blue-600 hover:bg-blue-500" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {screenShareOn ? <IconScreenShareOff className="h-5 w-5" /> : <IconScreenShare className="h-5 w-5" />}
            </button>
          </Tooltip>

          {/* Recording controls placeholder - callbacks implemented in Room */}
          <Tooltip content={`Start/Stop recording`}>
            <button
              onClick={() => {
                // toggle via provided callbacks if present
                if ((window as any).__helix_recording_on) {
                  onStopRecording?.();
                  (window as any).__helix_recording_on = false;
                } else {
                  onStartRecording?.();
                  (window as any).__helix_recording_on = true;
                }
              }}
              className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip content="Next match">
            <button
              onClick={onNext}
              className="cursor-pointer h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <IconUserOff className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip content="Leave call">
            <button
              onClick={onLeave}
              className="cursor-pointer ml-1 mr-1 h-11 rounded-full bg-red-600 px-6 hover:bg-red-500 flex items-center justify-center gap-2"
            >
              <IconPhoneOff className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">Leave</span>
            </button>
          </Tooltip>
        </div>

        {/* Right side controls */}
        <div className="absolute right-6">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur">
            <Tooltip content={showChat ? "Close chat" : "Open chat"}>
              <button
                onClick={onToggleChat}
                className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                  showChat ? "bg-indigo-600 hover:bg-indigo-500" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                <IconMessage className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Report user">
              <button
                onClick={onReport}
                className="cursor-pointer h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <IconFlag className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}