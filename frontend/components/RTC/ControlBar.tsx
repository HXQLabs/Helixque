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
import ThemeToggle from "../theme-toggle";

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
        {/* Bottom controls */}
        <div className="flex items-center gap-2 rounded-full border-soft bg-background/80 backdrop-blur px-2 py-1.5">
          <Tooltip content="Recheck">
            <button
              onClick={onRecheck}
              className="control-button h-11 w-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
            >
              <IconRefresh className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip content={micOn ? "Turn off microphone" : "Turn on microphone"}>
            <button
              onClick={onToggleMic}
              className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                micOn ? "bg-muted hover:bg-muted/80" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {micOn ? <IconMicrophone className="h-5 w-5" /> : <IconMicrophoneOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={camOn ? "Turn off camera" : "Turn on camera"}>
            <button
              onClick={onToggleCam}
              className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                camOn ? "bg-muted hover:bg-muted/80" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {camOn ? <IconVideo className="h-5 w-5" /> : <IconVideoOff className="h-5 w-5" />}
            </button>
          </Tooltip>

          <Tooltip content={screenShareOn ? "Stop screen share" : "Start screen share"}>
            <button
              onClick={onToggleScreenShare}
              className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                screenShareOn ? "bg-blue-600 hover:bg-blue-500" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {screenShareOn ? <IconScreenShareOff className="h-5 w-5" /> : <IconScreenShare className="h-5 w-5" />}
            </button>
          </Tooltip>

          <Tooltip content="Next match">
            <button
              onClick={onNext}
              className="control-button cursor-pointer h-11 w-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <IconUserOff className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip content="Leave call">
            <button
              onClick={onLeave}
              className="cursor-pointer ml-1 mr-1 h-11 rounded-full bg-red-600 px-6 hover:bg-red-500 flex items-center justify-center gap-2 transition-colors"
            >
              <IconPhoneOff className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">Leave</span>
            </button>
          </Tooltip>
        </div>

        {/* Right side controls */}
        <div className="absolute right-6">
          <div className="flex items-center gap-2 rounded-full border-soft bg-background/80 backdrop-blur px-2 py-1.5">
            <ThemeToggle />
            
            <Tooltip content={showChat ? "Close chat" : "Open chat"}>
              <button
                onClick={onToggleChat}
                className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                  showChat ? "bg-indigo-600 hover:bg-indigo-500" : "bg-muted hover:bg-muted/80"
                }`}
              >
                <IconMessage className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Report user">
              <button
                onClick={onReport}
                className="control-button cursor-pointer h-11 w-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
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