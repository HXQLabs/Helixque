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
  onReport,
}: ControlBarProps) {
  const { micOn, camOn, screenShareOn } = mediaState;

  return (
<div className="absolute bottom-0 left-0 right-0">
  <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
    <div className="h-[6rem] min-h-[40px] w-full flex items-center whitespace-nowrap">
      
      {/* Left Spacer */}
      <div className="flex w-[120px] items-center justify-start ml-4"></div>

      {/* Center Control Panel */}
      <div className="flex flex-1 justify-center">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur sm:gap-2 sm:p-1.5">
          <Tooltip content="Recheck">
            <button
              onClick={onRecheck}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:h-11 sm:w-11"
            >
              <IconRefresh className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </Tooltip>

          <Tooltip content={micOn ? "Turn off microphone" : "Turn on microphone"}>
            <button
              onClick={onToggleMic}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${
                micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {micOn ? (
                <IconMicrophone className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <IconMicrophoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content={camOn ? "Turn off camera" : "Turn on camera"}>
            <button
              onClick={onToggleCam}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${
                camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {camOn ? (
                <IconVideo className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <IconVideoOff className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content={screenShareOn ? "Stop screen share" : "Start screen share"}>
            <button
              onClick={onToggleScreenShare}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${
                screenShareOn ? "bg-blue-600 hover:bg-blue-500" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {screenShareOn ? (
                <IconScreenShareOff className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <IconScreenShare className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Next match">
            <button
              onClick={onNext}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:h-11 sm:w-11"
            >
              <IconUserOff className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </Tooltip>

          <Tooltip content="Leave call">
            <button
              onClick={onLeave}
              className="ml-1 mr-1 flex h-10 items-center justify-center gap-2 rounded-full bg-red-600 px-4 hover:bg-red-500 sm:h-11 sm:px-6"
            >
              <IconPhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm font-medium">Leave</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right Control Panel */}
      <div className="flex w-[120px] items-center justify-end gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur sm:gap-2 sm:p-1.5 mr-4">
        <Tooltip content={showChat ? "Close chat" : "Open chat"}>
          <button
            onClick={onToggleChat}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${
              showChat ? "bg-indigo-600 hover:bg-indigo-500" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <IconMessage className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </Tooltip>

        <Tooltip content="Report user" align="end">
          <button
            onClick={onReport}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:h-11 sm:w-11"
          >
            <IconFlag className="h-3 w-4 sm:h-5 sm:w-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  </div>
</div>

  );
}
