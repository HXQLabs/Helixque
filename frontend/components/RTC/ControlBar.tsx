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
}: ControlBarProps) {
  const { micOn, camOn, screenShareOn } = mediaState;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 z-50">
      <div className="relative h-full flex items-center justify-center">
        {/* Mobile gesture hint overlay */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 hidden sm:block">
          <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur border border-white/20">
            💡 Tip: Swipe left/right for next • Swipe up/down for chat
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/10 bg-black/50 px-1.5 sm:px-2 py-1.5 backdrop-blur">
          <Tooltip content="Recheck">
            <button
              onClick={onRecheck}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center cursor-pointer transition-all duration-150 touch-manipulation"
            >
              <IconRefresh className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </Tooltip>

          <Tooltip content={micOn ? "Turn off microphone" : "Turn on microphone"}>
            <button
              onClick={onToggleMic}
              className={`cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all duration-150 touch-manipulation ${
                micOn ? "bg-white/10 hover:bg-white/20 active:bg-white/30" : "bg-red-600 hover:bg-red-500 active:bg-red-700"
              }`}
            >
              {micOn ? <IconMicrophone className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconMicrophoneOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={camOn ? "Turn off camera" : "Turn on camera"}>
            <button
              onClick={onToggleCam}
              className={`cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all duration-150 touch-manipulation ${
                camOn ? "bg-white/10 hover:bg-white/20 active:bg-white/30" : "bg-red-600 hover:bg-red-500 active:bg-red-700"
              }`}
            >
              {camOn ? <IconVideo className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconVideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={screenShareOn ? "Stop screen share" : "Start screen share"}>
            <button
              onClick={onToggleScreenShare}
              className={`cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all duration-150 touch-manipulation ${
                screenShareOn ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700" : "bg-white/10 hover:bg-white/20 active:bg-white/30"
              }`}
            >
              {screenShareOn ? <IconScreenShareOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <IconScreenShare className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </Tooltip>

          <Tooltip content="Next match (or swipe left/right)">
            <button
              onClick={onNext}
              className="cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-all duration-150 touch-manipulation"
            >
              <IconUserOff className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </Tooltip>

          <Tooltip content="Leave call">
            <button
              onClick={onLeave}
              className="cursor-pointer ml-1 mr-1 h-10 sm:h-11 rounded-full bg-red-600 px-4 sm:px-6 hover:bg-red-500 active:bg-red-700 flex items-center justify-center gap-2 transition-all duration-150 touch-manipulation"
            >
              <IconPhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm font-medium">Leave</span>
            </button>
          </Tooltip>
        </div>

        {/* Right side controls */}
        <div className="absolute right-2 sm:right-6">
          <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/10 bg-black/50 px-1.5 sm:px-2 py-1.5 backdrop-blur">
            <Tooltip content={showChat ? "Close chat (or swipe up/down)" : "Open chat (or swipe up/down)"}>
              <button
                onClick={onToggleChat}
                className={`cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all duration-150 touch-manipulation ${
                  showChat ? "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700" : "bg-white/10 hover:bg-white/20 active:bg-white/30"
                }`}
              >
                <IconMessage className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Report user">
              <button
                onClick={onReport}
                className="cursor-pointer h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-all duration-150 touch-manipulation"
              >
                <IconFlag className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}